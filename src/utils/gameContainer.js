const containers = new Map();

let containerCounter = 1;

const MAX_USERS = 5;
const MIN_USERS = 2;
const WAIT_TIME = 30000; // 30 sec

const disconnectTimers = new Map(); // userId → timer

// 🔥 MATRIX SIZE LOGIC
const getMatrixSize = (userCount) => {
  if (userCount === 2) return 5;
  if (userCount === 3) return 6;
  return 7;
};


const emitRoomUpdate = (io, containerId, container) => {
  if (!io || !container) return;

  io.to(containerId).emit("roomUpdate", {
    containerId,
    totalUsers: container.users.length,
    users: container.users
  });

  console.log("📡 roomUpdate:", container.users.length);
};

// 🔹 CREATE CONTAINER
const createContainer = () => {
  const containerId = `room_${containerCounter++}`;

 containers.set(containerId, {
  id: containerId,
  users: [],
  turnOrder: [],
  currentTurnIndex: 0,
  submittedUsers: new Set(),
  playerStats: {},
  createdAt: Date.now(),
  isLocked: false,
  isReady: false,
  isGameStarted: false,   // ✅ ADD
  isGameEnded: false,     // ✅ ADD
  timerStarted: false,
  timerId: null,
  bots: new Set()         // ✅ ADD
});

  return containerId;
};


// 🔹 FIND AVAILABLE CONTAINER
const findAvailableContainer = () => {
  let bestContainer = null;
  let oldestTime = Infinity;

  for (let [id, container] of containers) {
    const timePassed = Date.now() - container.createdAt;

    const isValid =
      container.users.length < MAX_USERS &&
      !container.isLocked &&
       !container.isGameEnded && 
      timePassed < WAIT_TIME;

    if (isValid) {
      // pick oldest container (priority)
      if (container.createdAt < oldestTime) {
        oldestTime = container.createdAt;
        bestContainer = id;
      }
    }
  }

  return bestContainer;
};





// 🔥 START MATCHMAKING TIMER
const startMatchmaking = (containerId, io) => {
  const container = containers.get(containerId);
  if (!container) return;

  if (container.isReady) return;
  if (container.timerStarted) return;

  container.timerStarted = true;

 setTimeout(() => {
  const updated = containers.get(containerId);
  if (!updated) return;

  const totalUsers = updated.users.length;

  if (updated.isReady) return;

  // ✅ SUCCESS CASE (2–5 users after 30 sec)
if (totalUsers >= MIN_USERS) {

  updated.isReady = true;
  updated.isLocked = true;
  updated.isGameStarted = true;

  updated.submittedUsers.clear();   // ✅ FIX

  updated.turnOrder = [...updated.users];
  updated.currentTurnIndex = 0;

  emitRoomUpdate(io, containerId, updated);

  if (!containers.has(containerId)) return; // ✅ SAFETY

 

  console.log("🔥 GAME START AFTER 30 SEC:", containerId);
}

  // ❌ FAIL CASE
  else {
    io.to(containerId).emit("matchFailed", {
      containerId,
      totalUsers,
      message: "No players found"
    });

    containers.delete(containerId);
  }

}, WAIT_TIME);
}



// 🔹 ADD USER TO CONTAINER
const addUserToContainer = (userId , io) => {

  if (!userId) {
    throw new Error("Invalid userId");
  }

  // 🔁 already in container
  const existing = getUserContainer(userId);
  if (existing) {
    return {
      containerId: existing,
      status: "already_joined"
    };
  }

  let containerId = findAvailableContainer();

  // ✅ CREATE NEW IF NOT FOUND
  if (!containerId) {
    containerId = createContainer();
  }

  let container = containers.get(containerId);

  // 🔥 FINAL SAFETY FIX (CRASH FIX)
  if (!container) {
    console.log("❌ Container missing, recreating...");
    containerId = createContainer();
    container = containers.get(containerId);

    if (!container) {
      throw new Error("Container creation failed");
    }
  }

  // 🔥 PREVENT DUPLICATE USER
  if (!container.users.includes(userId)) {
    container.users.push(userId);
    emitRoomUpdate(io, containerId, container);
  }

  console.log("👤 User added:", userId, "→", containerId);

  startMatchmaking(containerId, io);

  // ✅ INIT PLAYER STATS
  const size = getMatrixSize(container.users.length);

  container.playerStats[userId] = {
    marked: new Set(),
    rowCount: new Array(size).fill(0),
    colCount: new Array(size).fill(0),
    diagCount: 0,
    antiDiagCount: 0,
    score: 0
  };




  return {
    containerId,
    status: "joined"
  };
};


