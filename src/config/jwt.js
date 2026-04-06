require("dotenv").config();

module.exports = {
  // 🔐 Secrets (used to sign tokens)
  accessSecret: process.env.ACCESS_SECRET || "ACCESS_SECRET_KEY",
  refreshSecret: process.env.REFRESH_SECRET || "REFRESH_SECRET_KEY",

  // ⏳ Expiry durations
  accessExpiry: process.env.ACCESS_EXPIRY || "15m",   // short-lived
  refreshExpiry: process.env.REFRESH_EXPIRY || "7d",  // long-lived

  // 🧾 Token issuer (optional but recommended)
  issuer: process.env.JWT_ISSUER,

  // 👥 Audience (who this token is for)
  audience: process.env.JWT_AUDIENCE
};
