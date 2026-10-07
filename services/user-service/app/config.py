from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://orderflow:orderflow_dev_only@localhost:5432/user_db"
    jwt_secret: str = ""
    jwt_expires_seconds: int = 3600
    admin_emails: str = ""
    port: int = 8001
    grpc_port: int = 50051

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
