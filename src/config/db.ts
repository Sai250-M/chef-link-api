import { Pool, PoolConfig } from "pg";

/**
 * Database connection pool configuration
 * Environment variables must be loaded by index.ts before this module is imported
 */

const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  const errorMsg = `Database configuration error: Missing required environment variables: ${missingVars.join(", ")}`;
  console.error(`\n❌ ${errorMsg}\n`);
  throw new Error(errorMsg);
}

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on("error", (error: Error) => {
  console.error("Unexpected error on idle client:", error);
});

export default pool;