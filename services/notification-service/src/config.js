const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379/0";
const redisProtocol = new URL(redisUrl).protocol;
if (redisProtocol !== "redis:" && redisProtocol !== "rediss:") {
  throw new Error("REDIS_URL must use redis:// or rediss://");
}

function positiveInteger(name, fallback, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function requiredString(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value.trim()) throw new Error(`${name} must not be empty`);
  return value;
}

module.exports = {
  port: positiveInteger("PORT", 8005, 65535),
  concurrency: positiveInteger("NOTIFICATION_CONCURRENCY", 10, 1000),
  redisUrl,
  streamName: requiredString("STREAM_NAME", "order-events"),
  consumerGroup: requiredString("CONSUMER_GROUP", "notification-workers"),
  // Keep this stable across restarts so Redis can redeliver this consumer's pending entries.
  // Set a unique CONSUMER_NAME for each replica.
  consumerName: requiredString("CONSUMER_NAME", "notification-worker-1"),
  queueName: requiredString("NOTIFICATION_QUEUE_NAME", "order-notifications"),
};
