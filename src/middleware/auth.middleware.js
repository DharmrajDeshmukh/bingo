const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

module.exports = (req, res, next) => {
  try {
    // 🔹 Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing"
      });
    }

    // 🔹 Check Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format (Bearer token required)"
      });
    }

    // 🔹 Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not found"
      });
    }

    // 🔹 Verify token
    const decoded = jwt.verify(token, jwtConfig.accessSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });

    // 🔹 Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };

    // 🔥 Debug (optional)
    // console.log("✅ Authenticated user:", req.user);

    // ✅ Continue to next middleware/controller
    next();

  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token"
    });
  }
};