const activeUsers = require("../utils/activeUsers");
const gameContainer = require("../utils/gameContainer");


// 🎮 START GAME
const startGame = async (userId) => {
  if (activeUsers.isUserActive(userId)) {
    const existingContainer = gameContainer.getUserContainer(userId);

    return {
      message: "User already in game",
      userId,
      containerId: existingContainer
    };
  }

  activeUsers.addUser(userId);

  let containerId = gameContainer.addUserToContainer(userId);

  const container = gameContainer.getContainer(containerId);

  // 🔥 CHECK IF CONTAINER NEEDS PLAYERS
  if (container.users.length < 3) {
    return {
      message: "Waiting for players...",
      userId,
      containerId,
      status: "waiting"
    };
  }

  return {
    message: "Joined game successfully",
    userId,
    containerId,
    status: "ready"
  };
};



// 🏁 END GAME
const endGame = async (userId, containerId) => {
  const actual = gameContainer.getUserContainer(userId);

  if (!actual) throw new Error("User not in any container");
  if (actual !== containerId) throw new Error("Invalid containerId");

  const container = gameContainer.getContainer(containerId);

  // 🔥 CLEAN SUBMISSION
  if (container) {
    container.submittedUsers.delete(userId);
  }

  activeUsers.removeUser(userId);
  gameContainer.removeUserFromContainer(userId);

  return {
    message: "Game ended",
    userId,
    containerId
  };
};

const leaveGame = async (userId, containerId) => {
  const actual = gameContainer.getUserContainer(userId);

  if (!actual) throw new Error("User not in any container");
  if (actual !== containerId) throw new Error("Invalid containerId");

  const container = gameContainer.getContainer(containerId);

  // 🔥 REMOVE FROM SUBMISSION ALSO
  if (container) {
    container.submittedUsers.delete(userId);
  }

  gameContainer.removeUserFromContainer(userId);

  return {
    message: "User left container",
    userId,
    containerId
  };
};

const gameMatrix = require("../utils/gameMatrix");


// 🎯 SET MATRIX (from frontend)
const setMatrix = async (userId, containerId, matrix) => {
  const container = gameContainer.getContainer(containerId);

  if (!container) {
    throw new Error("Invalid container");
  }

  const actual = gameContainer.getUserContainer(userId);

  if (actual !== containerId) {
    throw new Error("Invalid containerId");
  }

  if (container.submittedUsers.has(userId)) {
    throw new Error("Matrix already submitted");
  }

  // ✅ Save matrix
  gameMatrix.setUserMatrix(containerId, userId, matrix);

  // ✅ Mark user as submitted
  container.submittedUsers.add(userId);

  const totalUsers = container.users.length;
  const submittedUsers = container.submittedUsers.size;

  // 🔥 NEW LOGIC (IMPORTANT)
  const shouldStart = gameContainer.shouldStartGame(containerId);

  // ⏳ WAIT STATE
  if (!shouldStart) {
    return {
      status: "waiting",
      totalPlayers: totalUsers,
      submittedPlayers: submittedUsers,
      remainingPlayers: totalUsers - submittedUsers,
      containerId
    };
  }

  // 🚀 START GAME
  const turnOrder = gameContainer.generateTurnOrder(containerId);
  const currentTurn = turnOrder[0];

  // 🔒 Lock container (no new users allowed)
  container.isLocked = true;

  // 🔥 REAL-TIME SYNC (SOCKET)
  if (global.io) {
    global.io.to(containerId).emit("gameReady", {
      containerId,
      turnOrder,
      currentTurn
    });
  }

  console.log("🎮 Game started:", containerId);

  return {
    status: "ready",
    containerId,
    turnOrder,
    currentTurn
  };
};

const getGameStatus = async (containerId) => {
  const container = gameContainer.getContainer(containerId);

  if (!container) {
    throw new Error("Invalid container");
  }

  const total = container.users.length;
  const submitted = container.submittedUsers.size;

  if (submitted < total) {
    return {
      status: "waiting",
      remainingPlayers: total - submitted
    };
  }

  return {
    status: "ready",
    turnOrder: container.turnOrder,
    currentTurn: container.turnOrder[container.currentTurnIndex]
  };
};


const playMove = async (userId, containerId, move) => {
  const container = gameContainer.getContainer(containerId);

  if (!container) throw new Error("Invalid container");

  const currentTurn = gameContainer.getCurrentTurn(containerId);

  if (currentTurn !== userId) {
    throw new Error("Not your turn");
  }

  const size = 5;
  const WINNING_SCORE = 5;

  let winner = null;

  // 🔥 YOUR OPTIMIZED LOGIC HERE
  container.users.forEach(uid => {
    const stats = container.playerStats[uid];

    // ❗ avoid double marking
    if (stats.marked.has(move.number)) return;

    const position = gameMatrix.getPosition(containerId, uid, move.number);
    if (!position) return;

    const { row, col } = position;

    stats.marked.add(move.number);

    stats.rowCount[row]++;
    stats.colCount[col]++;

    if (row === col) stats.diagCount++;
    if (row + col === size - 1) stats.antiDiagCount++;

    let newLines = 0;

    if (stats.rowCount[row] === size) newLines++;
    if (stats.colCount[col] === size) newLines++;
    if (stats.diagCount === size) newLines++;
    if (stats.antiDiagCount === size) newLines++;

    stats.score += newLines;

    // 🏆 CHECK WIN
    if (stats.score >= WINNING_SCORE && !winner) {
      winner = uid;
    }
  });

  // 🔥 BROADCAST MOVE
  if (global.io) {
    global.io.to(containerId).emit("movePlayed", {
      userId,
      move
    });
  }

  // 🏆 IF WINNER FOUND → STOP GAME
  if (winner) {
    if (global.io) {
      global.io.to(containerId).emit("gameFinished", {
        winner
      });
    }

    return {
      message: "Game finished",
      winner
    };
  }

  // 🔁 NEXT TURN
  const nextUser = gameContainer.nextTurn(containerId);

  if (global.io) {
    global.io.to(containerId).emit("turnChanged", {
      currentTurn: nextUser
    });
  }

  return {
    message: "Move accepted",
    currentTurn: nextUser
  };
};




module.exports = {
  startGame,
  endGame,
  leaveGame ,
  setMatrix,
  getGameStatus
};