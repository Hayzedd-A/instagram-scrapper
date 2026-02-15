const crypto = require("crypto");
const apifyService = require("../services/apify.service");
const Profile = require("../models/Profile");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const ScrapingJob = require("../models/ScrapingJob");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * Scrape Instagram profile
 */
const scrapeProfile = asyncHandler(async (req, res) => {
  const { username } = req.body;

  // Create scraping job
  const job = new ScrapingJob({
    jobId: crypto.randomUUID(),
    type: "profile",
    target: username,
    status: "pending",
    input: { username },
  });

  await job.save();

  // Start scraping asynchronously
  scrapeProfileAsync(job._id, username);

  res.status(202).json({
    success: true,
    message: "Profile scraping job started",
    data: {
      jobId: job.jobId,
      _id: job._id,
      status: job.status,
      type: job.type,
      target: job.target,
    },
  });
});

/**
 * Async function to scrape profile
 */
async function scrapeProfileAsync(jobId, username) {
  const job = await ScrapingJob.findById(jobId);

  try {
    await job.updateProgress(10, "running");

    const result = await apifyService.scrapeProfile(username);

    await job.updateProgress(70);

    // Save to database
    const profile = await Profile.findOneAndUpdate(
      { username: result.data.username },
      result.data,
      { upsert: true, new: true },
    );

    await job.markCompleted({
      itemsScraped: 1,
      itemsSaved: 1,
      details: { profileId: profile._id },
    });

    logger.info(`Profile scraping job completed: ${username}`);
  } catch (error) {
    await job.markFailed(error);
    logger.error(`Profile scraping job failed: ${username}`, error);
  }
}

/**
 * Scrape posts from profile
 */
const scrapePosts = asyncHandler(async (req, res) => {
  const { username, limit = 50 } = req.body;

  const job = new ScrapingJob({
    jobId: crypto.randomUUID(),
    type: "posts",
    target: username,
    status: "pending",
    input: { username, limit },
  });

  await job.save();

  // Start scraping asynchronously
  scrapePostsAsync(job._id, username, limit);

  res.status(202).json({
    success: true,
    message: "Posts scraping job started",
    data: {
      jobId: job.jobId,
      _id: job._id,
      status: job.status,
      type: job.type,
      target: job.target,
    },
  });
});

/**
 * Async function to scrape posts
 */
async function scrapePostsAsync(jobId, username, limit) {
  const job = await ScrapingJob.findById(jobId);

  try {
    await job.updateProgress(10, "running");

    const result = await apifyService.scrapePosts(username, limit);

    await job.updateProgress(70);

    // Save posts to database
    const savedPosts = [];
    for (const postData of result.data) {
      const post = await Post.findOneAndUpdate(
        { postId: postData.postId },
        postData,
        { upsert: true, new: true },
      );
      savedPosts.push(post);
    }

    await job.markCompleted({
      itemsScraped: result.data.length,
      itemsSaved: savedPosts.length,
      details: { postIds: savedPosts.map((p) => p._id) },
    });

    logger.info(
      `Posts scraping job completed: ${username}, scraped ${savedPosts.length} posts`,
    );
  } catch (error) {
    await job.markFailed(error);
    logger.error(`Posts scraping job failed: ${username}`, error);
  }
}

/**
 * Scrape posts by hashtag
 */
const scrapeHashtag = asyncHandler(async (req, res) => {
  const { hashtag, limit = 50 } = req.body;

  const cleanHashtag = hashtag.startsWith("#") ? hashtag.substring(1) : hashtag;

  const job = new ScrapingJob({
    jobId: crypto.randomUUID(),
    type: "hashtag",
    target: cleanHashtag,
    status: "pending",
    input: { hashtag: cleanHashtag, limit },
  });

  await job.save();

  // Start scraping asynchronously
  scrapeHashtagAsync(job._id, cleanHashtag, limit);

  res.status(202).json({
    success: true,
    message: "Hashtag scraping job started",
    data: {
      jobId: job.jobId,
      _id: job._id,
      status: job.status,
      type: job.type,
      target: job.target,
    },
  });
});

/**
 * Async function to scrape hashtag
 */
async function scrapeHashtagAsync(jobId, hashtag, limit) {
  const job = await ScrapingJob.findById(jobId);

  try {
    await job.updateProgress(10, "running");

    const result = await apifyService.scrapeHashtag(hashtag, limit);

    await job.updateProgress(70);

    // Save posts to database
    const savedPosts = [];
    for (const postData of result.data) {
      const post = await Post.findOneAndUpdate(
        { postId: postData.postId },
        postData,
        { upsert: true, new: true },
      );
      savedPosts.push(post);
    }

    await job.markCompleted({
      itemsScraped: result.data.length,
      itemsSaved: savedPosts.length,
      details: {
        hashtag: result.hashtag,
        postIds: savedPosts.map((p) => p._id),
      },
    });

    logger.info(
      `Hashtag scraping job completed: #${hashtag}, scraped ${savedPosts.length} posts`,
    );
  } catch (error) {
    await job.markFailed(error);
    logger.error(`Hashtag scraping job failed: #${hashtag}`, error);
  }
}

/**
 * Scrape comments from post
 */
const scrapeComments = asyncHandler(async (req, res) => {
  const { postUrl, limit = 50 } = req.body;

  const job = new ScrapingJob({
    jobId: uuidv4(),
    type: "comments",
    target: postUrl,
    status: "pending",
    input: { postUrl, limit },
  });

  await job.save();

  // Start scraping asynchronously
  scrapeCommentsAsync(job._id, postUrl, limit);

  res.status(202).json({
    success: true,
    message: "Comments scraping job started",
    data: {
      jobId: job.jobId,
      _id: job._id,
      status: job.status,
      type: job.type,
      target: job.target,
    },
  });
});

/**
 * Async function to scrape comments
 */
async function scrapeCommentsAsync(jobId, postUrl, limit) {
  const job = await ScrapingJob.findById(jobId);

  try {
    await job.updateProgress(10, "running");

    const result = await apifyService.scrapeComments(postUrl, limit);

    await job.updateProgress(70);

    // Save comments to database
    const savedComments = [];
    for (const commentData of result.data) {
      const comment = await Comment.findOneAndUpdate(
        { commentId: commentData.commentId },
        commentData,
        { upsert: true, new: true },
      );
      savedComments.push(comment);
    }

    await job.markCompleted({
      itemsScraped: result.data.length,
      itemsSaved: savedComments.length,
      details: { postUrl, commentIds: savedComments.map((c) => c._id) },
    });

    logger.info(
      `Comments scraping job completed for ${postUrl}, scraped ${savedComments.length} comments`,
    );
  } catch (error) {
    await job.markFailed(error);
    logger.error(`Comments scraping job failed for ${postUrl}`, error);
  }
}

module.exports = {
  scrapeProfile,
  scrapePosts,
  scrapeHashtag,
  scrapeComments,
};
