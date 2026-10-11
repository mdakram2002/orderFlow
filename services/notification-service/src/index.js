const http = require("node:http");
const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const {
  concurrency,
  port,
  redisUrl,
  streamName,
  consumerGroup,
  consumerName,
  queueName,
} = require("./config");
const { enqueueStreamEvents } = require("./stream-bridge");

const redisOptions = { maxRetriesPerRequest: null, enableReadyCheck: true };
const redis = new Redis(redisUrl, redisOptions);
const queueConnection = new Redis(redisUrl, redisOptions);
const workerConnection = new Redis(redisUrl, redisOptions);
const queue = new Queue(queueName, { connection: queueConnection });

let shuttingDown = false;
let bridgeTask;

function log(level, message, extra = {}) {
  console.log(JSON.stringify({ service: "notification-service", level, message, ...extra }));
}

for (const [clientName, client] of [
  ["stream", redis],
  ["queue", queueConnection],
  ["worker", workerConnection],
]) {
  client.on("error", (error) => log("ERROR", "Redis connection error", {
    client: clientName,
    error: error.message,
  }));
}

async function sendNotification(job) {
  const { eventKey, eventType, orderId, email } = job.data;
  if (!eventKey || !eventType || !orderId || !email) {
    throw new Error("Notification job is missing required fields");
  }

  const claimed = await redis.set(`notification:processed:${eventKey}`, "1", "EX", 604800, "NX");
  if (!claimed) return { duplicate: true };

  // Do not put recipient addresses or message contents into logs.
  log("INFO", "Notification sent", { eventType });
  return { sent: true };
}

const worker = new Worker(queueName, sendNotification, {
  connection: workerConnection,
  concurrency,
});
worker.on("completed", (job) => log("INFO", "Notification job completed", { jobId: job.id }));
worker.on("failed", (job, error) => log("ERROR", "Notification job failed", {
  jobId: job?.id,
  error: error.message,
}));
worker.on("error", (error) => log("ERROR", "BullMQ worker error", { error: error.message }));
queue.on("error", (error) => log("ERROR", "BullMQ queue error", { error: error.message }));

const server = http.createServer(async (request, response) => {
  if ((request.method !== "GET") || (request.url !== "/health" && request.url !== "/ready")) {
    response.writeHead(404).end();
    return;
  }
  try {
    await redis.ping();
    await queue.waitUntilReady();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "notification-service", status: "healthy", queue: queueName }));
  } catch {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "notification-service", status: "unhealthy" }));
  }
});

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  const serverClosed = new Promise((resolve) => server.close(resolve));
  // Let the blocking stream read finish, then stop workers after active jobs drain.
  await Promise.allSettled([bridgeTask, worker.close(), serverClosed]);
  await Promise.allSettled([
    queue.close(),
    redis.quit(),
    queueConnection.quit(),
    workerConnection.quit(),
  ]);
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

async function start() {
  await Promise.all([redis.ping(), queue.waitUntilReady()]);
  server.listen(port, "0.0.0.0", () => {
    log("INFO", "Notification worker started", { port, queue: queueName });
  });

  bridgeTask = enqueueStreamEvents({
    redis,
    queue,
    streamName,
    consumerGroup,
    consumerName,
    isShuttingDown: () => shuttingDown,
    log,
  }).catch((error) => {
    log("ERROR", "Stream bridge stopped unexpectedly", { error: error.message });
    process.exitCode = 1;
  });
}

start().catch((error) => {
  log("ERROR", "Startup failed", { error: error.message });
  process.exit(1);
});
