import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Compliance rate limiting removed for development
  // const limit = rateLimit({ windowMs: 5 * 60 * 1000, max: 10, message: 'Too many compliance requests. Please try again later.' });
  // const limited = limit(request);
  // if (limited) return limited;
  try {
    // Get all resources with their allocations
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
      },
      include: {
        allocations: {
          select: {
            days: true,
            weekStart: true,
          },
        },
        roles: { include: { role: true } },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate summary for each resource
    const summaries = resources.map((resource: any) => {
      // Calculate total allocated days
      const totalAllocated = resource.allocations.reduce(
        (sum: number, allocation: any) => sum + allocation.days,
        0
      );

      // Get distinct weeks from allocations
      const distinctWeeks = new Set(
        resource.allocations.map((allocation: any) => allocation.weekStart)
      ).size;

      // Calculate total capacity (default 5 days per week)
      const defaultAvailability = 5;
      const totalCapacity = defaultAvailability * distinctWeeks;

      // Calculate availability left
      const availabilityLeft = totalCapacity - totalAllocated;

      // Check if overbooked
      const overbooked = totalAllocated > totalCapacity;

      return {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceRoles: (resource.roles as any[]).map((rr: any) => rr.role),
        totalAllocated,
        totalCapacity,
        availabilityLeft,
        overbooked,
        distinctWeeks,
        defaultAvailability,
      };
    });

    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('Error fetching allocation summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch allocation summary' },
      { status: 500 }
    );
  }
} 