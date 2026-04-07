require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const gameRoutes = require("./routes/game.routes");

const app = express();


// ✅ Connect DB
connectDB();


// ✅ Enable CORS
app.use(cors());


// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🔥 SAFE LOGGER
app.use((req, res, next) => {
  console.log(`\n➡️ ${req.method} ${req.url}`);
  console.log("📦 Body:", req.body);

  res.on("finish", () => {
    console.log(`⬅️ ${res.statusCode} Response`);
  });

  next();
});


// ✅ Health check
app.get("/", (req, res) => {
  res.send("API is running...");
});


// 🔐 Auth routes
app.use("/api/auth", authRoutes);


// 🎮 GAME ROUTES  🔥 (THIS WAS MISSING)
app.use("/api/game", gameRoutes);


// ❌ 404 handler (KEEP ALWAYS LAST)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});


// 🔥 GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});


module.exports = app;