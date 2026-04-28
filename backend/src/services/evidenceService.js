const axios = require('axios');
const url = require('url');

// Prevent SSRF by blocking private IP ranges
function isPrivateIP(hostname) {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ];
  return privatePatterns.some(pattern => pattern.test(hostname));
}

function validateUrl(urlString) {
  try {
    const parsed = new URL(urlString);

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block private IPs and localhost
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }

    // Block overly long URLs
    if (urlString.length > 2048) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Compute evidence score from an array of URLs.
 * Each URL is checked via HTTP HEAD:
 *   200       → quality 0.8
 *   other 2xx/3xx → quality 0.2
 *   unreachable  → quality 0.0
 *
 * Returns weighted average, capped at 1.0.
 */
async function computeEvidenceScore(urls) {
  if (!urls || urls.length === 0) return 0;

  // Filter and validate URLs
  const validUrls = urls.filter(u => validateUrl(u));
  if (validUrls.length === 0) return 0;

  const qualities = await Promise.allSettled(
    validUrls.map(async (urlStr) => {
      try {
        const response = await axios.head(urlStr, { timeout: 4000, maxRedirects: 3 });
        if (response.status === 200) return 0.8;
        if (response.status >= 200 && response.status < 400) return 0.2;
        return 0.0;
      } catch {
        return 0.0;
      }
    })
  );

  const scores = qualities
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  if (scores.length === 0) return 0;

  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.min(sum / scores.length, 1.0);
}

module.exports = { computeEvidenceScore };
