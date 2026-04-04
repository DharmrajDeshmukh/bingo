const activeUsers = new Map();

const addUser = (userId) => {
  activeUsers.set(userId, {
    startTime: Date.now()
  });
};

const removeUser = (userId) => {
  activeUsers.delete(userId);
};

const isUserActive = (userId) => {
  return activeUsers.has(userId);
};

module.exports = {
  addUser,
  removeUser,
  isUserActive
};