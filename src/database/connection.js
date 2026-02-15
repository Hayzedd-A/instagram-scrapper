const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

let isConnected = false;

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info("Using existing database connection");
    return;
  }

  try {
    mongoose.set("strictQuery", false);
    logger.info("Connecting to MongoDB...");

    const conn = await mongoose.connect(
      config.mongodb.uri,
      config.mongodb.options,
    );

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      isConnected = true;
    });
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("Error disconnecting from MongoDB:", error);
  }
};

/**
 * Get connection status
 * @returns {boolean}
 */
const getConnectionStatus = () => isConnected;

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
};
