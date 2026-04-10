const activeUsers = require("../utils/activeUsers");
const gameContainer = require("../utils/gameContainer");
const gameMatrix = require("../utils/gameMatrix");

// 🎮 START GAME
const startGame = async (userId, io) => {

  // 🔁 अगर user already game में है
  if (activeUsers.isUserActive(userId)) {
    const existingContainer = gameContainer.getUserContainer(userId);

    return {
      containerId: existingContainer,
      status: "searching"
    };
  }

  // ✅ add user
  activeUsers.addUser(userId, io);

  const containerId = gameContainer.addUserToContainer(userId, io);
  const container = gameContainer.getContainer(containerId);

  // 🔥🔥 MAIN FIX → GAME READY TRIGGER
  if (container && container.users.length >= 2 && !container.isReady) {

    container.isReady = true;
    container.isLocked = true;
    container.isGameStarted = true;

    console.log("🔥 GAME READY TRIGGERED:", containerId);

    if (io) {
      io.to(containerId).emit("gameReady", {
        containerId,
        totalUsers: container.users.length,
        matrixSize: gameContainer.getMatrixSize(container.users.length),
        users: [...container.users]
      });
    }
  }

  return {
    containerId,
    status: "searching"
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

  activeUsers.removeUser(userId);
  gameContainer.removeUserFromContainer(userId, io);

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
  container.submittedUsers.add(userId);

  const totalUsers = container.users.length;
  const submittedUsers = container.submittedUsers.size;

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
  const turnOrder = gameContainer.generateTurnOrder(containerId);
  const currentTurn = turnOrder[0];

  container.isLocked = true;

  if (io) {
    io.to(containerId).emit("gameReady", {
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


// 🎯 PLAY MOVE
const playMove = async (userId, containerId, move, io) => {

  const container = gameContainer.getContainer(containerId);
  if (!container) throw new Error("Invalid container");

  const currentTurn = gameContainer.getCurrentTurn(containerId);
  if (currentTurn !== userId) {
    throw new Error("Not your turn");
  }

  const size = gameContainer.getMatrixSize(container.users.length);
  const WINNING_SCORE = size;

  let winner = null;

  container.users.forEach(uid => {

    const stats = container.playerStats[uid];

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

    if (stats.score >= WINNING_SCORE && !winner) {
      winner = uid;
    }
  });

  // 🔥 BROADCAST MOVE
  if (io) {
    io.to(containerId).emit("movePlayed", {
      userId,
      move
    });
  }

  if (winner) {
    if (io) {
      io.to(containerId).emit("gameFinished", {
        winner
      });
    }

    return { message: "Game finished", winner };
  }

  const nextUser = gameContainer.nextTurn(containerId);

  if (io) {
    io.to(containerId).emit("turnChanged", {
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
  leaveGame,
  setMatrix,
  playMove
};