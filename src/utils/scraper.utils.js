/**
 * Helper utilities for scraping operations
 */

/**
 * Extract hashtags from text
 * @param {string} text
 * @returns {string[]}
 */
const extractHashtags = (text) => {
  if (!text) return [];
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.substring(1).toLowerCase()) : [];
};

/**
 * Extract mentions from text
 * @param {string} text
 * @returns {string[]}
 */
const extractMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches
    ? matches.map((mention) => mention.substring(1).toLowerCase())
    : [];
};

/**
 * Normalize profile data from Apify
 * @param {object} rawProfile
 * @returns {object}
 */
const normalizeProfileData = (rawProfile) => {
  return {
    username: rawProfile.username?.toLowerCase() || rawProfile.id,
    fullName: rawProfile.fullName || rawProfile.full_name || "",
    biography: rawProfile.biography || rawProfile.bio || "",
    profilePicUrl:
      rawProfile.profilePicUrl ||
      rawProfile.profile_pic_url ||
      rawProfile.profilePictureUrl ||
      "",
    followersCount:
      rawProfile.followersCount ||
      rawProfile.followers_count ||
      rawProfile.followersCountTotal ||
      0,
    followingCount:
      rawProfile.followingCount ||
      rawProfile.following_count ||
      rawProfile.followsCount ||
      0,
    postsCount:
      rawProfile.postsCount ||
      rawProfile.posts_count ||
      rawProfile.mediaCount ||
      0,
    isVerified: rawProfile.verified || rawProfile.is_verified || false,
    isPrivate: rawProfile.private || rawProfile.is_private || false,
    isBusiness:
      rawProfile.businessAccount ||
      rawProfile.is_business_account ||
      rawProfile.isBusiness ||
      false,
    externalUrl: rawProfile.externalUrl || rawProfile.external_url || "",
    igtvVideoCount:
      rawProfile.igtvVideoCount || rawProfile.igtv_video_count || 0,
    category: rawProfile.category || rawProfile.businessCategory || "",
    scrapedAt: new Date(),
  };
};

/**
 * Normalize post data from Apify
 * @param {object} rawPost
 * @returns {object}
 */
const normalizePostData = (rawPost) => {
  const caption =
    rawPost.caption || rawPost.edgeMediaToCaption?.edges?.[0]?.node?.text || "";

  // Handle timestamp with proper validation
  let timestamp;
  if (rawPost.timestamp && !isNaN(rawPost.timestamp)) {
    timestamp = new Date(rawPost.timestamp * 1000);
  } else if (rawPost.takenAtTimestamp && !isNaN(rawPost.takenAtTimestamp)) {
    timestamp = new Date(rawPost.takenAtTimestamp * 1000);
  } else if (rawPost.createdTime && !isNaN(rawPost.createdTime)) {
    timestamp = new Date(rawPost.createdTime * 1000);
  } else {
    // Fallback to current time if no valid timestamp found
    timestamp = new Date();
  }

  // Validate that timestamp is a valid date
  if (isNaN(timestamp.getTime())) {
    timestamp = new Date();
  }

  return {
    postId: rawPost.id,
    shortCode: rawPost.shortCode || rawPost.code,
    ownerUsername:
      rawPost.ownerUsername?.toLowerCase() ||
      rawPost.owner?.username?.toLowerCase() ||
      "",
    ownerFullName: rawPost.ownerFullName || rawPost.owner?.full_name || "",
    caption: caption,
    type: rawPost.type || rawPost.__typename || "Image",
    url:
      rawPost.url ||
      `https://www.instagram.com/p/${rawPost.shortCode || rawPost.code}/`,
    displayUrl:
      rawPost.displayUrl || rawPost.display_url || rawPost.thumbnailUrl || "",
    likesCount:
      rawPost.likesCount ||
      rawPost.likes_count ||
      rawPost.edgeMediaPreviewLike?.count ||
      0,
    commentsCount:
      rawPost.commentsCount ||
      rawPost.comments_count ||
      rawPost.edgeMediaToComment?.count ||
      0,
    timestamp: rawPost.timestamp || timestamp,
    location: rawPost.location
      ? {
          name: rawPost.location.name,
          id: rawPost.location.id,
          slug: rawPost.location.slug,
        }
      : undefined,
    hashtags: extractHashtags(caption),
    mentions: extractMentions(caption),
    firstComment:
      rawPost.firstComment ||
      rawPost.edgeMediaToComment?.edges?.[0]?.node?.text ||
      "",
    latestComments:
      rawPost.latestComments ||
      rawPost.edgeMediaToComment?.edges?.[0]?.node?.text ||
      "",
    images: rawPost.images || rawPost.image_versions || [],
    isVideo:
      rawPost.isVideo ||
      rawPost.is_video ||
      rawPost.type === "Video" ||
      rawPost.__typename === "GraphVideo" ||
      false,
    videoUrl:
      rawPost.videoUrl ||
      rawPost.video_url ||
      rawPost.video_versions?.[0]?.url ||
      "",
    videoDuration:
      rawPost.videoDuration ||
      rawPost.video_duration ||
      rawPost.video_duration_secs ||
      0,
    videoViewCount:
      rawPost.videoViewCount ||
      rawPost.video_view_count ||
      rawPost.videoViewsCount ||
      rawPost.view_count ||
      0,
    videoPlayCount: rawPost.videoPlayCount || rawPost.video_play_count || 0,
    igPlayCount: rawPost.igPlayCount || rawPost.ig_play_count || 0,
    childPosts: rawPost.childPosts || [],
    musicInfo: rawPost.musicInfo || rawPost.music_info || null,
    productType: rawPost.productType || rawPost.product_type || null,
    transcript: rawPost.transcript || rawPost.text || "",
    scrapedAt: new Date(),
  };
};

