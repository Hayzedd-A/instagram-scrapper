const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs.controller");
const {
  validatePagination,
  validateJobId,
} = require("../middleware/validation");

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with pagination and filtering
 * @access  Public
 */
router.get("/", validatePagination, jobsController.getAllJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job by ID
 * @access  Public
 */
router.get("/:id", validateJobId, jobsController.getJobById);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Cancel a job
 * @access  Public
 */
router.delete("/:id", validateJobId, jobsController.cancelJob);

module.exports = router;
