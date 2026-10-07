import contextvars
import grpc

from app.config import settings
from app.generated import payment_pb2, payment_pb2_grpc, product_pb2, product_pb2_grpc
from app.generated import user_pb2, user_pb2_grpc
from app.reliability import CircuitBreaker, retry_transient


request_id_context: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


def request_metadata():
    request_id = request_id_context.get()
    return (("x-request-id", request_id),) if request_id else None


user_channel = grpc.aio.insecure_channel(settings.user_grpc_target)
product_channel = grpc.aio.insecure_channel(settings.product_grpc_target)
payment_channel = grpc.aio.insecure_channel(settings.payment_grpc_target)
user_stub = user_pb2_grpc.UserServiceStub(user_channel)
product_stub = product_pb2_grpc.ProductServiceStub(product_channel)
payment_stub = payment_pb2_grpc.PaymentServiceStub(payment_channel)

breakers = {
    "user": CircuitBreaker(),
    "product": CircuitBreaker(),
    "payment": CircuitBreaker(),
}


async def validate_user(user_id: str):
    return await breakers["user"].call(lambda: retry_transient(lambda: user_stub.ValidateUser(
        user_pb2.ValidateUserRequest(user_id=user_id), timeout=settings.grpc_timeout_seconds,
        metadata=request_metadata(),
    )))


async def get_user(user_id: str):
    return await breakers["user"].call(lambda: retry_transient(lambda: user_stub.GetUser(
        user_pb2.GetUserRequest(user_id=user_id), timeout=settings.grpc_timeout_seconds,
        metadata=request_metadata(),
    )))


async def get_product(product_id: str):
    return await breakers["product"].call(lambda: retry_transient(lambda: product_stub.GetProduct(
        product_pb2.GetProductRequest(product_id=product_id), timeout=settings.grpc_timeout_seconds,
        metadata=request_metadata(),
    )))


async def reserve_inventory(order_id: str, product_id: str, quantity: int):
    return await breakers["product"].call(lambda: retry_transient(lambda: product_stub.ReserveInventory(
        product_pb2.ReserveInventoryRequest(
            order_id=order_id, product_id=product_id, quantity=quantity
        ), timeout=settings.grpc_timeout_seconds, metadata=request_metadata(),
    )))


async def release_inventory(order_id: str, product_id: str, quantity: int):
    return await breakers["product"].call(lambda: retry_transient(lambda: product_stub.ReleaseInventory(
        product_pb2.ReleaseInventoryRequest(
            order_id=order_id, product_id=product_id, quantity=quantity
        ), timeout=settings.grpc_timeout_seconds, metadata=request_metadata(),
    )))


async def process_payment(order_id: str, user_id: str, amount_minor: int, currency: str, request_id: str):
    return await breakers["payment"].call(lambda: retry_transient(lambda: payment_stub.ProcessPayment(
        payment_pb2.ProcessPaymentRequest(
            order_id=order_id,
            user_id=user_id,
            amount_minor=amount_minor,
            currency=currency,
            idempotency_key=f"payment:{order_id}",
            request_id=request_id,
        ), timeout=settings.grpc_timeout_seconds, metadata=request_metadata()
    )))


async def close_channels():
    await user_channel.close()
    await product_channel.close()
    await payment_channel.close()
