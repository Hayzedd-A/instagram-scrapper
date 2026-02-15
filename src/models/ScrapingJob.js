const mongoose = require("mongoose");

const scrapingJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["profile", "posts", "hashtag", "comments"],
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    apifyRunId: {
      type: String,
      default: null,
    },
    apifyActorId: {
      type: String,
      default: null,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    results: {
      itemsScraped: {
        type: Number,
        default: 0,
      },
      itemsSaved: {
        type: Number,
        default: 0,
      },
      details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    error: {
      message: String,
      stack: String,
      timestamp: Date,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in milliseconds
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for querying jobs
scrapingJobSchema.index({ status: 1, createdAt: -1 });
scrapingJobSchema.index({ type: 1, target: 1 });

// Calculate duration before saving
scrapingJobSchema.pre("save", function (next) {
  if (this.startedAt && this.completedAt) {
    this.duration = this.completedAt - this.startedAt;
  }
  next();
});

// Instance method to update progress
scrapingJobSchema.methods.updateProgress = async function (
  progress,
  status = null,
) {
  this.progress = progress;
  if (status) {
    this.status = status;
  }
  if (status === "running" && !this.startedAt) {
    this.startedAt = new Date();
  }
  if (
    ["completed", "failed", "cancelled"].includes(status) &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }
  return await this.save();
};

// Instance method to mark as failed
scrapingJobSchema.methods.markFailed = async function (error) {
  this.status = "failed";
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
  };
  this.completedAt = new Date();
  return await this.save();
};

// Instance method to mark as completed
scrapingJobSchema.methods.markCompleted = async function (results = {}) {
  this.status = "completed";
  this.progress = 100;
  this.completedAt = new Date();
  if (Object.keys(results).length > 0) {
    this.results = { ...this.results.toObject(), ...results };
  }
  return await this.save();
};

const ScrapingJob = mongoose.model("ScrapingJob", scrapingJobSchema);

module.exports = ScrapingJob;
