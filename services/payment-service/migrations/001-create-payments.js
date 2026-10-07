const { Pool } = require("pg");

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgresql://orderflow:orderflow_dev_only@localhost:5432/payment_db",
  });
  try {
    await pool.query("BEGIN");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL UNIQUE,
        user_id VARCHAR(36) NOT NULL,
        amount BIGINT NOT NULL CHECK (amount >= 0),
        currency CHAR(3) NOT NULL,
        status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Payment schema migration failed", error);
  process.exit(1);
});

