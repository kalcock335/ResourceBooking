import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/securityLogger';
import fs from 'fs';

export async function GET(request: NextRequest) {
  // Standard rate limiting
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  const limited = limit(request);
  if (limited) return limited;

  const results: Record<string, boolean | string> = {};
  let status = 200;

  // DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.db = true;
  } catch (e) {
    results.db = false;
    status = 503;
  }

  // Env var check
  results.env = !!process.env.DATABASE_URL;
  if (!results.env) status = 503;

  // File system write check
  try {
    fs.writeFileSync('./.healthcheck.tmp', 'ok');
    fs.unlinkSync('./.healthcheck.tmp');
    results.fs = true;
  } catch (e) {
    results.fs = false;
    status = 503;
  }

  logSecurityEvent(status === 200 ? 'low' : 'high', 'security_health_check', results);
  return NextResponse.json({ success: status === 200, results }, { status });
} 