import { Pool, PoolConfig } from "pg";

// Environment variables must be loaded by index.ts before this module is imported.
// Supports either DATABASE_URL (Render managed PostgreSQL) or individual DB_* vars.

let poolConfig: PoolConfig;

if (process.env.DATABASE_URL) {
  // Render provides DATABASE_URL for managed PostgreSQL. SSL is required for
  // external connections; rejectUnauthorized:false accepts Render's self-signed cert.
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL !== "false" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else {
  const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    const errorMsg = `Database configuration error: Missing required environment variables: ${missingVars.join(", ")}`;
    console.error(`\n❌ ${errorMsg}\n`);
    throw new Error(errorMsg);
  }

  poolConfig = {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    // Set DB_SSL=true to enable SSL for individual-var connections (e.g. external cloud DBs)
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on("error", (error: Error) => {
  console.error("Unexpected error on idle client:", error);
});

export default pool;