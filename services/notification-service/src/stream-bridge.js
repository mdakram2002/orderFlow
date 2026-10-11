function parseFields(flatFields) {
  const fields = {};
  for (let index = 0; index + 1 < flatFields.length; index += 2) {
    fields[flatFields[index]] = flatFields[index + 1];
  }
  return fields;
}

function notificationJob(streamId, fields) {
  const eventKey = fields.event_key || streamId;
  if (!eventKey || eventKey.includes(":")) {
    throw new Error("Notification event key is missing or invalid");
  }
  return {
    eventKey,
    eventType: fields.event_type || "ORDER_EVENT",
    orderId: fields.order_id || "unknown",
    email: fields.email || "customer@example.com",
  };
}

async function ensureGroup(redis, streamName, consumerGroup) {
  try {
    await redis.xgroup("CREATE", streamName, consumerGroup, "0", "MKSTREAM");
  } catch (error) {
    if (!String(error.message).includes("BUSYGROUP")) throw error;
  }
}

async function enqueueStreamEvents({ redis, queue, streamName, consumerGroup, consumerName, isShuttingDown, log }) {
  await ensureGroup(redis, streamName, consumerGroup);
  while (!isShuttingDown()) {
    try {
      // Read this consumer's pending entries before receiving new stream entries.
      let batches = await redis.xreadgroup(
        "GROUP", consumerGroup, consumerName, "COUNT", 20, "STREAMS", streamName, "0",
      );
      if (!batches?.length || !batches[0][1].length) {
        batches = await redis.xreadgroup(
          "GROUP", consumerGroup, consumerName, "COUNT", 20, "BLOCK", 5000, "STREAMS", streamName, ">",
        );
      }

      for (const [, entries] of batches ?? []) {
        for (const [streamId, flatFields] of entries) {
          const job = notificationJob(streamId, parseFields(flatFields));
          await queue.add("send-notification", job, {
            jobId: job.eventKey,
            attempts: 5,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: { age: 86400, count: 10000 },
            removeOnFail: { age: 604800, count: 5000 },
          });
          // Acknowledge only after BullMQ has durably accepted the job.
          await redis.xack(streamName, consumerGroup, streamId);
        }
      }
    } catch (error) {
      if (!isShuttingDown()) {
        log("ERROR", "Stream enqueue failed; events will be retried", { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

module.exports = { enqueueStreamEvents };
