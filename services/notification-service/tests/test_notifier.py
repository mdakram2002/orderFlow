import sys
from pathlib import Path
import pytest
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.notifier import send_mock_email


@pytest.mark.asyncio
async def test_duplicate_event_is_not_sent_twice():
    redis = AsyncMock()
    redis.set.return_value = None
    await send_mock_email("event-1", {"order_id": "order-1"}, redis)
    redis.set.assert_awaited_once()
