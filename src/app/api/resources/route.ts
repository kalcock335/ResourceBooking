import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

// GET /api/resources - Get all resources
export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per 15 minutes per IP
  const limit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  const limited = limit(request);
  if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    const resources = await prisma.resource.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        roles: {
          include: { role: true },
        },
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });

    // Map roles to Role[]
    const mapped = resources.map((r: any) => ({
      ...r,
      roles: (r.roles as any[]).map((rr: any) => rr.role),
    }));
    
    return NextResponse.json({
      success: true,
      data: mapped,
      count: mapped.length,
    });
    
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch resources',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, roleIds, jobTitle, password } = body;
    if (!name || !email || !Array.isArray(roleIds) || roleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, email, and at least one role are required',
        },
        { status: 400 }
      );
    }
    if (password && password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 6 characters',
        },
        { status: 400 }
      );
    }
    // Check for existing resource with same email
    const existingResource = await prisma.resource.findUnique({
      where: { email },
    });
    if (existingResource) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource with this email already exists',
        },
        { status: 409 }
      );
    }
    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const resource = await prisma.resource.create({
      data: {
        name,
        email,
        jobTitle: jobTitle || null,
        password: hashedPassword,
        isActive: true,
        roles: {
          create: roleIds.map((roleId: string) => ({ roleId })),
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });
    // Map roles to Role[]
    const mapped = {
      ...resource,
      roles: (resource.roles as any[]).map((rr: any) => rr.role),
    };
    return NextResponse.json(
      {
        success: true,
        data: mapped,
        message: 'Resource created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 