import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/work-types - Get all work types
export async function GET(request: NextRequest) {
  // Rate limiting removed for development
  // const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  // const limited = limit(request);
  // if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    const workTypes = await prisma.workType.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        isActive: true,
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: workTypes,
      count: workTypes.length,
    });
    
  } catch (error) {
    console.error('Error fetching work types:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch work types',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/work-types - Create a new work type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, description, color } = body;
    
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required',
        },
        { status: 400 }
      );
    }
    
    // Check for existing work type with same name
    const existingWorkType = await prisma.workType.findUnique({
      where: { name },
    });
    
    if (existingWorkType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Work type with this name already exists',
        },
        { status: 409 }
      );
    }
    
    const workType = await prisma.workType.create({
      data: {
        name,
        description: description || null,
        color: color || null,
        isActive: true,
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        data: workType,
        message: 'Work type created successfully',
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating work type:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create work type',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 