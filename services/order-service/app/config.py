from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://orderflow:orderflow_dev_only@localhost:5432/order_db"
    redis_url: str = "redis://localhost:6379/0"
    user_grpc_target: str = "localhost:50051"
    product_grpc_target: str = "localhost:50052"
    payment_grpc_target: str = "localhost:50054"
    grpc_timeout_seconds: float = 2.0
    port: int = 8003
    grpc_port: int = 50053
    reservation_ttl_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

