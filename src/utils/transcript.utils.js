// utils/transcript.utils.js

const OpenAITranscriptAnalyzer = require("../services/openAI.service");
const logger = require("./logger");

const TranscriptAnalyzer = new OpenAITranscriptAnalyzer();

/** Sleep helper */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses the retry-after delay (in ms) from an OpenAI rate-limit error message.
 * Falls back to `fallbackMs` if the message cannot be parsed.
 */
const parseRetryDelay = (errorMessage, fallbackMs = 5000) => {
  if (!errorMessage) return fallbackMs;
  // e.g. "Please try again in 1.806s."
  const match = errorMessage.match(/try again in ([\d.]+)s/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000) + 500; // add 500 ms buffer
  }
  return fallbackMs;
};

/**
 * Analyzes a single post transcript with retry logic for rate-limit errors.
 */
const analyzeWithRetry = async (post, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const analysis = await TranscriptAnalyzer.analyzeTranscript(
        post.transcript,
      );

      if (analysis.success) {
        return {
          ...post,
          transcriptHook: analysis.hook,
          transcriptTemplate: analysis.template,
        };
      }

      // Non-retryable failure from the service layer
      return {
        ...post,
        transcriptionError: analysis.error || "Analysis failed",
      };
    } catch (err) {
      const isRateLimit =
        err?.error?.code === "rate_limit_exceeded" ||
        err?.status === 429 ||
        (err?.message || "").toLowerCase().includes("rate limit");

      if (isRateLimit && attempt < maxRetries) {
        const delay = parseRetryDelay(err?.error?.message || err?.message);
        logger.warn(
          `[transcript] Rate limit hit for post ${post.id || "unknown"} – retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
        );
        await sleep(delay);
        continue;
      }

      return {
        ...post,
        transcriptionError: err.message || "Unexpected error during analysis",
      };
    }
  }
};

/**
 * Processes an array of posts, analyzes their transcripts in batches,
 * and returns a new array with transcriptHook and transcriptTemplate included.
 *
 * Batching keeps token consumption within the OpenAI TPM rate limit.
 * A delay of INTER_BATCH_DELAY_MS is inserted between batches.
 */
const processTranscripts = async (posts) => {
  const results = [];
  const MAX_BATCH = 5; // keep concurrent requests low to avoid TPM spikes
  const INTER_BATCH_DELAY_MS = 3000; // 3 s pause between batches

  for (let i = 0; i < posts.length; i += MAX_BATCH) {
    const batch = posts.slice(i, i + MAX_BATCH);

    const batchPromises = batch.map(async (post) => {
      // If there is no transcript, return the post as is
      if (!post.transcript) {
        return { ...post };
      }
      return analyzeWithRetry(post);
    });

    const processedBatch = await Promise.all(batchPromises);
    results.push(...processedBatch);

    // Throttle between batches (skip delay after the last batch)
    if (i + MAX_BATCH < posts.length) {
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }

  return results;
};

module.exports = { processTranscripts };
