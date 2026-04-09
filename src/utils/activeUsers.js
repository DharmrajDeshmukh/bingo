const activeUsers = new Map(); // userId → { socketId }
const rooms = new Map();       // roomId → [userIds]

let roomCounter = 1;
const REQUIRED_PLAYERS = 2;

// 🔹 ADD USER
const addUser = (userId, socket, io) => {

  if (activeUsers.has(userId)) return;

  activeUsers.set(userId, {
    socketId: socket.id
  });

  console.log(`✅ User added: ${userId}`);
  console.log(`👥 Active Users Count: ${activeUsers.size}`);

  tryMatchmaking(io, socket.server);
};


// 🔥 MATCHMAKING FUNCTION
const tryMatchmaking = (io) => {

  const users = Array.from(activeUsers.keys());

  while (users.length >= REQUIRED_PLAYERS) {

    const selectedUsers = users.splice(0, REQUIRED_PLAYERS);

    const roomId = `room_${roomCounter++}`;

    rooms.set(roomId, selectedUsers);

    console.log(`🔥 Room created: ${roomId}`);
    console.log(`👥 Users in room:`, selectedUsers);

    // ✅ JOIN USERS TO ROOM
    selectedUsers.forEach(userId => {
      const user = activeUsers.get(userId);

      if (user?.socketId) {
        io.sockets.sockets.get(user.socketId)?.join(roomId);
      }

      activeUsers.delete(userId);
    });

    // 🔥 EMIT GAME READY
    io.to(roomId).emit("gameReady", {
      roomId,
      totalUsers: selectedUsers.length
    });
  }
};


// 🔹 REMOVE USER
const removeUser = (userId) => {
  activeUsers.delete(userId);
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