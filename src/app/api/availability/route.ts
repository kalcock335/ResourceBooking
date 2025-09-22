import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/availability - Get availability summary for each resource per week
export async function GET(request: NextRequest) {
  // Rate limiting removed for development
  // const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  // const limited = limit(request);
  // if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const weekStart = searchParams.get('weekStart');
    const defaultAvailability = 5; // Default 5 days per week
    
    // Build where clause for filters
    const where: any = {};
    
    if (resourceId) {
      where.resourceId = resourceId;
    }
    
    if (weekStart) {
      where.weekStart = new Date(weekStart);
    }
    
    // Get all allocations with resource info
    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            roles: { include: { role: true } },
          },
        },
        workType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { resource: { name: 'asc' } },
        { weekStart: 'asc' },
      ],
    });
    
    // Group allocations by resource and week
    const availabilityMap = new Map();
    
    allocations
      .filter((allocation: any) => allocation.weekStart !== null)
      .forEach((allocation: any) => {
        const key = `${allocation.resourceId}-${allocation.weekStart.toISOString().split('T')[0]}`;
      
        if (!availabilityMap.has(key)) {
          availabilityMap.set(key, {
            resourceId: allocation.resourceId,
            resourceName: allocation.resource.name,
            resourceRoles: (allocation.resource.roles as any[]).map((rr: any) => rr.role),
            weekStart: allocation.weekStart.toISOString().split('T')[0],
            totalAllocated: 0,
            holidayDays: 0,
            availabilityLeft: defaultAvailability,
            overbooked: false,
          });
        }
      
        const entry = availabilityMap.get(key);
      
        // Check if this is a holiday allocation
        if (allocation.workType.name.toLowerCase() === 'holiday') {
          entry.holidayDays += allocation.days;
        } else {
          entry.totalAllocated += allocation.days;
        }
      });
    
    // Calculate availability and overbooking for each entry
    const availabilityData = Array.from(availabilityMap.values()).map(entry => {
      const availabilityLeft = defaultAvailability - entry.totalAllocated - entry.holidayDays;
      const overbooked = entry.totalAllocated > defaultAvailability;
      
      return {
        ...entry,
        availabilityLeft: Math.round(availabilityLeft * 100) / 100, // Round to 2 decimal places
        overbooked: overbooked,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: availabilityData,
      count: availabilityData.length,
    });
    
  } catch (error) {
    console.error('Error calculating availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 