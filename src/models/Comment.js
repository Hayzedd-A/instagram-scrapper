const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    commentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    postId: {
      type: String,
      required: true,
      index: true,
    },
    postShortCode: {
      type: String,
      required: true,
    },
    ownerUsername: {
      type: String,
      required: true,
      lowercase: true,
    },
    ownerFullName: {
      type: String,
      default: "",
    },
    ownerProfilePicUrl: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
    parentCommentId: {
      type: String,
      default: null,
    },
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

// Indexes for efficient querying
commentSchema.index({ postId: 1, timestamp: -1 });
commentSchema.index({ ownerUsername: 1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ text: "text" });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
