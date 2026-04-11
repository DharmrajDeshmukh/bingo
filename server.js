require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

// ✅ STEP 1: IMPORT APP FIRST
const app = require("./src/app");

// ✅ STEP 2: CREATE GLOBAL SOCKET MAP
const socketMap = new Map();

// ✅ STEP 3: ATTACH TO EXPRESS (NOW SAFE)
app.set("socketMap", socketMap);

// ✅ STEP 4: CREATE HTTP SERVER
const server = http.createServer(app);

// ✅ STEP 5: SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


const gameContainer = require("./src/utils/gameContainer");

// ✅ STEP 6: ATTACH IO TO EXPRESS
app.set("io", io);

// ================= SOCKET LOGIC ================= //

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // 🔥 REGISTER USER
 socket.on("register", (userId) => {
  if (!userId) {
    console.log("⚠️ No userId provided");
    return;
  }

  socketMap.set(userId, socket);

  // 🔥 HANDLE RECONNECT
  gameContainer.handleReconnect(userId);

  console.log(`✅ User registered: ${userId}`);
  console.log(`📊 Active users: ${socketMap.size}`);
});

  // ✅ JOIN ROOM
socket.on("joinRoom", ({ containerId }) => {
  if (!containerId) {
    console.log("⚠️ No containerId");
    return;
  }

  socket.join(containerId);

  console.log(`📦 Joined room: ${containerId}`);

  socket.emit("joinedRoom", { containerId });

  // ================= 🔥 FIX START =================

  const gameMatrix = require("./src/utils/gameMatrix");
  const gameContainer = require("./src/utils/gameContainer");

  const matrices = gameMatrix.getContainerMatrices(containerId);
  const container = gameContainer.getContainer(containerId);

  console.log("🔍 Checking game state...");
  console.log("Matrices exist:", !!matrices);
  console.log("Container exist:", !!container);

  if (
    matrices &&
    container &&
    container.submittedUsers.size === container.users.length
  ) {
    const formatted = {};

    matrices.forEach((m, uid) => {
      formatted[uid] = m;
    });

    const turnOrder = gameContainer.generateTurnOrder(containerId);
    const currentTurn = turnOrder[0];

 const players = turnOrder.map((userId, index) => ({
  userId,
  position: index + 1
}));

const currentTurnIndex = turnOrder.indexOf(currentTurn);

socket.emit("allMatricesReady", {
  containerId,
  matrices: formatted,
  players,
  currentTurn: currentTurn
});

    console.log("🔁 Re-sent allMatricesReady to late user");
  }

  // ================= 🔥 FIX END =================
});

  // ✅ LEAVE ROOM
  socket.on("leaveRoom", ({ containerId }) => {
    if (!containerId) return;

    socket.leave(containerId);

    console.log(`🚪 Left room: ${containerId}`);
  });

  // ❌ DISCONNECT
 socket.on("disconnect", () => {
  console.log("❌ User disconnected:", socket.id);

  for (let [userId, sock] of socketMap.entries()) {
    if (sock.id === socket.id) {

      // 🔥 CALL DISCONNECT HANDLER
      gameContainer.handleDisconnect(userId, io);

      socketMap.delete(userId);

      console.log(`🗑️ Removed user: ${userId}`);
      break;
    }
  }

  console.log(`📊 Active users: ${socketMap.size}`);
});
});

// ================= SERVER START ================= //

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});