/**
 * Normalize comment data from Apify
 * @param {object} rawComment
 * @param {string} postId
 * @param {string} postShortCode
 * @returns {object}
 */
const normalizeCommentData = (rawComment, postId, postShortCode) => {
  // Handle timestamp with proper validation
  let timestamp;
  if (rawComment.timestamp && !isNaN(rawComment.timestamp)) {
    timestamp = new Date(rawComment.timestamp * 1000);
  } else if (rawComment.created_at && !isNaN(rawComment.created_at)) {
    timestamp = new Date(rawComment.created_at * 1000);
  } else {
    timestamp = new Date();
  }

  // Validate that timestamp is a valid date
  if (isNaN(timestamp.getTime())) {
    timestamp = new Date();
  }

  return {
    commentId: rawComment.id,
    postId: postId,
    postShortCode: postShortCode,
    ownerUsername:
      rawComment.ownerUsername?.toLowerCase() ||
      rawComment.owner?.username?.toLowerCase() ||
      "",
    ownerFullName:
      rawComment.owner?.full_name || rawComment.ownerFullName || "",
    ownerProfilePicUrl:
      rawComment.owner?.profile_pic_url || rawComment.ownerProfilePicUrl || "",
    text: rawComment.text || "",
    timestamp: timestamp,
    likesCount: rawComment.likesCount || rawComment.likes_count || 0,
    repliesCount:
      rawComment.repliesCount || rawComment.edge_threaded_comments?.count || 0,
    parentCommentId: rawComment.parentCommentId || null,
    scrapedAt: new Date(),
  };
};

/**
 * Validate username format
 * @param {string} username
 * @returns {boolean}
 */
const isValidUsername = (username) => {
  if (!username || typeof username !== "string") return false;
  // Instagram usernames: 1-30 chars, letters, numbers, periods, underscores
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  return usernameRegex.test(username);
};

/**
 * Validate hashtag format
 * @param {string} hashtag
 * @returns {boolean}
 */
const isValidHashtag = (hashtag) => {
  if (!hashtag || typeof hashtag !== "string") return false;
  // Remove # if present
  const cleanHashtag = hashtag.startsWith("#") ? hashtag.substring(1) : hashtag;
  return cleanHashtag.length > 0 && cleanHashtag.length <= 150;
};

/**
 * Sleep utility for rate limiting
 * @param {number} ms
 * @returns {Promise}
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry async operation with exponential backoff
 * @param {Function} operation
 * @param {number} maxRetries
 * @param {number} baseDelay
 * @returns {Promise}
 */
const retryWithBackoff = async (
  operation,
  maxRetries = 3,
  baseDelay = 1000,
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

module.exports = {
  extractHashtags,
  extractMentions,
  normalizeProfileData,
  normalizePostData,
  normalizeCommentData,
  isValidUsername,
  isValidHashtag,
  sleep,
  retryWithBackoff,
};
