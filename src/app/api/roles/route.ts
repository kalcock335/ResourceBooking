import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { label: 'asc' }
    });
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
} 