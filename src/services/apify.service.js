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
   * @param {string} username
   * @returns {Promise<object>}
   */
  async scrapeProfile(username) {
    if (!this.isConfigured()) {
      throw new Error(
        "Apify is not configured. Please set APIFY_TOKEN in environment variables.",
      );
    }

    logger.info(`Scraping profile: ${username}`);

    try {
      const run = await retryWithBackoff(async () => {
        return await this.client.actor(config.apify.scraperActorId).call(
          {
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsType: "profiles",
            resultsLimit: 1,
            searchType: "user",
            searchLimit: 1,
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

      if (!items || items.length === 0) {
        throw new Error(`Profile not found: ${username}`);
      }

      const profileData = normalizeProfileData(items[0]);

      logger.info(`Successfully scraped profile: ${username}`);
      return {
        runId: run.id,
        data: profileData,
      };
    } catch (error) {
      logger.error(`Error scraping profile ${username}:`, error);
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
        return await this.client.actor(config.apify.scraperActorId).call(
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

      console.log("Raw Items:", JSON.stringify(items, null, 2));

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
}

// Export singleton instance
module.exports = new ApifyService();
