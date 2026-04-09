const activeUsers = new Map();

const WAIT_TIME = 30 * 1000; // 30 sec

// 🔹 ADD USER (with auto-remove timer)
const addUser = (userId) => {
  if (activeUsers.has(userId)) return;

  const timeout = setTimeout(() => {
    if (activeUsers.has(userId)) {
      activeUsers.delete(userId);
      console.log(`❌ Auto removed after 30s: ${userId}`);
      console.log(`👥 Active Users Count: ${activeUsers.size}`);
    }
  }, 30 * 1000);

  activeUsers.set(userId, {
    startTime: Date.now(),
    timeout
  });

  console.log(`✅ User added: ${userId}`);
  console.log(`👥 Active Users Count: ${activeUsers.size}`);
};

// 🔹 REMOVE USER (important)
const removeUser = (userId) => {
  const user = activeUsers.get(userId);
  if (!user) return;

  if (user.timeout) {
    clearTimeout(user.timeout);
  }

  activeUsers.delete(userId);

  console.log(`🗑️ User removed: ${userId}`);
  console.log(`👥 Active Users Count: ${activeUsers.size}`);
};



// 🔹 CHECK USER
const isUserActive = (userId) => {
  return activeUsers.has(userId);
};

module.exports = {
  addUser,
  removeUser,
  isUserActive
};