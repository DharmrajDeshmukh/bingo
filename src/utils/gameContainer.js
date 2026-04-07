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
    timerStarted: false
  });

  return containerId;
};


// 🔹 FIND AVAILABLE CONTAINER
const findAvailableContainer = () => {
  for (let [id, container] of containers) {
    if (
      container.users.length < MAX_USERS &&
      !container.isLocked
    ) {
      return id;
    }
  }
  return null;
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

      console.log("⏳ 30 sec completed → game ready:", containerId);

      if (io) {
        io.to(containerId).emit("game_ready", {
          containerId,
          totalUsers: updated.users.length,
          users: updated.users
        });
      } else {
        console.log("❌ IO not available (timer emit)");
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

  // ❌ If locked → create new
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

  // 🔥 START TIMER (FIXED)
  startMatchmaking(containerId, io);

  // 🚀 INSTANT START IF FULL (5 users)
  if (container.users.length === MAX_USERS && !container.isReady) {
    container.isReady = true;
    container.isLocked = true;

    console.log("🚀 Instant start (5 users):", containerId);

    if (io) {
      io.to(containerId).emit("game_ready", {
        containerId,
        totalUsers: container.users.length,
        users: container.users,
        instant: true
      });
    } else {
      console.log("❌ IO not available (instant start)");
    }
  }

  return containerId;
};


// 🔹 REMOVE USER
const removeUserFromContainer = (userId, io) => {
  for (let [id, container] of containers) {
    const index = container.users.indexOf(userId);

    if (index !== -1) {
      container.users.splice(index, 1);

      container.submittedUsers.delete(userId);
      delete container.playerStats[userId];

      // 🔥 RESET TIMER IF NEEDED
      if (!container.isReady) {
        container.createdAt = Date.now();
      container.timerStarted = false;
setTimeout(() => startMatchmaking(id, io), 100);
      }

      // 🔥 UNLOCK IF BELOW MIN
      if (container.users.length < MIN_USERS && !container.isReady) {
        container.isLocked = false;
      }

      // 🔥 DELETE EMPTY
      if (container.users.length === 0) {
        containers.delete(id);
      }

      return id;
    }
  }

  return null;
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


// 🔹 GET USERS
const getContainerUsers = (containerId) => {
  const container = containers.get(containerId);
  return container ? container.users : [];
};


// 🔥 GENERATE TURN ORDER
const generateTurnOrder = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  const shuffled = [...container.users].sort(() => Math.random() - 0.5);

  container.turnOrder = shuffled;
  container.currentTurnIndex = 0;

  return shuffled;
};


// 🔥 CURRENT TURN
const getCurrentTurn = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  return container.turnOrder[container.currentTurnIndex];
};


// 🔥 NEXT TURN
const nextTurn = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  container.currentTurnIndex =
    (container.currentTurnIndex + 1) % container.turnOrder.length;

  return getCurrentTurn(containerId);
};


// 🔹 PLAYER STATS
const getPlayerStats = (containerId, userId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  return container.playerStats[userId] || null;
};


// 🔹 RESET GAME
const resetContainerGame = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return;

  container.turnOrder = [];
  container.currentTurnIndex = 0;
  container.submittedUsers.clear();

  const size = getMatrixSize(container.users.length);

  Object.keys(container.playerStats).forEach(userId => {
    container.playerStats[userId] = {
      marked: new Set(),
      rowCount: new Array(size).fill(0),
      colCount: new Array(size).fill(0),
      diagCount: 0,
      antiDiagCount: 0,
      score: 0
    };
  });
};


// 🔹 CHECK READY
const isContainerReady = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return false;

  return container.isReady;
};


module.exports = {
  addUserToContainer,
  removeUserFromContainer,
  getUserContainer,
  getContainer,
  getContainerUsers,
  generateTurnOrder,
  getCurrentTurn,
  nextTurn,
  getPlayerStats,
  resetContainerGame,
  isContainerReady,
  getMatrixSize
};