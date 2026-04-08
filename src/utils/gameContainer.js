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
  if (container.users.length === MAX_USERS && !container.isReady) {
    container.isReady = true;
    container.isLocked = true;

    console.log("🚀 Instant start:", containerId);

    if (io) {
      const totalUsers = container.users.length;
      const matrixSize = getMatrixSize(totalUsers);

      const payload = {
        containerId,
        totalUsers,
        matrixSize,
        users: container.users
      };

      // ✅ USE ONLY THIS
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
      container.users.splice(index, 1);

      container.submittedUsers.delete(userId);
      delete container.playerStats[userId];

      if (!container.isReady) {
        container.createdAt = Date.now();
        container.timerStarted = false;
        setTimeout(() => startMatchmaking(id, io), 100);
      }

      if (container.users.length < MIN_USERS && !container.isReady) {
        container.isLocked = false;
      }

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


module.exports = {
  addUserToContainer,
  removeUserFromContainer,
  getUserContainer,
  getContainer,
  getMatrixSize
};