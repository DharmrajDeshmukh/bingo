const express = require("express");
const router = express.Router();

const gameController = require("../controllers/game.controller");
const authMiddleware = require("../middleware/auth.middleware");


// 🎮 START GAME → join container
router.post("/start", authMiddleware, gameController.startGame);


// 🚪 LEAVE GAME → leave container only (stay online)
router.post("/leave", authMiddleware, gameController.leaveGame);


// 🏁 END GAME → leave container + offline
router.post("/end", authMiddleware, gameController.endGame);


// 🧩 SET MATRIX → store user matrix
router.post("/matrix", authMiddleware, gameController.setMatrix);

router.get("/status", authMiddleware, gameController.getGameStatus);

router.post("/play", authMiddleware, gameController.playMove);


module.exports = router;