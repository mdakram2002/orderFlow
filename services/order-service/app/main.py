import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Generator

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import SessionLocal, engine
from app.grpc_clients import (
    close_channels, get_product, get_user, process_payment, release_inventory,
    reserve_inventory, request_id_context, validate_user,
)
from app.grpc_server import serve as serve_grpc
from app.models import Order, OrderItem, OrderOutbox, OrderStatusHistory
from app.order_state import can_transition
from app.schemas import CartInput, OrderInput

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("order-service")
redis = Redis.from_url(settings.redis_url, decode_responses=True)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as db:
        yield db


def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "status": order.status,
        "total_minor": order.total_minor,
        "currency": order.currency,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "name": item.product_name,
                "quantity": item.quantity,
                "unit_price_minor": item.unit_price_minor,
            }
            for item in order.items
        ],
    }


def save_status(
    db: Session, order: Order, state: str, event_type: str | None = None, email: str = ""
) -> None:
    if not can_transition(order.status, state):
        raise ValueError(f"Invalid order status transition: {order.status} -> {state}")
    order.status = state
    db.add(OrderStatusHistory(order_id=order.id, status=state))
    if event_type:
        db.add(OrderOutbox(
            id=str(uuid.uuid4()),
            event_type=event_type,
            order_id=order.id,
            user_id=order.user_id,
            email=email,
        ))
    db.commit()


async def publish_outbox() -> None:
    while True:
        try:
            with SessionLocal() as db:
                pending = db.scalars(
                    select(OrderOutbox).where(OrderOutbox.published_at.is_(None))
                    .order_by(OrderOutbox.created_at).limit(50)
                ).all()
                for event in pending:
                    await redis.xadd(
                        "order-events",
                        {
                            "event_key": event.id,
                            "event_type": event.event_type,
                            "order_id": event.order_id,
                            "user_id": event.user_id,
                            "email": event.email,
                        },
                    )
                    event.published_at = datetime.now(timezone.utc)
                if pending:
                    db.commit()
        except Exception:
            logger.exception("Outbox publish attempt failed; events remain available for retry")
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    publisher_task = asyncio.create_task(publish_outbox())
    grpc_task = asyncio.create_task(serve_grpc())
    yield
    for task in (publisher_task, grpc_task):
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    await redis.aclose()
    await close_channels()


