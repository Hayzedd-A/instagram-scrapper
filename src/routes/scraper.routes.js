const express = require("express");
const router = express.Router();
const scraperController = require("../controllers/scraper.controller");
const { scrapingLimiter } = require("../middleware/rateLimiter");
const {
  validateUsername,
  validateHashtag,
  validatePostUrl,
  validateLimit,
} = require("../middleware/validation");

/**
 * @route   POST /api/scraper/profile
 * @desc    Scrape an Instagram profile
 * @access  Public
 */
router.post(
  "/profile",
  scrapingLimiter,
  validateUsername,
  scraperController.scrapeProfile,
);

/**
 * @route   POST /api/scraper/posts
 * @desc    Scrape posts from an Instagram profile
 * @access  Public
 */
router.post(
  "/posts",
  scrapingLimiter,
  validateUsername,
  validateLimit,
  scraperController.scrapePosts,
);

/**
 * @route   POST /api/scraper/hashtag
 * @desc    Scrape posts by hashtag
 * @access  Public
 */
router.post(
  "/hashtag",
  scrapingLimiter,
  validateHashtag,
  validateLimit,
  scraperController.scrapeHashtag,
);

/**
 * @route   POST /api/scraper/comments
 * @desc    Scrape comments from a post
 * @access  Public
 */
router.post(
  "/comments",
  scrapingLimiter,
  validatePostUrl,
  validateLimit,
  scraperController.scrapeComments,
);

module.exports = router;
