# User Service

FastAPI service that owns user registration and login data in its own PostgreSQL database. Passwords are stored as salted PBKDF2-SHA256 hashes. It provides internal REST routes plus `UserService` gRPC methods (`GetUser`, `ValidateUser`).

Run tests with `pytest tests`. The container applies Alembic migrations before serving HTTP and gRPC.

