const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    biography: {
      type: String,
      default: "",
    },
    profilePicUrl: {
      type: String,
      default: "",
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isBusiness: {
      type: Boolean,
      default: false,
    },
    externalUrl: {
      type: String,
      default: "",
    },
    igtvVideoCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      default: "",
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

// Index for searching
profileSchema.index({ username: "text", fullName: "text" });

// Update lastUpdated on save
profileSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

const Profile = mongoose.model("Profile", profileSchema);

module.exports = Profile;
