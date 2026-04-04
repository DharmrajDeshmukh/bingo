const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

// (Next step) middleware for protected routes
const authMiddleware = require("../middleware/auth.middleware");



// POST /api/auth/register
router.post("/register", authController.register);



// POST /api/auth/login
router.post("/login", authController.login);



// POST /api/auth/refresh
router.post("/refresh", authController.refreshToken);



// POST /api/auth/logout
// TEMP FIX (until middleware is created)
router.post("/logout", authController.logout);


module.exports = router;