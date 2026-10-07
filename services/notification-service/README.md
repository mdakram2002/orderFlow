# Notification Service

FastAPI worker consumes the `order-events` Redis Stream through a consumer group and logs mock email notifications. Duplicate event IDs are guarded with a Redis key and TTL. The stream consumer acknowledges successfully handled messages and leaves failed messages pending for later recovery.

