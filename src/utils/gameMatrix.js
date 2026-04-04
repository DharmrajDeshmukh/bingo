const gameMatrices = new Map();
// containerId → { userId → matrix }


// 🔹 Save matrix for user
const setUserMatrix = (containerId, userId, matrix) => {
  if (!gameMatrices.has(containerId)) {
    gameMatrices.set(containerId, new Map());
  }

  const container = gameMatrices.get(containerId);
  container.set(userId, matrix);
};


// 🔹 Get matrix of user
const getUserMatrix = (containerId, userId) => {
  if (!gameMatrices.has(containerId)) return null;

  return gameMatrices.get(containerId).get(userId) || null;
};


// 🔹 Remove user matrix
const removeUserMatrix = (containerId, userId) => {
  if (!gameMatrices.has(containerId)) return;

  const container = gameMatrices.get(containerId);
  container.delete(userId);

  // If container empty → remove it
  if (container.size === 0) {
    gameMatrices.delete(containerId);
  }
};


// 🔹 Get all matrices in container
const getContainerMatrices = (containerId) => {
  if (!gameMatrices.has(containerId)) return null;

  return gameMatrices.get(containerId);
};


module.exports = {
  setUserMatrix,
  getUserMatrix,
  removeUserMatrix,
  getContainerMatrices
};