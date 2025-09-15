// Rate limiting utility with IP-based tracking
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static attempts = new Map<string, RateLimitEntry>();
  private static readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  static {
    // Cleanup expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.attempts.entries()) {
        if (now > entry.resetTime) {
          this.attempts.delete(key);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param limit - Max attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limit exceeded
   */
  static isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return false;
    }

    if (entry.count >= limit) {
      return true;
    }

    // Increment counter
    entry.count++;
    return false;
  }

  /**
   * Get remaining attempts for identifier
   */
  static getRemainingAttempts(identifier: string, limit: number): number {
    const entry = this.attempts.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get time until reset for identifier
   */
  static getTimeUntilReset(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Clear rate limit for identifier (useful for successful auth)
   */
  static clearLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Create rate limit response headers
   */
  static getRateLimitHeaders(identifier: string, limit: number): Record<string, string> {
    const remaining = this.getRemainingAttempts(identifier, limit);
    const resetTime = this.getTimeUntilReset(identifier);

    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime > 0 ? Math.ceil(resetTime / 1000).toString() : '0'
    };
  }
}

/**
 * Middleware function for Edge Functions
 */
export function withRateLimit(
  identifier: string, 
  limit: number, 
  windowMs: number
): { blocked: boolean; headers: Record<string, string> } {
  const blocked = RateLimiter.isRateLimited(identifier, limit, windowMs);
  const headers = RateLimiter.getRateLimitHeaders(identifier, limit);

  return { blocked, headers };
}