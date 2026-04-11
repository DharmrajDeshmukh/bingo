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

const getPosition = (containerId, userId, value) => {
  if (!gameMatrices.has(containerId)) return null;

  const container = gameMatrices.get(containerId);
  const matrix = container.get(userId);

  if (!matrix) return null;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] === value) {
        return { row: i, col: j };
      }
    }
  }

  return null;
};


module.exports = {
  setUserMatrix,
  getUserMatrix,
  removeUserMatrix,
  getContainerMatrices,
  getPosition 
};