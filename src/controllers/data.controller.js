const Profile = require("../models/Profile");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const cache = require("../utils/cache");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * Get all profiles with pagination
 */
const getProfiles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const cacheKey = `profiles_page_${page}_limit_${limit}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return res.json({
      success: true,
      data: cached.profiles,
      pagination: cached.pagination,
      cached: true,
    });
  }

  const totalProfiles = await Profile.countDocuments();
  const profiles = await Profile.find()
    .sort({ lastUpdated: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  const pagination = {
    page,
    limit,
    total: totalProfiles,
    pages: Math.ceil(totalProfiles / limit),
  };

  const result = { profiles, pagination };
  cache.set(cacheKey, result, 300); // Cache for 5 minutes

  res.json({
    success: true,
    data: profiles,
    pagination,
  });
});

/**
 * Get profile by username
 */
const getProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const cacheKey = `profile_${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return res.json({
      success: true,
      data: cached,
      cached: true,
    });
  }

  const profile = await Profile.findOne({
    username: username.toLowerCase(),
  }).select("-__v");

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Profile not found: ${username}`,
      },
    });
  }

  cache.set(cacheKey, profile, 600); // Cache for 10 minutes

  res.json({
    success: true,
    data: profile,
  });
});

/**
 * Get all posts with pagination and filtering
 */
const getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const { username, hashtag, type } = req.query;

  // Build query
  const query = {};
  if (username) query.ownerUsername = username.toLowerCase();
  if (hashtag) query.hashtags = hashtag.toLowerCase();
  if (type) query.type = type;

  const totalPosts = await Post.countDocuments(query);
  const posts = await Post.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  const pagination = {
    page,
    limit,
    total: totalPosts,
    pages: Math.ceil(totalPosts / limit),
  };

  res.json({
    success: true,
    data: posts,
    pagination,
  });
});

/**
 * Get post by ID
 */
const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id).select("-__v");

  if (!post) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Post not found: ${id}`,
      },
    });
  }

  res.json({
    success: true,
    data: post,
  });
});

/**
 * Get comments for a post
 */
const getCommentsByPostId = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const totalComments = await Comment.countDocuments({ postId });
  const comments = await Comment.find({ postId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  const pagination = {
    page,
    limit,
    total: totalComments,
    pages: Math.ceil(totalComments / limit),
  };

  res.json({
    success: true,
    data: comments,
    pagination,
  });
});

module.exports = {
  getProfiles,
  getProfileByUsername,
  getPosts,
  getPostById,
  getCommentsByPostId,
};
