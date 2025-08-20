/**
 * Rate Limiter Middleware for LetterCraft
 * Provides rate limiting functionality for API endpoints
 */

import { NextRequest } from "next/server";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (fallback)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => this.getClientKey(req),
      ...options,
    };
  }

  private getClientKey(req: NextRequest): string {
    // Try to get user ID from authorization header first
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      // Extract token from Bearer token (simplified)
      const token = authHeader.replace("Bearer ", "");
      if (token && token.length > 10) {
        return `user:${token.substring(0, 10)}`;
      }
    }

    // Fallback to IP address
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "unknown";

    return `ip:${ip}`;
  }

  public check(req: NextRequest): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const key = this.options.keyGenerator!(req);
    const now = Date.now();
    const windowMs = this.options.windowMs;

    // Clean up expired entries periodically
    this.cleanup();

    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, newEntry);

      return {
        allowed: true,
        remaining: this.options.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count < this.options.maxRequests) {
      // Within limit
      entry.count++;
      rateLimitStore.set(key, entry);

      return {
        allowed: true,
        remaining: this.options.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  // For review submission - 5 requests per 5 minutes
  reviews: new RateLimiter({
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  }),

  // For general API calls - 100 requests per minute
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }),

  // For analytics/export - 10 requests per hour
  analytics: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
};

/**
 * Rate limit check result type
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}
