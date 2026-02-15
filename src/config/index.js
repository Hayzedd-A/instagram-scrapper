require("dotenv").config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB Configuration
  mongodb: {
    uri:
      process.env.MONGODB_URI || "mongodb://localhost:27017/instagram-scraper",
    options: {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
    },
  },

  // Apify Configuration
  apify: {
    token: process.env.APIFY_TOKEN,
    scraperActorId:
      process.env.INSTAGRAM_SCRAPER_ACTOR_ID || "apify/instagram-scraper",
    memoryMbytes: 4096,
    timeoutSecs: 3600,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour in seconds
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

// Validate required configuration
if (!config.apify.token && config.nodeEnv !== "test") {
  console.warn(
    "⚠️  Warning: APIFY_TOKEN is not set. Scraping functionality will not work.",
  );
}

if (!config.mongodb.uri) {
  console.warn(
    "⚠️  Warning: MONGODB_URI is not set. Using default localhost connection.",
  );
}

module.exports = config;
