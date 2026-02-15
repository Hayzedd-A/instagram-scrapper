const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
      index: true,
    },
    ownerUsername: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    ownerFullName: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["Image", "Video", "Sidecar", "Igtv", "Reel"],
      default: "Image",
    },
    url: {
      type: String,
      required: true,
    },
    displayUrl: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    location: {
      name: String,
      id: String,
      slug: String,
    },
    hashtags: [
      {
        type: String,
      },
    ],
    mentions: [
      {
        type: String,
      },
    ],
    isVideo: {
      type: Boolean,
      default: false,
    },
    videoUrl: {
      type: String,
      default: "",
    },
    videoDuration: {
      type: Number,
      default: 0,
    },
    videoViewCount: {
      type: Number,
      default: 0,
    },
    childPosts: [
      {
        type: String,
        displayUrl: String,
        isVideo: Boolean,
        videoUrl: String,
      },
    ],
    scrapedAt: {
      type: Date,
      default: Date.now,
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

// Indexes for searching and filtering
postSchema.index({ ownerUsername: 1, timestamp: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ timestamp: -1 });
postSchema.index({ caption: "text" });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
