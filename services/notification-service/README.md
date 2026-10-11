# Notification Service

The Node.js service bridges the durable `order-events` Redis Stream into the `order-notifications` BullMQ queue. It acknowledges a stream entry only after BullMQ accepts the job. BullMQ retries failed deliveries up to five times with exponential backoff, and completed jobs are retained for inspection for one day. A Redis key prevents duplicate mock email output when an outbox event is replayed.

Set `CONSUMER_NAME` to a stable unique value for each replica so pending stream entries can be recovered after restarts. `NOTIFICATION_CONCURRENCY` controls the number of queue jobs each worker processes concurrently. `/health` checks Redis and BullMQ availability.

Use a restricted Redis account and `rediss://` in production. Notification job data is stored in Redis while queued, so restrict Redis access and retention to trusted operators. The container runs as the unprivileged `node` user.

