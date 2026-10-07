import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.consumer import _has_events


def test_empty_pending_stream_result_does_not_suppress_new_events():
    assert not _has_events([("order-events", [])])
    assert _has_events([("order-events", [("1-0", {"order_id": "order-1"})])])

