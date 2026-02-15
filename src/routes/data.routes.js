const express = require("express");
const router = express.Router();
const dataController = require("../controllers/data.controller");
const { validatePagination } = require("../middleware/validation");

/**
 * @route   GET /api/data/profiles
 * @desc    Get all profiles with pagination
 * @access  Public
 */
router.get("/profiles", validatePagination, dataController.getProfiles);

/**
 * @route   GET /api/data/profiles/:username
 * @desc    Get profile by username
 * @access  Public
 */
router.get("/profiles/:username", dataController.getProfileByUsername);

/**
 * @route   GET /api/data/posts
 * @desc    Get all posts with pagination and filtering
 * @access  Public
 */
router.get("/posts", validatePagination, dataController.getPosts);

/**
 * @route   GET /api/data/posts/:id
 * @desc    Get post by ID
 * @access  Public
 */
router.get("/posts/:id", dataController.getPostById);

/**
 * @route   GET /api/data/comments/:postId
 * @desc    Get comments for a post
 * @access  Public
 */
router.get(
  "/comments/:postId",
  validatePagination,
  dataController.getCommentsByPostId,
);

module.exports = router;
