FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY services/user-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/user-service/ .
COPY proto/user.proto /app/proto/user.proto
RUN python -m grpc_tools.protoc -I /app/proto --python_out=/app/app/generated --grpc_python_out=/app/app/generated /app/proto/user.proto \
    && sed -i 's/^import user_pb2 as user__pb2/from app.generated import user_pb2 as user__pb2/' /app/app/generated/user_pb2_grpc.py
EXPOSE 8001 50051
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]

