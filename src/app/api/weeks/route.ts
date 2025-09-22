import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/weeks - Get distinct weekStart dates from Allocation table
export async function GET(request: NextRequest) {
  // Rate limiting removed for development
  // const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  // const limited = limit(request);
  // if (limited) return limited;
  try {
    // Get distinct weekStart dates from allocations, sorted ascending
    const weekStarts = await prisma.allocation.findMany({
      select: {
        weekStart: true,
      },
      distinct: ['weekStart'],
      orderBy: {
        weekStart: 'asc',
      },
    });
    
    // Format dates as ISO strings
    const formattedWeeks = weekStarts
      .filter((allocation): allocation is { weekStart: Date } => allocation.weekStart !== null)
      .map((allocation) => ({
        weekStart: allocation.weekStart.toISOString(),
      }));
    
    return NextResponse.json({
      success: true,
      data: formattedWeeks,
      count: formattedWeeks.length,
    });
    
  } catch (error) {
    console.error('Error fetching weeks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weeks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 