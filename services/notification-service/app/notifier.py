import json
import logging
from typing import Any

from redis.asyncio import Redis

logger = logging.getLogger("notification-service")


async def send_mock_email(event_id: str, fields: dict[str, str], redis: Redis) -> None:
    event_key = fields.get("event_key", event_id)
    already_processed = await redis.set(f"notification:processed:{event_key}", "1", nx=True, ex=604800)
    if not already_processed:
        return
    recipient = fields.get("email", "customer@example.com")
    event_type = fields.get("event_type", "ORDER_EVENT")
    order_id = fields.get("order_id", "unknown")
    message = {
        "service": "notification-service",
        "level": "INFO",
        "message": "Notification sent",
        "recipient": recipient,
        "subject": f"Order {order_id}: {event_type}",
        "body": f"Order {order_id} status changed to {event_type}",
    }
    logger.info(json.dumps(message))
