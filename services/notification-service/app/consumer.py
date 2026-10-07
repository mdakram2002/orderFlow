import logging
from redis.asyncio import Redis
from redis.exceptions import ResponseError

from app.config import settings
from app.notifier import send_mock_email

logger = logging.getLogger("notification-service")


def _has_events(batches) -> bool:
    return any(events for _, events in batches)


async def consume_events(redis: Redis) -> None:
    try:
        await redis.xgroup_create(settings.stream_name, settings.consumer_group, id="0", mkstream=True)
    except ResponseError as error:
        if "BUSYGROUP" not in str(error):
            raise

    consumer = settings.consumer_name
    while True:
        pending = await redis.xreadgroup(
            settings.consumer_group, consumer, {settings.stream_name: "0"}, count=20
        )
        has_pending = _has_events(pending)
        batches = pending if has_pending else await redis.xreadgroup(
            settings.consumer_group, consumer, {settings.stream_name: ">"}, count=20, block=5000
        )
        for _, events in batches:
            for event_id, fields in events:
                try:
                    await send_mock_email(event_id, fields, redis)
                    await redis.xack(settings.stream_name, settings.consumer_group, event_id)
                except Exception:
                    logger.exception("Unable to process order event %s", event_id)
