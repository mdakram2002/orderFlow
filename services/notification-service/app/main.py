import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from redis.asyncio import Redis

from app.config import settings
from app.consumer import consume_events

logging.basicConfig(level=logging.INFO)
redis = Redis.from_url(settings.redis_url, decode_responses=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    consumer_task = asyncio.create_task(consume_events(redis))
    yield
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    await redis.aclose()


app = FastAPI(title="OrderFlow Notification Service", lifespan=lifespan)


@app.get("/health")
async def health():
    try:
        await redis.ping()
        return {"service": "notification-service", "status": "healthy", "redis": "healthy"}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Redis unavailable") from error


@app.get("/ready")
async def ready():
    try:
        await redis.ping()
        return {"service": "notification-service", "status": "ready"}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Redis unavailable") from error

