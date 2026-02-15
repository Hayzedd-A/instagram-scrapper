const ScrapingJob = require("../models/ScrapingJob");
const apifyService = require("../services/apify.service");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * Get all jobs with pagination and filtering
 */
const getAllJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const { status, type } = req.query;

  // Build query
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;

  const totalJobs = await ScrapingJob.countDocuments(query);
  const jobs = await ScrapingJob.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  const pagination = {
    page,
    limit,
    total: totalJobs,
    pages: Math.ceil(totalJobs / limit),
  };

  res.json({
    success: true,
    data: jobs,
    pagination,
  });
});

/**
 * Get job by ID
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await ScrapingJob.findById(id).select("-__v");

  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Job not found: ${id}`,
      },
    });
  }

  // If job has an Apify run ID and is still running, check its status
  if (job.apifyRunId && job.status === "running") {
    try {
      const runStatus = await apifyService.getRunStatus(job.apifyRunId);

      if (runStatus.status === "SUCCEEDED" && job.status !== "completed") {
        await job.markCompleted();
      } else if (
        ["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus.status)
      ) {
        await job.markFailed(
          new Error(`Apify run ${runStatus.status.toLowerCase()}`),
        );
      }
    } catch (error) {
      // Just log the error, don't fail the request
      console.error("Error checking Apify run status:", error);
    }
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * Cancel a job
 */
const cancelJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await ScrapingJob.findById(id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Job not found: ${id}`,
      },
    });
  }

  if (["completed", "failed", "cancelled"].includes(job.status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Cannot cancel job with status: ${job.status}`,
      },
    });
  }

  // If job has an Apify run ID, abort it
  if (job.apifyRunId) {
    try {
      await apifyService.abortRun(job.apifyRunId);
    } catch (error) {
      console.error("Error aborting Apify run:", error);
    }
  }

  job.status = "cancelled";
  job.completedAt = new Date();
  await job.save();

  res.json({
    success: true,
    message: "Job cancelled successfully",
    data: job,
  });
});

module.exports = {
  getAllJobs,
  getJobById,
  cancelJob,
};
