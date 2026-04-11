const gameService = require("../services/game.service");


// 🎮 START GAME (ONLY JOIN + MATCHMAKING)

const { getContainer } = require("../utils/gameContainer");

exports.startGame = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found"
      });
    }

    const io = req.app.get("io");
    if (!io) {
  return res.status(500).json({
    success: false,
    message: "Socket server not initialized"
  });
}

    // 🔥 GET SOCKET
    const socketMap = req.app.get("socketMap");
    const socket = socketMap?.get(userId);

    if (!socket) {
      return res.status(400).json({
        success: false,
        message: "Socket not connected"
      });
    }

    // 🔥 CALL SERVICE
    const result = await gameService.startGame(userId, socket, io);

    // 🔥 GET CONTAINER STATE
    const container = getContainer(result.containerId);

    let status = "searching";

    if (container && container.isGameStarted) {
      status = "ready";
    }

    return res.status(200).json({
      success: true,
      data: {
        containerId: result.containerId,
        status
      }
    });

  } catch (error) {
    console.error("❌ Start Game Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// 🏁 END GAME (remove from container + offline)
exports.endGame = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { containerId } = req.body;

    if (!userId || !containerId) {
      return res.status(400).json({
        success: false,
        message: "userId and containerId required"
      });
    }

    const result = await gameService.endGame(userId, containerId);

    // ❌ NO SOCKET EMIT (as per your requirement)

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error("❌ End Game Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// 🚪 LEAVE GAME (leave container only)
exports.leaveGame = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { containerId } = req.body;

    if (!userId || !containerId) {
      return res.status(400).json({
        success: false,
        message: "userId and containerId required"
      });
    }

    const result = await gameService.leaveGame(userId, containerId);

    // ❌ NO SOCKET EMIT (backend handles silently)

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error("❌ Leave Game Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// 🧩 SET MATRIX (store matrix + start game)
exports.setMatrix = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { matrix, containerId } = req.body;

    if (!userId || !matrix || !containerId) {
      return res.status(400).json({
        success: false,
        message: "userId, containerId and matrix are required"
      });
    }

    if (!Array.isArray(matrix)) {
      return res.status(400).json({
        success: false,
        message: "Matrix must be an array"
      });
    }

    const io = req.app.get("io");

    const result = await gameService.setMatrix(userId, containerId, matrix ,io);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Set Matrix Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// 🎯 PLAY MOVE
exports.playMove = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { containerId, move } = req.body;

    if (!userId || !containerId || !move) {
      return res.status(400).json({
        success: false,
        message: "userId, containerId and move required"
      });
    }

    const result = await gameService.playMove(userId, containerId, move);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Play Move Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};