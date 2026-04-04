const authService = require("../services/auth.service");



exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const result = await authService.register(username, password);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const tokens = await authService.login(username, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: tokens
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};



exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    const data = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data
    });

  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }
};



exports.logout = async (req, res) => {
  try {
    // We will get userId from middleware (next step)
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const result = await authService.logout(userId);

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};