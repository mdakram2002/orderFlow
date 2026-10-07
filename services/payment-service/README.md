# Payment Service

Mock payment processor with gRPC `ProcessPayment`, PostgreSQL persistence, and unique idempotency and order constraints. `PAYMENT_MODE=success|failed` makes success and compensation paths testable. The service applies its versioned SQL migration before starting in Docker.

