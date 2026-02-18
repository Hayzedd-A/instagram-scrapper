const { franc } = require("franc");
/**
 * Filters an array of objects, returning only those where the caption is English.
 * @param {object} item - The object to process.
 * @returns {boolean} - The filtered array.
 */

function isEnglishAdvanced(text) {
  if (!text) return false;

  // 1. CLEANING: Remove hashtags, newlines, dots, and emojis
  // This leaves only the actual "sentence" for the detector to look at
  const cleanText = text
    .replace(/@/g, "") // Remove mentions
    .replace(/#/g, "") // Remove hashtags
    .replace(/[.\n\r]+/g, " ") // Remove dots and newlines
    .replace(/[^\x00-\x7F]/g, "") // Remove emojis/non-ASCII
    .trim();

  // 2. LENGTH CHECK: If there's no text left after cleaning, it's not a sentence
  if (cleanText.length < 3) return false;

  // 3. DETECTION: 'eng' is the ISO 639-3 code for English
  const detectedCode = franc(cleanText, { minLength: 3 });
  console.log({
    originalCaption: text,
    cleanText,
    result: detectedCode === "eng",
  });

  return detectedCode === "eng";
}

// Synchronous check
const filterEnglishCaptions = (item) => {
  return isEnglishAdvanced(item.caption);
};

module.exports = { filterEnglishCaptions };
