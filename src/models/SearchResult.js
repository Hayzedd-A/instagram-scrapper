const mongoose = require("mongoose");

const searchResultSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    searchCriteria: {
      searchTerm: {
        type: String,
        required: true,
      },
      recencyDays: {
        type: Number,
        default: 30,
      },
      minViews: {
        type: Number,
        default: 0,
      },
      minFollowers: {
        type: Number,
        default: 0,
      },
      profile: {
        recencyPost: {
          type: Number,
          default: null,
        },
      },
    },
    status: {
      type: String,
      enum: ["PROCESSING", "SUCCESS", "FAILED"],
      default: "PROCESSING",
      index: true,
    },
    apifyRunId: {
      type: String,
      default: null,
    },
    results: [
      {
        postId: String,
        shortCode: String,
        url: String,
        caption: String,
        ownerUsername: String,
        ownerFullName: String,
        ownerFollowers: Number,
        likesCount: Number,
        commentsCount: Number,
        viewsCount: Number,
        timestamp: Date,
        type: { type: String },
        displayUrl: String,
        hashtags: [String],
        mentions: [String],
      },
    ],
    totalResults: {
      type: Number,
      default: 0,
    },
    filteredResults: {
      type: Number,
      default: 0,
    },
    error: {
      message: String,
      timestamp: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for querying
searchResultSchema.index({ jobId: 1, status: 1 });
searchResultSchema.index({ "searchCriteria.searchTerm": 1 });

const SearchResult = mongoose.model("SearchResult", searchResultSchema);

module.exports = SearchResult;
