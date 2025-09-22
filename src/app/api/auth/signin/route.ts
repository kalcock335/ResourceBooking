import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { rateLimit } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/securityLogger';

export async function POST(request: NextRequest) {
  // Rate limiting: 50 attempts per 15 minutes per IP (increased for development)
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: 'Too many authentication attempts. Please try again later.' });
  const limited = limit(request);
  if (limited) return limited;
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      logSecurityEvent('medium', 'auth_failed', { reason: 'Missing username or password', username });
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Demo authentication - accept any username/password
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      logSecurityEvent('medium', 'auth_failed', { reason: 'Invalid credentials', username });
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    logSecurityEvent('low', 'auth_success', { username });
    return NextResponse.json({ success: true });
  } catch (error) {
    logSecurityEvent('high', 'auth_error', { error: error instanceof Error ? error.message : error });
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 