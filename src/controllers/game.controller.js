const gameService = require("../services/game.service");



// 🎮 START GAME
exports.startGame = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found"
      });
    }

    const result = await gameService.startGame(userId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        containerId: result.containerId
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

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
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

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error("❌ Leave Game Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



// 🧩 SET MATRIX (store user matrix + trigger game start)
exports.setMatrix = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { matrix, containerId } = req.body;

    // ✅ validation
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

    const result = await gameService.setMatrix(userId, containerId, matrix);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result   // 🔥 includes turnOrder + currentTurn when ready
    });

  } catch (error) {
    console.error("❌ Set Matrix Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getGameStatus = async (req, res) => {
  try {
    const { containerId } = req.query;

    if (!containerId) {
      return res.status(400).json({
        success: false,
        message: "containerId required"
      });
    }

    const result = await gameService.getGameStatus(containerId);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Status Error:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

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
      message: result.message,
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