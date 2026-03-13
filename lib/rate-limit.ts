// Simple in-memory rate limiter for API routes
// Uses a Map with user IDs as keys and request timestamps as values

type RateLimitConfig = {
  maxRequests: number;  // max requests per window
  windowMs: number;     // time window in milliseconds
};

const rateLimitMap = new Map<string, number[]>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((timestamps, key) => {
    const valid = timestamps.filter((t: number) => now - t < 60000 * 10); // keep last 10 min
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  });
}, 300000);

export function rateLimit(userId: string, config: RateLimitConfig): { success: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const windowStart = now - config.windowMs;
  const recentRequests = timestamps.filter(t => t > windowStart);

  if (recentRequests.length >= config.maxRequests) {
    return { success: false, remaining: 0 };
  }

  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return { success: true, remaining: config.maxRequests - recentRequests.length };
}
