const rateLimit = require("express-rate-limit");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      message: "Too many requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: "Too many requests from this IP, please try again later.",
      },
    });
  },
});

/**
 * Strict rate limiter for scraping endpoints
 */
const scrapingLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 5), // 20% of normal limit
  message: {
    success: false,
    error: {
      message: "Too many scraping requests. Please wait before trying again.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`Scraping rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: "Too many scraping requests. Please wait before trying again.",
      },
    });
  },
});

module.exports = {
  apiLimiter,
  scrapingLimiter,
};
