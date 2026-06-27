const mongoose = require("mongoose");

let databaseConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mini-instagram";

  try {
    await mongoose.connect(mongoURI);
    databaseConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    databaseConnected = false;
    console.error("MongoDB connection failed:", error.message);
    console.warn("Starting server without database connection. Set MONGODB_URI in backend/.env to enable database features.");
  }
};

const isDatabaseConnected = () => databaseConnected;

module.exports = connectDB;
module.exports.isDatabaseConnected = isDatabaseConnected;