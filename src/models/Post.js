const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      index: true,
    },
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
    ownerFollowers: {
      type: Number,
      default: 0,
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
    viewsCount: {
      type: Number,
      default: 0,
    },
    playCount: {
      type: Number,
      default: 0,
    },
    igPlayCount: {
      type: Number,
      default: 0,
    },
    firstComment: {
      type: String,
      default: "",
    },
    images: [
      {
        type: String,
        default: "",
      },
    ],
    childPosts: [
      {
        type: String,
        displayUrl: String,
        isVideo: Boolean,
        videoUrl: String,
      },
    ],
    musicInfo: {
      type: Object,
      default: {},
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    transcript: {
      type: String,
      default: "",
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

// Indexes for searching and filtering
postSchema.index({ ownerUsername: 1, timestamp: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ timestamp: -1 });
postSchema.index({ caption: "text" });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
