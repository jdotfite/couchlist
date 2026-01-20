/**
 * Rate limiter for TMDb API
 * TMDb allows approximately 40 requests per 10 seconds
 * We use a sliding window approach to stay within limits
 */

const WINDOW_SIZE_MS = 10000; // 10 seconds
const MAX_REQUESTS = 35; // Leave some buffer below the 40 limit

class RateLimiter {
  private timestamps: number[] = [];
  private waiting: Array<() => void> = [];

  /**
   * Clean up old timestamps outside the sliding window
   */
  private cleanup(): void {
    const cutoff = Date.now() - WINDOW_SIZE_MS;
    this.timestamps = this.timestamps.filter(ts => ts > cutoff);
  }

  /**
   * Get the number of requests made in the current window
   */
  private getRequestCount(): number {
    this.cleanup();
    return this.timestamps.length;
  }

  /**
   * Calculate how long to wait before the next request can be made
   */
  private getWaitTime(): number {
    if (this.getRequestCount() < MAX_REQUESTS) {
      return 0;
    }

    // Find the oldest timestamp in the window
    const oldestInWindow = this.timestamps[0];
    const waitTime = oldestInWindow + WINDOW_SIZE_MS - Date.now();

    return Math.max(0, waitTime);
  }

  /**
   * Acquire a slot to make a request
   * Returns a promise that resolves when it's safe to proceed
   */
  async acquire(): Promise<void> {
    const waitTime = this.getWaitTime();

    if (waitTime > 0) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, waitTime);
      });
    }

    // Double-check after waiting
    const stillNeedWait = this.getWaitTime();
    if (stillNeedWait > 0) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, stillNeedWait);
      });
    }

    // Record this request
    this.timestamps.push(Date.now());
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Get current status for debugging
   */
  getStatus(): { requestsInWindow: number; maxRequests: number; waitTime: number } {
    return {
      requestsInWindow: this.getRequestCount(),
      maxRequests: MAX_REQUESTS,
      waitTime: this.getWaitTime(),
    };
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.timestamps = [];
    this.waiting = [];
  }
}

// Singleton instance for TMDb API
export const tmdbRateLimiter = new RateLimiter();

/**
 * Sleep utility function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute multiple async operations with rate limiting
 * Processes items one at a time, respecting the rate limit
 */
export async function rateLimitedBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    await tmdbRateLimiter.acquire();
    const result = await processor(items[i], i);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return results;
}
