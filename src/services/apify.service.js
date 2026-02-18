const { ApifyClient } = require("apify-client");
const config = require("../config");
const logger = require("../utils/logger");
const {
  normalizeProfileData,
  normalizePostData,
  normalizeCommentData,
  retryWithBackoff,
} = require("../utils/scraper.utils");

/**
 * Apify Service for Instagram scraping
 */
class ApifyService {
  constructor() {
    if (!config.apify.token) {
      logger.warn(
        "Apify token not configured. Scraping functionality will not work.",
      );
      this.client = null;
    } else {
      this.client = new ApifyClient({
        token: config.apify.token,
      });
    }
  }

  /**
   * Check if Apify is configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.client !== null;
  }

  /**
   * Get actor run status
   * @param {string} runId
   * @returns {Promise<object>}
   */
  async getRunStatus(runId) {
    if (!this.isConfigured()) {
      throw new Error("Apify is not configured");
    }

    try {
      const run = await this.client.run(runId).get();
      return {
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        stats: run.stats,
      };
    } catch (error) {
      logger.error("Error getting run status:", error);
      throw error;
    }
  }

  /**
   * Scrape Instagram profile
   * @param {string} usernames
   * @returns {Promise<object>}
   */
  async scrapeProfile(usernames) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    logger.info(`Scraping profile details: ${usernames}`);

    const input = {
      usernames: [...usernames],
      includeTranscript: true,
      resultsLimit: 1,
    };

    console.log("Profile Actor Input:", JSON.stringify(input, null, 2));

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client
          .actor(config.apify.profileActorId)
          .call(input, {
            memory: config.apify.memoryMbytes,
            timeout: config.apify.timeoutSecs,
          });
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      logger.info(`Profile Raw Items: ${JSON.stringify(items)}`);

      if (!items || items.length === 0) {
        throw new Error(`Profile not found: ${usernames}`);
      }

      const profileData = items.map(normalizeProfileData);

