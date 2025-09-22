import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/resource-skills?resourceId=... - List all skills for a resource
// GET /api/resource-skills - List all resource-skill assignments
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resourceId');
  let where = {};
  if (resourceId) where = { resourceId };
  const resourceSkills = await prisma.resourceSkill.findMany({
    where,
    include: { skill: true, resource: true },
    orderBy: [{ resource: { name: 'asc' } }, { skill: { name: 'asc' } }],
  });
  return NextResponse.json({ success: true, data: resourceSkills });
}

// POST /api/resource-skills - Assign a skill to a resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.resourceId || !body.skillId) {
      return NextResponse.json({ success: false, error: 'resourceId and skillId are required' }, { status: 400 });
    }
    const resourceSkill = await prisma.resourceSkill.create({
      data: {
        resourceId: body.resourceId,
        skillId: body.skillId,
        proficiency: body.proficiency || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        notes: body.notes || null,
      },
      include: { skill: true, resource: true },
    });
    return NextResponse.json({ success: true, data: resourceSkill });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE /api/resource-skills?id=... - Remove a skill from a resource by resourceSkill id
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }
  await prisma.resourceSkill.delete({ where: { id } });
  return NextResponse.json({ success: true });
} 