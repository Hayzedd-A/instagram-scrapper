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
      maxFollowers: {
        type: Number,
        default: 0,
      },
      profile: {
        recencyPost: {
          type: Number,
          default: null,
        },
        multiplier: {
          type: Number,
          default: 1,
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
        inputUrl: String,
        videoUrl: String,
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
        firstComment: String,
        latestComments: [String],
        rawLatestComments: [Object],
        images: [String],
        musicInfo: Object,
        productType: String,
        igPlayCount: Number,
        transcript: String,
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
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: { expires: "2d" }, // '2d' = 2 days
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
