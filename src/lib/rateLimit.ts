import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for demo (replace with Redis for production)
const rateLimitStore: Record<string, { count: number; reset: number }> = {};

export interface RateLimitOptions {
  windowMs: number; // e.g., 15 * 60 * 1000 for 15 minutes
  max: number; // max requests per window
  message?: string;
  keyGenerator?: (req: NextRequest) => string;
}

export function rateLimit(options: RateLimitOptions) {
  return function (req: NextRequest): NextResponse | null {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore[key] || { count: 0, reset: now + options.windowMs };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + options.windowMs;
    }
    entry.count += 1;
    rateLimitStore[key] = entry;

    if (entry.count > options.max) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: options.message || 'Too many requests',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }
    return null;
  };
} 