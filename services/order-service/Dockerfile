FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY services/order-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/order-service/ .
COPY proto /app/proto
RUN python -m grpc_tools.protoc -I /app/proto --python_out=/app/app/generated --grpc_python_out=/app/app/generated /app/proto/user.proto /app/proto/product.proto /app/proto/payment.proto /app/proto/order.proto \
    && sed -i -e 's/^import user_pb2 as user__pb2/from app.generated import user_pb2 as user__pb2/' -e 's/^import product_pb2 as product__pb2/from app.generated import product_pb2 as product__pb2/' -e 's/^import payment_pb2 as payment__pb2/from app.generated import payment_pb2 as payment__pb2/' -e 's/^import order_pb2 as order__pb2/from app.generated import order_pb2 as order__pb2/' /app/app/generated/*_pb2_grpc.py
EXPOSE 8003 50053
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8003}"]

