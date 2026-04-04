require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// 🚀 Start server (IMPORTANT: bind to 0.0.0.0 for mobile access)
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});


// ❗ Handle server errors (port busy, etc.)
server.on("error", (err) => {
  console.error("❌ SERVER ERROR:", err);
  process.exit(1);
});


// ❗ Handle unexpected crashes
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
  process.exit(1);
});