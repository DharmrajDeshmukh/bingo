require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// ✅ CREATE HTTP SERVER
const server = http.createServer(app);

// ✅ SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🔥 MAKE GLOBAL (IMPORTANT)
global.io = io;

// 🔌 SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("joinRoom", ({ containerId }) => {
    if (!containerId) return;

    socket.join(containerId);

    console.log(`📦 User joined room: ${containerId}`);

    socket.emit("joinedRoom", { containerId });
  });

  socket.on("leaveRoom", ({ containerId }) => {
    socket.leave(containerId);
    console.log(`🚪 User left room: ${containerId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// 🚀 START SERVER
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});