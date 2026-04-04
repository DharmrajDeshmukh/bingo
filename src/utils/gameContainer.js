const containers = new Map(); // containerId → container object

let containerCounter = 1;
const MAX_USERS = 5;
const MIN_USERS = 3;

const WAIT_TIME = 30000; // 30 sec

// 🔹 Create new container
const createContainer = () => {
  const containerId = `room_${containerCounter++}`;

  containers.set(containerId, {
    users: [],
    turnOrder: [],
    currentTurnIndex: 0,
    submittedUsers: new Set(),
    playerStats: {},

    // 🔥 NEW
    createdAt: Date.now(),
    isLocked: false // prevents new users after start
  });

  return containerId;
};


// 🔹 Find available container
const findAvailableContainer = () => {
  for (let [id, container] of containers) {
    if (
      container.users.length < MAX_USERS &&
      !container.isLocked // 🔥 important
    ) {
      return id;
    }
  }
  return null;
};


// 🔹 Add user to container
const addUserToContainer = (userId) => {
  const existing = getUserContainer(userId);
  if (existing) return existing;

  let containerId = findAvailableContainer();

  if (!containerId) {
    containerId = createContainer();
  }

  let container = containers.get(containerId);

  // ❌ if locked → create new container
  if (container.isLocked) {
    containerId = createContainer();
    container = containers.get(containerId);
  }

  container.users.push(userId);

  // 🔥 FULL PLAYER STATS (optimized version)
  container.playerStats[userId] = {
    marked: new Set(),
    rowCount: new Array(5).fill(0),
    colCount: new Array(5).fill(0),
    diagCount: 0,
    antiDiagCount: 0,
    score: 0
  };

  return containerId;
};


const shouldStartGame = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return false;

  const userCount = container.users.length;
  const submitted = container.submittedUsers.size;
  const elapsed = Date.now() - container.createdAt;

  // ✅ full room + all submitted
  if (userCount === MAX_USERS && submitted === userCount) {
    container.isLocked = true;
    return true;
  }

  // ✅ timeout + minimum users + all submitted
  if (
    elapsed >= WAIT_TIME &&
    userCount >= MIN_USERS &&
    submitted === userCount
  ) {
    container.isLocked = true;
    return true;
  }

  return false;
};

const removeUserFromContainer = (userId) => {
  for (let [id, container] of containers) {
    const index = container.users.indexOf(userId);

    if (index !== -1) {
      container.users.splice(index, 1);

      container.submittedUsers.delete(userId);
      delete container.playerStats[userId];

      // 🔥 RESET TIMER (important)
      container.createdAt = Date.now();

      // 🔥 CHECK MIN USERS
      if (container.users.length < MIN_USERS && !container.gameStarted) {
        container.isLocked = false; // allow new users
      }

      // 🔥 DELETE if empty
      if (container.users.length === 0) {
        containers.delete(id);
      }

      return id;
    }
  }

  return null;
};


// 🔹 Get user's container
const getUserContainer = (userId) => {
  for (let [id, container] of containers) {
    if (container.users.includes(userId)) {
      return id;
    }
  }
  return null;
};


// 🔹 Check if user is in specific container
const isUserInContainer = (userId, containerId) => {
  const container = containers.get(containerId);
  if (!container) return false;

  return container.users.includes(userId);
};


// 🔹 Get container object
const getContainer = (containerId) => {
  return containers.get(containerId);
};


// 🔹 Get all users in container
const getContainerUsers = (containerId) => {
  const container = containers.get(containerId);
  return container ? container.users : [];
};


// 🔥 Generate turn order (shuffle users)
const generateTurnOrder = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  const shuffled = [...container.users].sort(() => Math.random() - 0.5);

  container.turnOrder = shuffled;
  container.currentTurnIndex = 0;

  return shuffled;
};


// 🔥 Get current turn user
const getCurrentTurn = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  return container.turnOrder[container.currentTurnIndex];
};


// 🔥 Move to next turn
const nextTurn = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  container.currentTurnIndex =
    (container.currentTurnIndex + 1) % container.turnOrder.length;

  return getCurrentTurn(containerId);
};


// 🔹 Get player stats
const getPlayerStats = (containerId, userId) => {
  const container = containers.get(containerId);
  if (!container) return null;

  return container.playerStats[userId] || null;
};


// 🔹 Reset game inside container (for new match)
const resetContainerGame = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return;

  container.turnOrder = [];
  container.currentTurnIndex = 0;
  container.submittedUsers.clear();

  Object.keys(container.playerStats).forEach(userId => {
    container.playerStats[userId].marked.clear();
    container.playerStats[userId].score = 0;
  });
};


// 🔹 Check if container is ready (minimum players)
const isContainerReady = (containerId) => {
  const container = containers.get(containerId);
  if (!container) return false;

  return container.users.length >= MIN_USERS;
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

  // 🔥 new helpers
  isUserInContainer,
  getPlayerStats,
  resetContainerGame,
  isContainerReady,
  shouldStartGame
};