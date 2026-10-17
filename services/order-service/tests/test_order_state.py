import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.order_state import can_transition


def test_order_happy_path_transitions_are_allowed():
    assert can_transition("PENDING", "INVENTORY_RESERVED")
    assert can_transition("INVENTORY_RESERVED", "PAYMENT_PROCESSING")
    assert can_transition("PAYMENT_PROCESSING", "CONFIRMED")


def test_failed_payment_can_be_compensated_and_terminal_state_cannot_change():
    assert can_transition("PAYMENT_PROCESSING", "PAYMENT_FAILED")
    assert can_transition("PAYMENT_FAILED", "CANCELLED")
    assert not can_transition("CONFIRMED", "CANCELLED")
    assert not can_transition("CANCELLED", "CONFIRMED")


def test_uncertain_payment_keeps_order_open_until_authoritative_result():
    assert can_transition("PAYMENT_PROCESSING", "PAYMENT_OUTCOME_UNKNOWN")
    assert can_transition("PAYMENT_OUTCOME_UNKNOWN", "CONFIRMED")
    assert can_transition("PAYMENT_OUTCOME_UNKNOWN", "PAYMENT_FAILED")
    assert not can_transition("PAYMENT_OUTCOME_UNKNOWN", "CANCELLED")

