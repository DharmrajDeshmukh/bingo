const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const jwtConfig = require("../config/jwt");

const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    username: user.username
  };

  const accessToken = jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });

  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });

  return { accessToken, refreshToken };
};



// 🔹 KEEP REGISTER SAME (no change)
const register = async (username, password) => {
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    throw new Error("Username already taken");
  }

  const user = await User.create({
    username,
    password
  });

  return {
    message: "User registered successfully",
    userId: user._id
  };
};



// 🔥 UPDATED LOGIN (AUTO-CREATE USER)
const login = async (username, password) => {
  let user = await User.findOne({ username });

  // ✅ CASE 1: USER DOES NOT EXIST → CREATE
  if (!user) {
    user = await User.create({
      username,
      password, // will be hashed by model
      isActive: true
    });

    console.log("⚡ New user created:", username);
  } else {
    // ✅ CASE 2: USER EXISTS → VALIDATE

    if (!user.isActive) {
      throw new Error("User account is inactive");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw new Error("Invalid password");
    }
  }

  // ✅ Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // ✅ Save refresh token (single session)
  user.refreshToken = refreshToken;
  await user.save();

  return {
    accessToken,
    refreshToken
  };
};



// 🔹 KEEP REFRESH SAME
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token required");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      jwtConfig.refreshSecret,
      {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username
      },
      jwtConfig.accessSecret,
      {
        expiresIn: jwtConfig.accessExpiry,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );

    return {
      accessToken: newAccessToken
    };

  } catch (err) {
    throw new Error("Refresh token expired or invalid");
  }
};



// 🔹 KEEP LOGOUT SAME
const logout = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.refreshToken = null;
  await user.save();

  return {
    message: "Logged out successfully"
  };
};


module.exports = {
  register,
  login,
  refreshAccessToken,
  logout
};