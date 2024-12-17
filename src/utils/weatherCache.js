// weatherCache.js
import { calculateWeatherScore } from "./weatherScore";

const weatherScoreCache = new Map();

/**
 * Generates a unique key for caching based on node ID and forecast time.
 * @param {number} nodeId 
 * @param {string} forecastTime - ISO string
 * @returns {string}
 */
export function getCacheKey(nodeId, forecastTime) {
  return `${nodeId}|${forecastTime}`;
}

/**
 * Retrieves weather score from cache or calculates it if not present.
 * @param {number} nodeId 
 * @param {Object} forecastEntry 
 * @returns {number|null}
 */
export function getWeatherScore(nodeId, forecastEntry) {
  const key = getCacheKey(nodeId, forecastEntry.time);
  if (weatherScoreCache.has(key)) {
    return weatherScoreCache.get(key);
  }

  const score = calculateWeatherScore(forecastEntry);
  if (score !== null) {
    weatherScoreCache.set(key, score);
  }
  return score;
}