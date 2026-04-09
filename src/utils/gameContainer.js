const containers = new Map();

let containerCounter = 1;

const MAX_USERS = 5;
const MIN_USERS = 2;
const WAIT_TIME = 30000; // 30 sec


// 🔥 MATRIX SIZE LOGIC
const getMatrixSize = (userCount) => {
  if (userCount === 2) return 5;
  if (userCount === 3) return 6;
  return 7;
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


// ✅ FINAL EMIT SYSTEM (ONLY THIS)
const emitWhenReady = (io, containerId, payload) => {
  let attempts = 0;

  const interval = setInterval(() => {
    const room = io.sockets.adapter.rooms.get(containerId);
    const size = room ? room.size : 0;

    console.log("👥 Waiting for users in room:", size);

    // ✅ Wait until all users joined OR max retries
    if (size >= payload.totalUsers || attempts > 10) {
      clearInterval(interval);

      io.to(containerId).emit("game_ready", payload);
      console.log("✅ Emitted game_ready:", containerId);
    }

    attempts++;
  }, 200);
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

    if (updated.users.length >= MIN_USERS && !updated.isReady) {
      updated.isReady = true;
      updated.isLocked = true;
      updated.isGameStarted = true; 

      console.log("⏳ 30 sec completed → game ready:", containerId);

      if (io) {
        const totalUsers = updated.users.length;
        const matrixSize = getMatrixSize(totalUsers);

        const payload = {
          containerId,
          totalUsers,
          matrixSize,
          users: updated.users
        };

        // ✅ USE ONLY THIS
        emitWhenReady(io, containerId, payload);
      }
    }
  }, WAIT_TIME);
};


// 🔹 ADD USER TO CONTAINER
const addUserToContainer = (userId, io) => {
  const existing = getUserContainer(userId);
  if (existing) return existing;

  let containerId = findAvailableContainer();

  

  if (!containerId) {
    containerId = createContainer();
  }

  let container = containers.get(containerId);

  if (container.isLocked) {
    containerId = createContainer();
    container = containers.get(containerId);
  }

  container.users.push(userId);

  // 🔥 INIT STATS
  const size = getMatrixSize(container.users.length);
  container.playerStats[userId] = {
    marked: new Set(),
    rowCount: new Array(size).fill(0),
    colCount: new Array(size).fill(0),
    diagCount: 0,
    antiDiagCount: 0,
    score: 0
  };

  // 🔥 START TIMER
  startMatchmaking(containerId, io);

  // 🚀 INSTANT START
  if (
  container.users.length === MAX_USERS &&
  !container.isReady &&
  !container.isGameEnded
) {
  // ✅ Stop matchmaking timer
  container.timerStarted = false;

  // ✅ Set game state
  container.isReady = true;
  container.isLocked = true;
  container.isGameStarted = true;

  console.log("🚀 Instant start:", containerId);

  if (io) {
    const totalUsers = container.users.length;
    const matrixSize = getMatrixSize(totalUsers);

    const payload = {
      containerId,
      totalUsers,
      matrixSize,
      users: [...container.users] // ✅ safe copy
    };

    // ✅ Emit only when all joined
    emitWhenReady(io, containerId, payload);
  }
}

  return containerId;
};


// 🔹 REMOVE USER
const removeUserFromContainer = (userId, io) => {
  for (let [id, container] of containers) {
    const index = container.users.indexOf(userId);

    if (index !== -1) {

      // 🔥 CASE 1: BEFORE GAME START
      if (!container.isGameStarted) {
        container.users.splice(index, 1);

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
        container.users.splice(index, 1);
        delete container.playerStats[userId];

        if (container.users.length === 0) {
          console.log("🗑️ Container destroyed:", id);
          containers.delete(id);
        }

        return id;
      }
    }
  }

  return null;
};


const endGame = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return;

  container.isGameEnded = true;

  console.log("🏁 Game ended:", containerId);
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


module.exports = {
  addUserToContainer,
  removeUserFromContainer,
  getUserContainer,
  getContainer,
  getMatrixSize
};