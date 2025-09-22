import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/skills - List all skills
export async function GET() {
  const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ success: true, data: skills });
}

// POST /api/skills - Create a new skill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const skill = await prisma.skill.create({
      data: {
        name: body.name,
        description: body.description || null,
      },
    });
    return NextResponse.json({ success: true, data: skill });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE /api/skills?id=... - Delete a skill by id
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }
  await prisma.skill.delete({ where: { id } });
  return NextResponse.json({ success: true });
} 