      logger.info(`Successfully scraped profile: ${usernames}`);
      return {
        runId: run.id,
        data: profileData,
      };
    } catch (error) {
      logger.error(`Error scraping profile ${usernames}:`, error);
      throw error;
    }
  }

  /**
   * Scrape posts from Instagram profile
   * @param {string} username
   * @param {number} limit
   * @returns {Promise<object>}
   */
  async scrapePosts(username, limit = 50) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    logger.info(`Scraping posts from profile: ${username}, limit: ${limit}`);

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client.actor(config.apify.profilePostActorId).call(
          {
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsType: "posts",
            resultsLimit: limit,
            searchType: "user",
            addParentData: true,
          },
          {
            memory: config.apify.memoryMbytes,
            timeout: config.apify.timeoutSecs,
          },
        );
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      console.log("Raw Items:", JSON.stringify(items[0]));

      const posts = items.map((item) => normalizePostData(item));

      logger.info(
        `Successfully scraped ${posts.length} posts from: ${username}`,
      );
      return {
        runId: run.id,
        data: posts,
      };
    } catch (error) {
      logger.error(`Error scraping posts from ${username}:`, error);
      throw error;
    }
  }

  /**
   * Scrape posts by hashtag
   * @param {string} hashtag
   * @param {number} limit
   * @returns {Promise<object>}
   */
  async scrapeHashtag(hashtag, limit = 50) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    // Remove # if present
    const cleanHashtag = hashtag.startsWith("#")
      ? hashtag.substring(1)
      : hashtag;

    logger.info(`Scraping hashtag: #${cleanHashtag}, limit: ${limit}`);

    const input = {
      hashtags: [cleanHashtag],
      resultsType: "reels",
      resultsLimit: limit,
    };

    console.log("Actor Input:", JSON.stringify(input, null, 2));

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client
          .actor(config.apify.scraperActorId)
          .call(input, {
            memory: config.apify.memoryMbytes,
            timeout: config.apify.timeoutSecs,
          });
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      // console.log("Raw Items:", JSON.stringify(items, null, 2));

      if (items.length > 0 && items[0].error) {
        throw new Error(
          `Apify Error: ${items[0].errorDescription || items[0].error}`,
        );
      }

      const posts = items
        .filter((item) => !item.error && (item.id || item.shortCode))
        .map((item) => normalizePostData(item));

      logger.info(
        `Successfully scraped ${posts.length} posts from hashtag: #${cleanHashtag}`,
      );
      return {
        runId: run.id,
        data: posts,
        hashtag: cleanHashtag,
      };
    } catch (error) {
      logger.error(`Error scraping hashtag #${cleanHashtag}:`, error);
      throw error;
    }
  }

  async scrapeProfileReels(usernames) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    logger.info(
      `Scraping profile reel and transcript posts from: ${usernames}`,
    );

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client.actor(config.apify.profilePostActorId).call(
          {
            username: [...usernames],
            includeTranscripts: true,
          },
          {
            memory: config.apify.memoryMbytes,
            timeout: config.apify.timeoutSecs,
          },
        );
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      logger.info(`Profile Reel Raw Items: ${JSON.stringify(items)}`);

      const posts = items.map((item) => normalizePostData(item));

      logger.info(
        `Successfully scraped ${posts.length} posts from: ${usernames}`,
      );
      return {
        runId: run.id,
        data: posts,
      };
    } catch (error) {
      logger.error(`Error scraping posts from ${usernames}:`, error);
      throw error;
    }
  }

  /**
   * Scrape comments from a post
   * @param {string} postUrl
   * @param {number} limit
   * @returns {Promise<object>}
   */
  async scrapeComments(postUrl, limit = 50) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    logger.info(`Scraping comments from post: ${postUrl}, limit: ${limit}`);

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client.actor(config.apify.scraperActorId).call(
          {
            directUrls: [postUrl],
            resultsType: "comments",
            resultsLimit: limit,
          },
          {
            memory: config.apify.memoryMbytes,
            timeout: config.apify.timeoutSecs,
          },
        );
      });

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      // Extract post ID and shortcode from URL
      const shortCodeMatch = postUrl.match(/\/p\/([^\/]+)/);
      const shortCode = shortCodeMatch ? shortCodeMatch[1] : "";

      const comments = items.map((item) =>
        normalizeCommentData(item, item.postId || "", shortCode),
      );

      logger.info(`Successfully scraped ${comments.length} comments from post`);
      return {
        runId: run.id,
        data: comments,
      };
    } catch (error) {
      logger.error(`Error scraping comments from ${postUrl}:`, error);
      throw error;
    }
  }

  /**
   * Wait for a run to complete
   * @param {string} runId
   * @param {number} timeoutSecs
   * @returns {Promise<object>}
   */
  async waitForRun(runId, timeoutSecs = 300) {
    if (!this.isConfigured()) {
      throw new Error("Apify is not configured");
    }

    try {
      const run = await this.client.run(runId).waitForFinish({
        waitSecs: timeoutSecs,
      });

      return run;
    } catch (error) {
      logger.error(`Error waiting for run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Abort a running actor
   * @param {string} runId
   * @returns {Promise<object>}
   */
  async abortRun(runId) {
    if (!this.isConfigured()) {
      throw new Error("Apify is not configured");
    }

    try {
      const run = await this.client.run(runId).abort();
      logger.info(`Aborted run: ${runId}`);
      return run;
    } catch (error) {
      logger.error(`Error aborting run ${runId}:`, error);
      throw error;
    }
  }
  /**
   * Scrape reels from a profile and their transcripts
   * @param {string} username
   * @param {number} limit
   * @returns {Promise<object>}
   */
  // async scrapeProfileReels(username, limit = 10) {
  //   if (!this.isConfigured()) {
  //     throw new Error(
  //       "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
  //     );
  //   }

  //   logger.info(
  //     `Scraping reels and transcripts for profile: ${username}, limit: ${limit}`,
  //   );

  //   try {
  //     // 1. Scrape Reels (Posts)
  //     // Using the same actor as scrapePosts but specifically for reels if possible,
  //     // or just scrape posts and filter. The profile-post-scraper creates a list of posts.
  //     // We'll use the existing scrapePosts for this step.
  //     const postsResult = await this.scrapePosts(username, limit);
  //     let posts = postsResult.data;

  //     // Filter for videos/reels only
  //     posts = posts.filter(
  //       (post) =>
  //         post.isVideo ||
  //         post.type === "Video" ||
  //         post.type === "Reel" ||
  //         post.productType === "clips",
  //     );

  //     if (posts.length === 0) {
  //       return {
  //         runId: postsResult.runId,
  //         data: [],
  //       };
  //     }

  //     // 2. Scrape Transcripts
  //     // Extract URLs for transcript scraping
  //     const postUrls = posts.map((post) => post.url);

  //     // We need to batch transcript scraping if there are many URLs
  //     // The transcript actor might have limits, but let's try sending all for now or batch if needed.
  //     // Assuming scrapeTranscript handles arrays.
  //     const transcriptResult = await this.scrapeTranscript(postUrls);
  //     const transcripts = transcriptResult.data; // These are normalized posts with transcripts

  //     // 3. Merge Transcript Data
  //     // Create a map of url -> transcript text
  //     const transcriptMap = {};
  //     transcripts.forEach((item) => {
  //       // The normalized data from transcript scraper might put transcript in specific field
  //       // Let's assume the actor returns it and we mapped it.
  //       // Wait, normalizePostData doesn't seem to explicitly handle 'transcript' field from the transcript actor result
  //       // if it's not standard.
  //       // I should check what scrapeTranscript returns. It maps existing items using normalizePostData.
  //       // I'll assume 'transcript' or 'text' is available.
  //       // If normalizePostData doesn't include 'transcript', I might need to update it or manually handle it here.
  //       // Looking at instruction.txt, the sample response has "transcript": "Ever since I was a kid..."
  //       // So I'll assume I need to attach it.
  //       if (item.transcript || item.text) {
  //         transcriptMap[item.url] = item.transcript || item.text;
  //       }
  //     });

  //     // Update posts with transcript
  //     const mergedPosts = posts.map((post) => {
  //       return {
  //         ...post,
  //         transcript: transcriptMap[post.url] || "",
  //       };
  //     });

  //     return {
  //       runId: postsResult.runId, // Returning the runId of the post scrape
  //       data: mergedPosts,
  //     };
  //   } catch (error) {
  //     logger.error(
  //       `Error scraping profile reels for ${username}:`,
  //       error.message,
  //     );
  //     // Don't fail the whole process if reels fail, maybe just return empty or throw depending on requirement.
  //     // For now, rethrow to be handled by caller
  //     throw error;
  //   }
  // }
}

// Export singleton instance
module.exports = new ApifyService();
