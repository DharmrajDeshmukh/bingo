require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;


// ✅ CREATE HTTP SERVER (IMPORTANT)
const server = http.createServer(app);


// ✅ SETUP SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});


// 🔥 Make io global (so you can use in services)
global.io = io;


// 🔌 SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // ✅ Join room (container)
  socket.on("joinRoom", ({ containerId }) => {
    socket.join(containerId);
    console.log(`📦 User joined room: ${containerId}`);
  });

  // ❌ Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});


// 🚀 START SERVER
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});


// ❗ Handle server errors
server.on("error", (err) => {
  console.error("❌ SERVER ERROR:", err);
  process.exit(1);
});


// ❗ Handle crashes
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
  process.exit(1);
});