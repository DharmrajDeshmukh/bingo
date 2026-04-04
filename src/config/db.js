const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/setu-app";

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);

    // Stop server if DB fails
    process.exit(1);
  }
};

module.exports = connectDB;