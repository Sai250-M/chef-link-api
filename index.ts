// IMPORTANT: Load environment variables FIRST, before any other code
require("dotenv").config();

// ── Database: accept DATABASE_URL (Render) or individual DB_* vars ────────────
const hasDatabase =
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME);

if (!hasDatabase) {
  console.error(
    `\n❌ FATAL ERROR: No database configuration found.\n` +
    `  On Render: set DATABASE_URL from your PostgreSQL service.\n` +
    `  Locally: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your .env file.\n`
  );
  process.exit(1);
}

// ── JWT secrets required for auth to work ─────────────────────────────────────
const missingSecrets = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"].filter(v => !process.env[v]);
if (missingSecrets.length > 0) {
  console.error(
    `\n❌ FATAL ERROR: Missing required environment variables:\n` +
    missingSecrets.map(v => `  - ${v}`).join("\n") +
    `\n\nPlease set these in your .env file or Render environment variables.\n`
  );
  process.exit(1);
}

// Now safe to require app
const app = require("./src/app").default;

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  if (process.env.DATABASE_URL) {
    console.log(`📊 Database: connected via DATABASE_URL\n`);
  } else {
    console.log(`📊 Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏹️  Shutting down gracefully...");
  process.exit(0);
});