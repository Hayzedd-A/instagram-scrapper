const crypto = require("crypto");
const SearchResult = require("../models/SearchResult");
const Profile = require("../models/Profile");
const apifyService = require("../services/apify.service");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * Create Instagram search job for content creators
 */
const createSearchJob = asyncHandler(async (req, res) => {
  const {
    searchTerm,
    recencyDays = 30,
    minViews = 0,
    minFollowers = 0,
    profile = {},
    limit = 100,
  } = req.body;

  // Create search job
  const jobId = crypto.randomUUID();

  const searchJob = new SearchResult({
    jobId,
    searchCriteria: {
      searchTerm,
      recencyDays,
      minViews,
      minFollowers,
      limit,
      profile: {
        recencyPost: profile.recencyPost || null,
      },
    },
    status: "PROCESSING",
  });

  await searchJob.save();

  // Start search processing asynchronously
  processSearchAsync(
    jobId,
    searchTerm,
    recencyDays,
    minViews,
    minFollowers,
    profile,
    limit,
  );

  res.status(202).json({
    jobId,
    status: "PROCESSING",
  });
});

/**
 * Async function to process Instagram search
 */
async function processSearchAsync(
  jobId,
  searchTerm,
  recencyDays,
  minViews,
  minFollowers,
  profile,
  limit,
) {
  try {
    const job = await SearchResult.findOne({ jobId });

    logger.info(`Processing search job: ${jobId} for term: ${searchTerm}`);

    // Scrape hashtag posts
    const result = await apifyService.scrapeHashtag(searchTerm, limit); // Get more to filter

    logger.info(
      `Scraped ${result.data.length} posts for search: ${searchTerm}`,
    );
    console.log("result.data", JSON.stringify(result.data));

    // Calculate recency cutoff date
    const recencyCutoff = new Date();
    recencyCutoff.setDate(recencyCutoff.getDate() - recencyDays);

    // Filter posts based on criteria
    let filteredPosts = result.data.filter((post) => {
      // Check recency
      const postDate = post.timestamp || new Date();
      if (postDate < recencyCutoff) return false;

      // Check min views (for videos)
      if (minViews > 0 && post.isVideo) {
        if ((post.videoViewCount || 0) < minViews) return false;
      }

      return true;
    });
    console.log("filteredPosts", JSON.stringify(filteredPosts));

    // Get unique owner usernames for follower filtering
    const ownerUsernames = [
      ...new Set(filteredPosts.map((post) => post.ownerUsername)),
    ];

    // Fetch profiles for follower count (if minFollowers specified)
    const profileFollowerCounts = {};
    if (minFollowers > 0) {
      for (const username of ownerUsernames) {
        try {
          // Check if we have profile in DB
          let profileData = await Profile.findOne({ username });

          // If not, scrape it
          if (!profileData) {
            const profileResult = await apifyService.scrapeProfile(username);
            profileData = await Profile.findOneAndUpdate(
              { username: profileResult.data.username },
              profileResult.data,
              { upsert: true, new: true },
            );
          }

          profileFollowerCounts[username] = profileData.followersCount || 0;
        } catch (error) {
          logger.warn(`Failed to get profile for ${username}:`, error.message);
          profileFollowerCounts[username] = 0;
        }
      }

      // Filter by followers
      filteredPosts = filteredPosts.filter((post) => {
        const followerCount = profileFollowerCounts[post.ownerUsername] || 0;
        return followerCount >= minFollowers;
      });
    }

    // Filter by profile recency if specified
    if (profile.recencyPost) {
      const profileRecencyCutoff = new Date();
      profileRecencyCutoff.setDate(
        profileRecencyCutoff.getDate() - profile.recencyPost,
      );

      filteredPosts = filteredPosts.filter((post) => {
        const postDate = post.timestamp || new Date();
        return postDate >= profileRecencyCutoff;
      });
    }
    console.log("filteredPosts2", JSON.stringify(filteredPosts));

    // Prepare results with all necessary data
    const results = filteredPosts.map((post) => ({
      postId: post.postId,
      shortCode: post.shortCode,
      url: post.url,
      caption: post.caption,
      ownerUsername: post.ownerUsername,
      ownerFullName: post.ownerFullName,
      ownerFollowers: profileFollowerCounts[post.ownerUsername] || 0,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.videoViewCount || 0,
      timestamp: post.timestamp,
      type: post.type,
      displayUrl: post.displayUrl,
      hashtags: post.hashtags,
      mentions: post.mentions,
    }));
    console.log("results", JSON.stringify(results));

    // Update job with results
    job.status = "SUCCESS";
    job.results = results;
    job.totalResults = result.data.length;
    job.filteredResults = results.length;
    job.completedAt = new Date();
    await job.save();

    logger.info(
      `Search job completed: ${jobId}, filtered ${results.length}/${result.data.length} posts`,
    );
  } catch (error) {
    logger.error(`Search job failed: ${jobId}`, error);

    const job = await SearchResult.findOne({ jobId });
    job.status = "FAILED";
    job.error = {
      message: error.message,
      timestamp: new Date(),
    };
    job.completedAt = new Date();
    await job.save();
  }
}

/**
 * Get search job status and results
 */
const getSearchJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await SearchResult.findOne({ jobId }).select("-__v");

  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Job not found: ${jobId}`,
      },
    });
  }

  // If still processing
  if (job.status === "PROCESSING") {
    return res.json({
      status: "PROCESSING",
      searchCriteria: job.searchCriteria,
      createdAt: job.createdAt,
    });
  }

  // If failed
  if (job.status === "FAILED") {
    return res.json({
      status: "FAILED",
      error: job.error,
      searchCriteria: job.searchCriteria,
    });
  }

  // If success
  res.json({
    status: "SUCCESS",
    data: job.results,
    metadata: {
      totalResults: job.totalResults,
      filteredResults: job.filteredResults,
      searchCriteria: job.searchCriteria,
      completedAt: job.completedAt,
    },
  });
});

module.exports = {
  createSearchJob,
  getSearchJobStatus,
};
