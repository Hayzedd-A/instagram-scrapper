const express = require("express");
const cors = require("cors");
const config = require("./config");
const logger = require("./utils/logger");
const { connectDB } = require("./database/connection");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const routes = require("./routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res.statusCode, responseTime);
  });

  next();
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Mount API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Instagram Scraper Server",
    version: "1.0.0",
    apiEndpoint: "/api",
    documentation: "See README.md for API documentation",
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    app.listen(config.port, () => {
      logger.info(
        `Server running on port ${config.port} in ${config.nodeEnv} mode`,
      );
      logger.info(`API available at http://localhost:${config.port}/api`);

      // Log configuration status
      if (!config.apify.token) {
        logger.warn(
          "⚠️  Apify token not configured. Please set APIFY_TOKEN in environment variables.",
        );
        logger.warn(
          "⚠️  Scraping functionality will not work until Apify is configured.",
        );
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
// process.on("uncaughtException", (error) => {
//   logger.error("Uncaught Exception:", error);
//   process.exit(1);
// });

// // Handle unhandled promise rejections
// process.on("unhandledRejection", (reason, promise) => {
//   logger.error("Unhandled Rejection at:", promise, "reason:", reason);
//   process.exit(1);
// });

// // Graceful shutdown
// process.on("SIGTERM", () => {
//   logger.info("SIGTERM received, shutting down gracefully");
//   process.exit(0);
// });

// process.on("SIGINT", () => {
//   logger.info("SIGINT received, shutting down gracefully");
//   process.exit(0);
// });

// Start the server
startServer();

module.exports = app;
