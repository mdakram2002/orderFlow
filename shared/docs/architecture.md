# Architecture decisions

- The gateway owns the public REST surface; services remain independently deployable.
- User, order, and payment data are isolated in separate PostgreSQL databases. The local Compose setup runs one PostgreSQL server for convenience, not one shared schema.
- Product documents are owned by Product Service in MongoDB. Redis is a disposable cache and coordination/event store, never the source of truth.
- Synchronous service calls use versioned Protocol Buffer contracts and bounded deadlines. The order workflow uses compensating actions instead of a distributed transaction.
- Redis Streams carry order lifecycle events to Notification Service. The consumer is designed to tolerate duplicate event delivery.

