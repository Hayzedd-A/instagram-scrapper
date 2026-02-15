const { body, param, query, validationResult } = require("express-validator");

/**
 * Validation result checker middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: errors.array(),
      },
    });
  }
  next();
};

/**
 * Username validation rules
 */
const validateUsername = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 1, max: 30 })
    .withMessage("Username must be 1-30 characters")
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage(
      "Username can only contain letters, numbers, periods, and underscores",
    ),
  validate,
];

/**
 * Hashtag validation rules
 */
const validateHashtag = [
  body("hashtag")
    .trim()
    .notEmpty()
    .withMessage("Hashtag is required")
    .customSanitizer((value) => {
      // Remove # if present
      let cleaned = value.startsWith("#") ? value.substring(1) : value;
      // Remove spaces and special characters, keep only alphanumeric and underscores
      cleaned = cleaned.replace(/[^a-zA-Z0-9_]/g, "");
      return cleaned;
    })
    .isLength({ min: 1, max: 150 })
    .withMessage("Hashtag must be 1-150 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Hashtag can only contain letters, numbers, and underscores"),
  validate,
];

/**
 * Post URL validation rules
 */
const validatePostUrl = [
  body("postUrl")
    .trim()
    .notEmpty()
    .withMessage("Post URL is required")
    .matches(/instagram\.com\/p\/[a-zA-Z0-9_-]+/)
    .withMessage("Invalid Instagram post URL"),
  validate,
];

/**
 * Limit validation rules
 */
const validateLimit = [
  body("limit")
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage("Limit must be between 1 and 500")
    .toInt(),
  validate,
];

/**
 * Query pagination validation
 */
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  validate,
];

/**
 * Job ID validation
 */
const validateJobId = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Job ID is required")
    .isMongoId()
    .withMessage("Invalid job ID format"),
  validate,
];

module.exports = {
  validate,
  validateUsername,
  validateHashtag,
  validatePostUrl,
  validateLimit,
  validatePagination,
  validateJobId,
};
