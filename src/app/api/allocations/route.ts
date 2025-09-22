import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/securityLogger';
import Holidays from 'date-holidays';

// GET /api/allocations - Get allocations with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const resourceId = searchParams.get('resourceId');
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const status = searchParams.get('status'); // 'forecast' or 'confirmed'
    const roleIds = searchParams.get('roleIds');

    // Build where clause
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    if (resourceId) {
      where.resourceId = resourceId;
    }
    if (status) {
      where.status = status;
    }
    if (weekStart || weekEnd) {
      where.weekStart = {};
      if (weekStart) {
        where.weekStart.gte = new Date(weekStart);
      }
      if (weekEnd) {
        where.weekStart.lte = new Date(weekEnd);
      }
    }
    
    // Handle roleIds filtering
    if (roleIds) {
      // Parse roleIds - it could be a single value or comma-separated
      const roleIdArray = roleIds.split(',').map(id => id.trim());
      
      // Filter allocations where the resource has any of the specified roles
      where.resource = {
        roles: {
          some: {
            roleId: {
              in: roleIdArray
            }
          }
        }
      };
    }
    
    // Fetch allocations with related data
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
        project: {
          select: {
            id: true,
            name: true,
            customer: true,
          },
        },
        workType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { resource: { name: 'asc' } },
        { weekStart: 'asc' },
      ],
    });

    // Map resource.roles to Role[]
    const mappedAllocations = allocations.map((a: any) => ({
      ...a,
      resource: a.resource ? {
        ...a.resource,
        roles: (a.resource.roles as any[]).map((rr: any) => rr.role),
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: mappedAllocations,
      count: mappedAllocations.length,
    });
    
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch allocations',
      },
      { status: 500 }
    );
  }
}

// POST /api/allocations - Create a new allocation
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await request.json();
    console.log('Parsed allocation POST body:', body);
    
    // Handle different allocation creation scenarios
    const { resourceId, projectId, workTypeId, weekStart, days, notes, status = 'confirmed', role, quantity, daysPerWeek, numWeeks, startDate } = body;
    
    // Create new allocation
    const allocation = await prisma.allocation.create({
      data: {
        resourceId,
        projectId,
        workTypeId,
        weekStart: weekStart ? new Date(weekStart) : null,
        days,
        notes,
        status,
        role,
        quantity,
        daysPerWeek,
        numWeeks,
        startDate: startDate ? new Date(startDate) : null,
      },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            roles: { include: { role: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            customer: true,
          },
        },
        workType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          ...allocation,
          resource: (allocation as any).resource ? {
            ...(allocation as any).resource,
            roles: ((allocation as any).resource.roles as any[]).map((rr: any) => rr.role),
          } : null,
        },
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating allocation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create allocation',
      },
      { status: 500 }
    );
  }
} 