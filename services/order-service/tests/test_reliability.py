import asyncio
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.reliability import CircuitBreaker, CircuitOpenError


@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_failure_threshold_and_recovers():
    breaker = CircuitBreaker(failure_threshold=2, reset_timeout=0)

    async def fail():
        raise RuntimeError("down")

    with pytest.raises(RuntimeError):
        await breaker.call(fail)
    with pytest.raises(RuntimeError):
        await breaker.call(fail)
    assert breaker.state == "HALF_OPEN"

    async def succeed():
        return "ok"

    assert await breaker.call(succeed) == "ok"
    assert breaker.state == "CLOSED"
