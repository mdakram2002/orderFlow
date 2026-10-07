import asyncio
import grpc

from app.config import settings
from app.database import SessionLocal
from app.generated import order_pb2, order_pb2_grpc
from app.models import Order


class OrderRpc(order_pb2_grpc.OrderServiceServicer):
    async def GetOrder(self, request, context):
        with SessionLocal() as db:
            order = db.get(Order, request.order_id)
            if order is None:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Order was not found")
            if request.user_id and order.user_id != request.user_id:
                await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not permitted to view order")
            return order_pb2.OrderResponse(
                order_id=order.id, status=order.status, total_minor=order.total_minor
            )


async def serve():
    server = grpc.aio.server()
    order_pb2_grpc.add_OrderServiceServicer_to_server(OrderRpc(), server)
    server.add_insecure_port(f"[::]:{settings.grpc_port}")
    await server.start()
    await server.wait_for_termination()

