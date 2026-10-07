# Order Service

The Order Service owns cart data (Redis) and order/history/outbox records (its own PostgreSQL database). It orchestrates user/product/payment gRPC calls with deadlines and transient retries. Stock reservations and mock payments are idempotent; if payment fails, stock is released and the order is cancelled. A PostgreSQL outbox makes event publication recoverable when Redis is unavailable; notifications consume `order-events` asynchronously.

Run `pytest tests`; the Docker image generates Python gRPC bindings from the root `proto/` contracts and applies Alembic migrations before startup.