// 🔹 REMOVE USER
const removeUserFromContainer = (userId, io) => {
  for (let [id, container] of containers) {
    const index = container.users.indexOf(userId);

    if (index !== -1) {

      // 🔥 CASE 1: BEFORE GAME START
      if (!container.isGameStarted) {
        container.users.splice(index, 1);
        emitRoomUpdate(io, id, container);

        delete container.playerStats[userId];
        container.submittedUsers.delete(userId);

        const timePassed = Date.now() - container.createdAt;

        // ⏳ If still time left → allow refill
        if (timePassed < WAIT_TIME) {
          console.log("⏳ User left, still waiting...");
        } 
        else {
          // ⛔ Time finished
          if (container.users.length >= MIN_USERS) {
            console.log("✅ Enough players → start game");
          } else {
            console.log("❌ Not enough players → destroy container");
            containers.delete(id);
          }
        }

        return id;
      }

      // 🔥 CASE 2: GAME STARTED
    // 🔥 CASE 2: GAME STARTED
if (container.isGameStarted && !container.isGameEnded) {

  console.log(`⚠️ User left during game: ${userId}`);

  // ❌ Bot system disabled for now
  // const botId = `bot_${userId}_${Date.now()}`;
  // container.users[index] = botId;
  // container.bots.add(botId);

  // ✅ For now → just remove user
  container.users.splice(index, 1);
  delete container.playerStats[userId];

  return id;
}

      // 🔥 CASE 3: GAME ENDED → CLEANUP
     if (container.isGameEnded) {
  return id;
}
    }
  }

  return null;
};


const endGame = (containerId, io) => {
  forceCleanupContainer(containerId, io);
};


// 🔹 GET USER CONTAINER
const getUserContainer = (userId) => {
  for (let [id, container] of containers) {
    if (container.users.includes(userId)) {
      return id;
    }
  }
  return null;
};


// 🔹 GET CONTAINER
const getContainer = (containerId) => {
  return containers.get(containerId);
};

const turnOrders = new Map(); // containerId → turn array
const currentTurnIndex = new Map();

const generateTurnOrder = (containerId) => {
  const container = getContainer(containerId);
  if (!container) return [];

  const users = [...container.users];

  // simple shuffle
  const shuffled = users.sort(() => Math.random() - 0.5);

  turnOrders.set(containerId, shuffled);
  currentTurnIndex.set(containerId, 0);

  return shuffled;
};

const getCurrentTurn = (containerId) => {
  const order = turnOrders.get(containerId);
  const index = currentTurnIndex.get(containerId) || 0;

  return order ? order[index] : null;
};

const nextTurn = (containerId) => {
  const order = turnOrders.get(containerId);
  if (!order) return null;

  let index = currentTurnIndex.get(containerId) || 0;
  index = (index + 1) % order.length;

  currentTurnIndex.set(containerId, index);

  return order[index];
};

const handleDisconnect = (userId, io) => {

  console.log("⚠️ User disconnected:", userId);

  const timer = setTimeout(() => {

    console.log("❌ User not rejoined → removing:", userId);

    removeUserFromContainer(userId, io);

    disconnectTimers.delete(userId);

  }, 30000); // 30 sec

  disconnectTimers.set(userId, timer);
};

const handleReconnect = (userId) => {

  if (disconnectTimers.has(userId)) {
    clearTimeout(disconnectTimers.get(userId));
    disconnectTimers.delete(userId);

    console.log("✅ User reconnected:", userId);
  }
};

const forceCleanupContainer = (containerId, io) => {
  const container = containers.get(containerId);
  if (!container) return;

  console.log("💥 FORCE CLEAN:", containerId);

  // 🔥 1. STOP ALL EVENTS
  container.isGameEnded = true;
  container.isLocked = true;

  // 🔥 2. EMIT FINAL RESULT (IMPORTANT)
  io.to(containerId).emit("gameEnded", {
    containerId,
    message: "Game finished"
  });

  // 🔥 3. REMOVE ALL USERS FROM ROOM
const room = io.sockets.adapter.rooms.get(containerId);

if (room) {
  room.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(containerId);
    }
  });
}

  // 🔥 4. CLEAR DATA
container.users = [];
container.playerStats = {};
container.submittedUsers.clear();

// 🔥 ADD THIS (VERY IMPORTANT)
turnOrders.delete(containerId);
currentTurnIndex.delete(containerId);

// 🔥 CLEAR MATRIX (ADD THIS FILE)
const gameMatrix = require("./gameMatrix");
if (gameMatrix.clearContainerMatrices) {
  gameMatrix.clearContainerMatrices(containerId);
}

// 🔥 5. DELETE CONTAINER
containers.delete(containerId);

  console.log("🗑️ Container deleted instantly:", containerId);
};

module.exports = {
  addUserToContainer,
  removeUserFromContainer,
  getUserContainer,
  getContainer,
  getMatrixSize,
  generateTurnOrder,
  getCurrentTurn,
  nextTurn,
  handleDisconnect,   
  handleReconnect ,
  forceCleanupContainer, 
  endGame 
};