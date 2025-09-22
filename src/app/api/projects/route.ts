import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/projects - Get all projects
export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per 15 minutes per IP
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  const limited = limit(request);
  if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const customer = searchParams.get('customer');
    
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (customer) {
      where.customer = { contains: customer, mode: 'insensitive' };
    }
    
    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        customer: true,
        description: true,
        startDate: true,
        endDate: true,
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
      data: projects,
      count: projects.length,
    });
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, customer, description, startDate, endDate } = body;
    
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required',
        },
        { status: 400 }
      );
    }
    
    // Check for existing project with same name
    const existingProject = await prisma.project.findUnique({
      where: { name },
    });
    
    if (existingProject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project with this name already exists',
        },
        { status: 409 }
      );
    }
    
    // Validate dates if provided
    let parsedStartDate = null;
    let parsedEndDate = null;
    
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid start date format',
          },
          { status: 400 }
        );
      }
    }
    
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid end date format',
          },
          { status: 400 }
        );
      }
    }
    
    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date cannot be after end date',
        },
        { status: 400 }
      );
    }
    
    const project = await prisma.project.create({
      data: {
        name,
        customer: customer || null,
        description: description || null,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        isActive: true,
      },
    });
    
    return NextResponse.json(
      {
        success: true,
        data: project,
        message: 'Project created successfully',
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 