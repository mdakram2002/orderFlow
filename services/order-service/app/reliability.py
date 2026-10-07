import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

import grpc

T = TypeVar("T")


class CircuitOpenError(Exception):
    pass


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, reset_timeout: float = 10.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.opened_at: float | None = None
        self.half_open_probe = False

    @property
    def state(self) -> str:
        if self.opened_at is None:
            return "CLOSED"
        if time.monotonic() - self.opened_at >= self.reset_timeout:
            return "HALF_OPEN"
        return "OPEN"

    async def call(self, operation: Callable[[], Awaitable[T]]) -> T:
        if self.state == "OPEN":
            raise CircuitOpenError("Downstream circuit is open")
        if self.state == "HALF_OPEN":
            if self.half_open_probe:
                raise CircuitOpenError("Downstream circuit is testing recovery")
            self.half_open_probe = True
        try:
            result = await operation()
        except Exception:
            self.failures += 1
            if self.failures >= self.failure_threshold or self.state == "HALF_OPEN":
                self.opened_at = time.monotonic()
            self.half_open_probe = False
            raise
        self.failures = 0
        self.opened_at = None
        self.half_open_probe = False
        return result


async def retry_transient(operation: Callable[[], Awaitable[T]], attempts: int = 3) -> T:
    for attempt in range(attempts):
        try:
            return await operation()
        except grpc.aio.AioRpcError as error:
            if error.code() not in {
                grpc.StatusCode.UNAVAILABLE,
                grpc.StatusCode.DEADLINE_EXCEEDED,
                grpc.StatusCode.RESOURCE_EXHAUSTED,
            } or attempt == attempts - 1:
                raise
            await asyncio.sleep(0.1 * (2**attempt))
    raise RuntimeError("Retry loop exited unexpectedly")

