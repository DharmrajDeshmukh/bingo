
const gameContainer = require("../utils/gameContainer");
const gameMatrix = require("../utils/gameMatrix");



const startGame = async (userId, socket, io) => {

  const existingContainer = gameContainer.getUserContainer(userId);

  if (existingContainer) {
    if (socket) {
      socket.join(existingContainer);
      console.log("🔁 Rejoined:", existingContainer);
    }

    return {
      containerId: existingContainer
    };
  }

  // ✅ FIRST: add user to container
  const result = gameContainer.addUserToContainer(userId, io);
  const containerId = result?.containerId;

  if (!containerId) {
    throw new Error("Failed to create/join container");
  }

  // ✅ NOW get container (move this UP)
  const container = gameContainer.getContainer(containerId);

  // 🔥 NOW SAFE to use
  if (container?.isGameOver) {
    return { message: "Game already finished" };
  }

  // ✅ JOIN SOCKET
  if (socket) {
    socket.join(containerId);
    console.log("📦 Socket joined:", containerId);
  }

  // ===============================
  // 🔥 ROOM UPDATE
  // ===============================
  if (io && container) {
    io.to(containerId).emit("roomUpdate", {
      containerId,
      totalUsers: container.users.length,
      users: [...container.users]
    });

    console.log("📡 Room Update:", container.users.length);
  }

  if (io && containerId) {
    const room = io.sockets.adapter.rooms.get(containerId);

    console.log("👥 ROOM SIZE:", room?.size);
    console.log("👥 USERS:", container.users.length);
  }

  return {
    containerId
  };
};



// 🏁 END GAME
const endGame = async (userId, containerId, io) => {

  const actual = gameContainer.getUserContainer(userId);

  if (!actual) throw new Error("User not in any container");
  if (actual !== containerId) throw new Error("Invalid containerId");

  const container = gameContainer.getContainer(containerId);

  if (container) {
    container.submittedUsers.delete(userId);
  }

  gameContainer.removeUserFromContainer(userId);

  return {
    message: "Game ended",
    userId,
    containerId
  };
};




// 🚪 LEAVE GAME
const leaveGame = async (userId, containerId, io) => {

  const actual = gameContainer.getUserContainer(userId);

  if (!actual) throw new Error("User not in any container");
  if (actual !== containerId) throw new Error("Invalid containerId");

  const container = gameContainer.getContainer(containerId);

  if (container) {
    container.submittedUsers.delete(userId);
  }

  gameContainer.removeUserFromContainer(userId, io);

  return {
    message: "User left container",
    userId,
    containerId
  };
};


// 🎯 SET MATRIX
const setMatrix = async (userId, containerId, matrix, io) => {

  const container = gameContainer.getContainer(containerId);
  if (!container) throw new Error("Invalid container");

  const actual = gameContainer.getUserContainer(userId);
  if (actual !== containerId) {
    throw new Error("Invalid containerId");
  }

  if (container.submittedUsers.has(userId)) {
    throw new Error("Matrix already submitted");
  }

  const expectedSize = gameContainer.getMatrixSize(container.users.length);

  if (matrix.length !== expectedSize) {
    throw new Error(`Matrix must be ${expectedSize}x${expectedSize}`);
  }


// ✅ Save matrix
gameMatrix.setUserMatrix(containerId, userId, matrix);

// 🔥 SINGLE SOURCE OF TRUTH
const matrices = gameMatrix.getContainerMatrices(containerId);

const totalUsers = container.users.length;
const submittedUsers = matrices ? matrices.size : 0;

console.log("📊 TOTAL USERS:", totalUsers);
console.log("📊 SUBMITTED (MATRIX):", submittedUsers);

  // ⏳ WAIT
  if (submittedUsers < totalUsers) {
    return {
      status: "waiting",
      totalPlayers: totalUsers,
      submittedPlayers: submittedUsers,
      remainingPlayers: totalUsers - submittedUsers,
      containerId
    };
  }

  // 🚀 START GAME
// 🚀 ALL MATRICES READY

const allMatrices = gameMatrix.getContainerMatrices(containerId);

// 🔥 convert Map → object
const formattedMatrices = {};

allMatrices.forEach((matrix, uid) => {
  formattedMatrices[uid] = matrix;
});

// 🎯 TURN SYSTEM
const turnOrder = gameContainer.generateTurnOrder(containerId);
const currentTurn = turnOrder[0];

container.isLocked = true;

// 🔥 MAIN EMIT
const players = turnOrder.map((userId, index) => ({
  userId,
  position: index + 1
}));

const currentTurnIndex = turnOrder.indexOf(currentTurn);

io.to(containerId).emit("allMatricesReady", {
  containerId,
  matrices: formattedMatrices,
  players,                              // 🔥 NEW
  currentTurnUserId: currentTurn    // 🔥 NUMBER
});

console.log("🎮 All matrices ready:", containerId);

return {
  status: "ready",
  containerId,
  turnOrder,
  currentTurn
};

  console.log("🎮 Game started:", containerId);

  return {
    status: "ready",
    containerId,
    turnOrder,
    currentTurn
  };
};


// 🎯 PLAY MOVE
const playMove = async (userId, containerId, move, io) => {

  const container = gameContainer.getContainer(containerId);
  if (!container) throw new Error("Invalid container");

  const currentTurn = gameContainer.getCurrentTurn(containerId);
  if (currentTurn !== userId) {
    throw new Error("Not your turn");
  }

  const size = gameContainer.getMatrixSize(container.users.length);


const WINNING_SCORE = 5;

let winner = null; 

container.users.forEach(uid => {

  const stats = container.playerStats[uid];

  if (stats.marked.has(move)) return;

  const position = gameMatrix.getPosition(containerId, uid, move);
  if (!position) return;

  const { row, col } = position;

  stats.marked.add(move);

  stats.rowCount[row]++;
  stats.colCount[col]++;

  if (row === col) stats.diagCount++;
  if (row + col === size - 1) stats.diagCount++;

  let newLines = 0;

  if (stats.rowCount[row] === size) newLines++;
  if (stats.colCount[col] === size) newLines++;
  if (stats.diag1 === size) newLines++;
  if (stats.diag2 === size) newLines++;

  stats.score += newLines;

  if (stats.score >= WINNING_SCORE && !winner) {
    winner = uid;
  }
});



  if (winner) {

    container.isGameEnded = true;
    
    if (io) {
      io.to(containerId).emit("gameFinished", {
        winner
      });
    }

    return { message: "Game finished", winner };
  }

const nextUser = gameContainer.nextTurn(containerId);

const containerData = gameContainer.getContainer(containerId);
const turnOrder = containerData.turnOrder;
const index = turnOrder.indexOf(nextUser);

io.to(containerId).emit("movePlayed", {
  userId,
  move,
  currentTurnUserId: nextUser   // ✅ FIXED
});
 return {
  message: "Move accepted",
  currentTurnUserId: nextUser
};
};


module.exports = {
  startGame,
  endGame,
  leaveGame,
  setMatrix,
  playMove
};