const express = require("express");
const router = express.Router();
const instagramController = require("../controllers/instagram.controller");
const { scrapingLimiter } = require("../middleware/rateLimiter");
const { body, param } = require("express-validator");
const { validate } = require("../middleware/validation");

/**
 * Validation for search request
 */
const validateSearchRequest = [
  body("searchTerm")
    .trim()
    .notEmpty()
    .withMessage("Search term is required")
    .customSanitizer((value) => {
      // Remove # if present and clean
      let cleaned = value.startsWith("#") ? value.substring(1) : value;
      cleaned = cleaned.replace(/[^a-zA-Z0-9_]/g, "");
      return cleaned;
    })
    .isLength({ min: 1, max: 150 })
    .withMessage("Search term must be 1-150 characters"),
  body("recencyDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Recency days must be between 1 and 365")
    .toInt(),
  body("minViews")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Min views must be a positive number")
    .toInt(),
  body("minFollowers")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Min followers must be a positive number")
    .toInt(),
  body("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000")
    .toInt(),
  body("profile.recencyPost")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Profile recency must be between 1 and 365")
    .toInt(),
  validate,
];

/**
 * Validation for job ID
 */
const validateJobId = [
  param("jobId")
    .trim()
    .notEmpty()
    .withMessage("Job ID is required")
    .isUUID()
    .withMessage("Invalid job ID format"),
  validate,
];

/**
 * @route   POST /api/instagram/search
 * @desc    Create Instagram search job for content creators
 * @access  Public
 */
router.post(
  "/search",
  scrapingLimiter,
  validateSearchRequest,
  instagramController.createSearchJob,
);

/**
 * @route   GET /api/instagram/job/:jobId
 * @desc    Get search job status and results
 * @access  Public
 */
router.get(
  "/job/:jobId",
  validateJobId,
  instagramController.getSearchJobStatus,
);

module.exports = router;
