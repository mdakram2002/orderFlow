import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        values = {}
        env_file = Path(".env")
        if env_file.is_file():
            for line in env_file.read_text().splitlines():
                key, separator, value = line.partition("=")
                if separator and key.strip() and not key.lstrip().startswith("#"):
                    values[key.strip()] = value.strip().strip("'\"")

        self.redis_url = os.getenv("REDIS_URL", values.get("REDIS_URL", "redis://localhost:6379/0"))
        self.port = int(os.getenv("PORT", values.get("PORT", "8005")))
        self.stream_name = os.getenv("STREAM_NAME", values.get("STREAM_NAME", "order-events"))
        self.consumer_group = os.getenv(
            "CONSUMER_GROUP", values.get("CONSUMER_GROUP", "notification-workers")
        )
        self.consumer_name = os.getenv(
            "CONSUMER_NAME", values.get("CONSUMER_NAME", "notification-worker-1")
        )


settings = Settings()
