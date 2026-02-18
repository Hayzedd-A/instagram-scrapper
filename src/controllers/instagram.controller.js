const crypto = require("crypto");
const SearchResult = require("../models/SearchResult");
const Profile = require("../models/Profile");
const apifyService = require("../services/apify.service");
const logger = require("../utils/logger");
const { asyncHandler } = require("../middleware/errorHandler");
const { filterEnglishCaptions } = require("../utils/index.utils");
const Post = require("../models/Post");

/**
 * Create Instagram search job for content creators
 */
const createSearchJob = asyncHandler(async (req, res) => {
  const {
    searchTerm,
    recencyDays = 30,
    minViews = 0,
    maxFollowers = 0,
    profile = {},
    limit = 20, // Reduced default limit due to heavy downstream scraping
  } = req.body;

  // Create search job
  const jobId = crypto.randomUUID();

  const searchJob = new SearchResult({
    jobId,
    searchCriteria: {
      searchTerm,
      recencyDays,
      minViews,
      maxFollowers,
      limit,
      profile: {
        multiplier: profile.multiplier || 1,
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
    maxFollowers,
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
  maxFollowers,
  limit,
) {
  try {
    const job = await SearchResult.findOne({ jobId });

    // 1. Hashtag Search (get as many as possible to filter)
    // The instruction says "Maybe about 5000 or more", but we should respect the limit pass/config or use a high default for this step
    // We'll use a larger limit for the initial scrape to ensure we have enough after filtering
    const initialScrapeLimit = Math.max(limit * 50, 5000); // Scrape more to filter down

    logger.info(
      `Step 1: Scraping hashtag: #${searchTerm}, limit: ${initialScrapeLimit}`,
    );
    const result = await apifyService.scrapeHashtag(
      searchTerm,
      initialScrapeLimit,
    );
    job.apifyRunId = result.runId;
    await job.save();

    logger.info(
      `Scraped ${result.data.length} posts for search: ${searchTerm}`,
    );

    // 2. Initial Filter
    // Filter by: recencyDays, minViews, isCaptionEnglish, videoDuration > 55s
    const recencyCutoff = new Date();
    recencyCutoff.setDate(recencyCutoff.getDate() - recencyDays);

    let filteredPosts = result.data.filter((post) => {
      post.isVideo = !!post.videoUrl || post.type?.toLowerCase() === "video";
      // Check recency
      const postDate = post.timestamp ? new Date(post.timestamp) : new Date();
      // console.log({
      //   filters: {
      //     recencyDays: postDate < recencyCutoff,
      //     minViews: post.videoPlayCount || post.videoViewCount || 0 < minViews,
      //     maxFollowers: post.ownerFollowersCount < maxFollowers,
      //     videoDuration: post.videoDuration < 55,
      //     isEnglish: filterEnglishCaptions(post),
      //     caption: post.caption,
      //   },
      // });
      if (postDate < recencyCutoff) return false;

      // Check min views (for videos)
      if (minViews > 0) {
        const views = post.videoPlayCount || post.videoViewCount || 0;
        if (views < minViews) return false;
      }

      // Check video duration > 55s (only for videos)
      // Instruction says: "videoDuration > 55s"
      // We should check if it is a video first
      if (post.isVideo) {
        if ((post.videoDuration || 0) < 55) return false;
      } else {
        // If it's not a video, do we keep it?
        // The instruction implies we are looking for reels/videos ("minViews", "videoDuration").
        // It says "filter them by ... videoDuration > 55s".
        // If it's an image, it doesn't have duration.
        // Assuming we only want videos/reels based on the context of "viral reels".
        return false;
      }

      if (!filterEnglishCaptions(post)) return false;

      return true;
    });

    // Check English Caption

    logger.info(
      `Step 2: Filtered down to ${filteredPosts.length} posts based on criteria`,
    );

    // 3. Save filtered posts to database
    if (filteredPosts.length > 0) {
      const bulkOps = filteredPosts.map((post) => ({
        updateOne: {
          filter: { postId: post.postId },
          update: { $set: post },
          upsert: true,
        },
      }));
      await Post.bulkWrite(bulkOps);
    }

    // 5. Fetch Profile Data (scrapeProfile)
    const uniqueUsernames = [
      ...new Set(filteredPosts.map((p) => p.ownerUsername)),
    ];
    logger.info(
      `Step 5: Scraping profiles for ${uniqueUsernames.length} users`,
    );

    const validProfiles = [];
    const profileFollowerMap = {};
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Identify which usernames actually need scraping (Missing or Stale)
    const existingProfiles = await Profile.find({
      username: { $in: uniqueUsernames },
    });
    const profileMap = new Map(existingProfiles.map((p) => [p.username, p]));

    const usernamesToScrape = uniqueUsernames.filter((username) => {
      const p = profileMap.get(username);
      return !p || p.lastUpdated < oneDayAgo;
    });

    // 2. Perform the Batch Scrape
    if (usernamesToScrape.length > 0) {
      try {
        const batchResults =
          await apifyService.scrapeProfile(usernamesToScrape);

        // 3. Process and Save the Scraped Data
        const bulkOps = batchResults.data.map((profile) => {
          return {
            updateOne: {
              filter: { username: profile.username },
              update: { ...profile, lastUpdated: new Date() },
              upsert: true,
            },
          };
        });

        if (bulkOps.length > 0) await Profile.bulkWrite(bulkOps);

        // Update our local map with the fresh data
        batchResults.data.forEach((p) => profileMap.set(p.username, p));
      } catch (e) {
        logger.error(`Batch scrape failed: ${e.message}`);
      }
    }

    // 4. Final Filtering (Followers + English check)
    for (const username of uniqueUsernames) {
      const profile = profileMap.get(username);

      if (profile && profile.followersCount <= maxFollowers) {
        validProfiles.push(profile);
      }
    }

    logger.info(
      `Step 6: ${validProfiles.length} profiles passed follower filter`,
    );

    // 7. Fetch Profile Reels (scrapeProfileReels)
    const finalResults = [];

    // 1. Extract all usernames from your validProfiles
    const usernames = validProfiles.map((u) => u.username);

    if (usernames.length > 0) {
      try {
        // 2. Batch Scrape all reels at once
        const reelsResult = await apifyService.scrapeProfileReels(usernames);
        const allScrapedReels = reelsResult.data; // Expecting an array of all posts

        // 3. Perform a massive Bulk Write for all posts across all users
        if (allScrapedReels.length > 0) {
          const postBulkOps = allScrapedReels.map((post) => ({
            updateOne: {
              filter: { postId: post.postId },
              update: { $set: post },
              upsert: true,
            },
          }));

          // One single DB hit for all posts
          await Post.bulkWrite(postBulkOps);
        }

        // 4. Group posts by username for finalResults
        // This part is synchronous and extremely fast
        for (const userProfile of validProfiles) {
          const userPosts = allScrapedReels.filter(
            (post) => post.ownerUsername === userProfile.username,
          );

          finalResults.push({
            profile: userProfile,
            posts: userPosts,
          });
        }
      } catch (e) {
        logger.error(`Batch reels scrape failed: ${e.message}`);
      }
    }

    // for (const userProfile of validProfiles) {
    //   try {
    //     const reelsResult = await apifyService.scrapeProfileReels(
    //       userProfile.username,
    //     );
    //     const reels = reelsResult.data;

    //     // 8. Save profile reels to database
    //     if (reels.length > 0) {
    //       const bulkOps = reels.map((post) => ({
    //         updateOne: {
    //           filter: { postId: post.postId },
    //           update: { $set: post },
    //           upsert: true,
    //         },
    //       }));
    //       await Post.bulkWrite(bulkOps);
    //     }

    //     // We'll attach the reels to the profile result
    //     finalResults.push({
    //       profile: userProfile,
    //       posts: reels,
    //     });
    //   } catch (e) {
    //     logger.error(
    //       `Failed to scrape reels for ${userProfile.username}: ${e.message}`,
    //     );
    //   }
    // }

    // Update job with results
    job.status = "SUCCESS";
    // We store the structured results in the `results` field.
    // Since `results` schema in SearchResult is an array of Post-like objects, this might fail validation
    // if we try to push { profile: ..., posts: ... }.
    // We strictly defined the schema for `results`.
    // We should probably update the `results` schema or use `metadata` field or just store the "inputUrl" as the profile and abuse the schema?
    // No, better to update SearchResult schema?
    // Or, we can just save the jobId in the Posts and Profiles and just specific query them in getStatus.
    //
    // Let's look at SearchResult schema again. `results` is `[ { ...post fields... } ]`.
    // It filters simple objects.
    // I will use `metadata` to store the grouped results or just rely on the controller to group them from the `results` (which are posts).
    // EXCEPT: The instruction says "fetch profile reels... save... return structured grouped".
    // Does it mean return ALL the reels from the profile, or just the ones that matched?
    // "7. fetch profile reels... 8. save... 9. return grouped".
    // This implies we return the reels we just fetched.

    // Attempt: Store strictly the POSTS in `job.results`.
    // And in `getSearchJobStatus`, we fetch those posts, and also fetch their owners (profiles), and group them.
    // This keeps schema valid.

    const allReels = finalResults.flatMap((item) => item.posts);

    // Map to the schema expected by SearchResult.results
    const mappedResults = allReels.map((post) => ({
      postId: post.postId,
      shortCode: post.shortCode,
      url: post.url,
      caption: post.caption,
      ownerUsername: post.ownerUsername,
      ownerFullName: post.ownerFullName,
      // We might need to look up follower count from the map we built
      ownerFollowers: profileFollowerMap[post.ownerUsername] || 0,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      viewsCount: post.videoViewCount || 0,
      timestamp: post.timestamp,
      type: post.type,
      displayUrl: post.displayUrl,
      hashtags: post.hashtags,
      mentions: post.mentions,
      firstComment: post.firstComment,
      rawLatestComments: post.latestComments,
      images: post.images,
      musicInfo: post.musicInfo,
      productType: post.productType,
      igPlayCount: post.igPlayCount,
      inputUrl: post.inputUrl,
      videoUrl: post.videoUrl,
      transcript: post.transcript || "",
      // transcript is not in SearchResult schema yet, but it's in Post schema.
      // We can add it or just leave it out of this summary.
    }));

    job.results = mappedResults;
    job.totalResults = result.data.length; // Initial count
    job.filteredResults = mappedResults.length; // Final count
    job.completedAt = new Date();
    await job.save();

    logger.info(
      `Search job completed: ${jobId}. Found ${validProfiles.length} profiles and ${mappedResults.length} reels.`,
    );
  } catch (error) {
    logger.error(`Search job failed: ${jobId}`, error);

    const job = await SearchResult.findOne({ jobId });
    if (job) {
      job.status = "FAILED";
      job.error = {
        message: error.message,
        timestamp: new Date(),
      };
      job.completedAt = new Date();
      await job.save();
    }
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
  if (job.status === "SUCCESS") {
    const multiplier =
      req.query.multiplier || job.searchCriteria.profile.multiplier;
    const recencyPost =
      req.query.recencyPost || job.searchCriteria.profile.recencyPost;
    // Group results by owner
    const groupedResults = {};

    // Helper to get profile data efficiently - we will fetch from Profile collection
    const uniqueUsernames = [
      ...new Set(job.results.map((r) => r.ownerUsername)),
    ];
    const profiles = await Profile.find({ username: { $in: uniqueUsernames } });
    const profileMap = profiles.reduce((acc, p) => {
      acc[p.username] = p;
      return acc;
    }, {});

    job.results.forEach((post) => {
      if (!groupedResults[post.ownerUsername]) {
        groupedResults[post.ownerUsername] = {
          profile: profileMap[post.ownerUsername] || {
            username: post.ownerUsername,
          },
          posts: [],
        };
      }
      groupedResults[post.ownerUsername].posts.push(post);
    });

    const now = new Date();
    // calculate correct recencypostMonth in date value
    const recencyPostMonth = new Date(
      now.setMonth(now.getMonth() - recencyPost),
    );
    console.log({ recencyPost, recencyPostMonth });
    // Filter each profile posts based on recencyPost and multiplier
    Object.values(groupedResults).forEach((group) => {
      group.posts = group.posts.filter((post) => {
        const postDate = new Date(post.timestamp);
        return postDate >= recencyPostMonth;
      });

      console.log("date filtered", group.posts.length);
      const average =
        group.posts.reduce((acc, post) => acc + post.viewsCount, 0) /
        group.posts.length;

      console.log("average", average);
      group.posts = group.posts.filter((post) => {
        // console.log({
        //   viewCount: post.viewsCount,
        //   multiplierValue: average * multiplier,
        // });
        const multiplierValue = post.viewsCount > average * multiplier;
        return multiplierValue;
      });
      console.log("final filtered", group.posts.length);
    });

    const structuredData = Object.values(groupedResults);
    job.searchCriteria.profile = { multiplier, recencyPost };

    return res.json({
      status: "SUCCESS",
      data: structuredData,
      metadata: {
        totalResults: job.totalResults,
        filteredResults: job.filteredResults,
        searchCriteria: job.searchCriteria,
        completedAt: job.completedAt,
      },
    });
  }
});

const scrapeTranscript = asyncHandler(async (req, res) => {
  const { postUrl } = req.body;

  const result = await apifyService.scrapeTranscript([postUrl]);

  res.json({
    status: "SUCCESS",
    data: result,
  });
});

module.exports = {
  createSearchJob,
  getSearchJobStatus,
  scrapeTranscript,
  processSearchAsync, // Exported for testing
};
