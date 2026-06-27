// IMPORTANT: Load environment variables FIRST, before any other code
require("dotenv").config();

// Validate required environment variables before loading app
const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(
    `\n❌ FATAL ERROR: Missing required environment variables:\n` +
    missingEnvVars.map(v => `  - ${v}`).join("\n") +
    `\n\nPlease check your .env file.\n`
  );
  process.exit(1);
}

// Now safe to require app
const app = require("./src/app").default;

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⏹️  Shutting down gracefully...");
  process.exit(0);
});