app = FastAPI(title="OrderFlow Order Service", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    token = request_id_context.set(request_id)
    try:
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
    finally:
        request_id_context.reset(token)


@app.get("/health")
async def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        await redis.ping()
        return {"service": "order-service", "status": "healthy", "database": "healthy", "redis": "healthy"}
    except Exception as error:
        logger.error(json.dumps({"service": "order-service", "level": "ERROR", "message": "Health check failed", "error": str(error)}))
        raise HTTPException(status_code=503, detail="A required dependency is unavailable") from error


@app.get("/ready")
async def ready():
    return await health()


@app.put("/internal/cart")
async def set_cart(payload: CartInput, x_user_id: str = Header(...)):
    await redis.set(
        f"cart:{x_user_id}",
        json.dumps([item.model_dump() for item in payload.items]),
        ex=settings.reservation_ttl_seconds,
    )
    return {"items": [item.model_dump() for item in payload.items]}


@app.get("/internal/cart")
async def get_cart(x_user_id: str = Header(...)):
    raw = await redis.get(f"cart:{x_user_id}")
    return {"items": json.loads(raw) if raw else []}


@app.post("/internal/cart/items")
async def add_cart_item(payload: CartInput, x_user_id: str = Header(...)):
    current = await get_cart(x_user_id)
    quantities = {item["product_id"]: item["quantity"] for item in current["items"]}
    for item in payload.items:
        quantities[item.product_id] = min(100, quantities.get(item.product_id, 0) + item.quantity)
    items = [{"product_id": key, "quantity": value} for key, value in quantities.items()]
    await redis.set(f"cart:{x_user_id}", json.dumps(items), ex=settings.reservation_ttl_seconds)
    return {"items": items}


@app.delete("/internal/cart/items/{product_id}")
async def delete_cart_item(product_id: str, x_user_id: str = Header(...)):
    current = await get_cart(x_user_id)
    items = [item for item in current["items"] if item["product_id"] != product_id]
    await redis.set(f"cart:{x_user_id}", json.dumps(items), ex=settings.reservation_ttl_seconds)
    return {"items": items}


@app.post("/internal/orders", status_code=201)
async def create_order(
    payload: OrderInput,
    request: Request,
    x_user_id: str = Header(...),
    db: Session = Depends(get_db),
):
    try:
        user_valid = await validate_user(x_user_id)
        if not user_valid.valid:
            raise HTTPException(status_code=401, detail="User is not active")
        customer = await get_user(x_user_id)
        products = []
        for item in payload.items:
            product = await get_product(item.product_id)
            if not product.found or product.stock < item.quantity:
                raise HTTPException(status_code=409, detail=f"Insufficient inventory for {item.product_id}")
            products.append((item, product))
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Order pre-validation failed")
        raise HTTPException(status_code=503, detail="A downstream service is unavailable") from error

    if len({item.product_id for item, _ in products}) != len(products):
        raise HTTPException(status_code=400, detail="Duplicate product IDs are not allowed")
    currencies = {product.currency for _, product in products}
    if len(currencies) != 1:
        raise HTTPException(status_code=400, detail="All items must use the same currency")

    order_id = str(uuid.uuid4())
    order = Order(
        id=order_id,
        user_id=x_user_id,
        status="PENDING",
        total_minor=sum(product.price_minor * item.quantity for item, product in products),
        currency=next(iter(currencies)),
        items=[
            OrderItem(
                product_id=product.product_id,
                product_name=product.name,
                quantity=item.quantity,
                unit_price_minor=product.price_minor,
            )
            for item, product in products
        ],
        history=[OrderStatusHistory(status="PENDING")],
    )
    db.add(order)
    db.flush()
    db.add(OrderOutbox(
        id=str(uuid.uuid4()), event_type="ORDER_CREATED", order_id=order_id,
        user_id=x_user_id, email=customer.email,
    ))
    db.commit()
    reserved: list[tuple[str, int]] = []
    try:
        for item, _ in products:
            response = await reserve_inventory(order_id, item.product_id, item.quantity)
            if not response.reserved:
                raise RuntimeError(f"Inventory reservation rejected: {response.reason}")
            reserved.append((item.product_id, item.quantity))
        save_status(db, order, "INVENTORY_RESERVED")
        save_status(db, order, "PAYMENT_PROCESSING")
        payment = await process_payment(
            order_id, x_user_id, order.total_minor, order.currency, request.state.request_id
        )
        if payment.status != "SUCCESS":
            save_status(db, order, "PAYMENT_FAILED", "PAYMENT_FAILED", customer.email)
            raise RuntimeError("Payment was declined")
        save_status(db, order, "CONFIRMED", "ORDER_CONFIRMED", customer.email)
        await redis.delete(f"cart:{x_user_id}")
        return serialize_order(order)
    except Exception as error:
        compensation_failed = False
        for product_id, quantity in reversed(reserved):
            try:
                released = await release_inventory(order_id, product_id, quantity)
                if not released.released:
                    raise RuntimeError(f"Inventory release rejected for product {product_id}")
            except Exception:
                compensation_failed = True
                logger.exception("Inventory compensation failed for order %s product %s", order_id, product_id)
        if compensation_failed:
            save_status(db, order, "PAYMENT_FAILED", "PAYMENT_FAILED", customer.email)
        else:
            save_status(db, order, "CANCELLED", "ORDER_CANCELLED", customer.email)
        logger.error(json.dumps({
            "service": "order-service",
            "level": "ERROR",
            "requestId": request.state.request_id,
            "message": "Order saga compensation incomplete" if compensation_failed else "Order saga compensated",
            "orderId": order_id,
            "error": str(error),
        }))
        if compensation_failed:
            raise HTTPException(
                status_code=503,
                detail="Order failed and inventory release needs to be retried",
            ) from error
        if isinstance(error, HTTPException):
            raise error
        raise HTTPException(status_code=402, detail="Order could not be completed; inventory was released") from error


@app.get("/internal/orders")
def list_orders(
    x_user_id: str = Header(...),
    x_user_role: str = Header(default="CUSTOMER"),
    db: Session = Depends(get_db),
):
    statement = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    if x_user_role != "ADMIN":
        statement = statement.where(Order.user_id == x_user_id)
    return [serialize_order(order) for order in db.scalars(statement).unique().all()]


@app.get("/internal/orders/{order_id}")
def get_order(
    order_id: str,
    x_user_id: str = Header(...),
    x_user_role: str = Header(default="CUSTOMER"),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order was not found")
    if x_user_role != "ADMIN" and order.user_id != x_user_id:
        raise HTTPException(status_code=403, detail="Not permitted to view this order")
    return serialize_order(order)


@app.post("/internal/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    x_user_id: str = Header(...),
    x_user_role: str = Header(default="CUSTOMER"),
    db: Session = Depends(get_db),
):
    order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order was not found")
    if x_user_role != "ADMIN" and order.user_id != x_user_id:
        raise HTTPException(status_code=403, detail="Not permitted to cancel this order")
    if order.status not in {"PENDING", "INVENTORY_RESERVED", "PAYMENT_FAILED"}:
        raise HTTPException(status_code=409, detail="Order can no longer be cancelled")
    for item in order.items:
        result = await release_inventory(order.id, item.product_id, item.quantity)
        if not result.released:
            raise HTTPException(status_code=503, detail="Inventory release is still pending")
    user = await get_user(order.user_id)
    save_status(db, order, "CANCELLED", "ORDER_CANCELLED", user.email)
    return serialize_order(order)
