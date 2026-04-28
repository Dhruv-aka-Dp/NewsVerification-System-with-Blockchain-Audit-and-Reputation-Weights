/**
 * Clamp a value between min and max (inclusive)
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute weighted average of an array of { value, weight } objects
 */
function weightedAverage(items) {
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = items.reduce((acc, item) => acc + item.value * item.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * Compute Pearson correlation coefficient between two arrays of equal length
 */
function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n === 0) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * (ys[i] - meanY), 0);
  const denX = Math.sqrt(xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0));
  const denY = Math.sqrt(ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0));
  const den = denX * denY;
  if (den === 0) return 0;
  return num / den;
}

module.exports = { clamp, weightedAverage, pearsonCorrelation };
