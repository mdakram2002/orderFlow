from enum import StrEnum


class OrderStatus(StrEnum):
    PENDING = "PENDING"
    INVENTORY_RESERVED = "INVENTORY_RESERVED"
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING"
    CONFIRMED = "CONFIRMED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    CANCELLED = "CANCELLED"


_TRANSITIONS = {
    OrderStatus.PENDING: {
        OrderStatus.INVENTORY_RESERVED,
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.CANCELLED,
    },
    OrderStatus.INVENTORY_RESERVED: {
        OrderStatus.PAYMENT_PROCESSING,
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_PROCESSING: {
        OrderStatus.CONFIRMED,
        OrderStatus.PAYMENT_FAILED,
    },
    OrderStatus.PAYMENT_FAILED: {OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: set(),
    OrderStatus.CANCELLED: set(),
}


def can_transition(current: str, target: str) -> bool:
    try:
        return OrderStatus(target) in _TRANSITIONS[OrderStatus(current)]
    except ValueError:
        return False

