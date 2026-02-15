const express = require("express");
const router = express.Router();

// Import route modules
const scraperRoutes = require("./scraper.routes");
const dataRoutes = require("./data.routes");
const jobsRoutes = require("./jobs.routes");
const instagramRoutes = require("./instagram.routes");

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Instagram Scraper API is running",
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Instagram Scraper Server API",
    version: "1.0.0",
    endpoints: {
      instagram: "/api/instagram",
      scraper: "/api/scraper",
      data: "/api/data",
      jobs: "/api/jobs",
      health: "/api/health",
    },
    documentation: "See README.md for detailed API documentation",
  });
});

// Mount route modules
router.use("/instagram", instagramRoutes);
router.use("/scraper", scraperRoutes);
router.use("/data", dataRoutes);
router.use("/jobs", jobsRoutes);

module.exports = router;
