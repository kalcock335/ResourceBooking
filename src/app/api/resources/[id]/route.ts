import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    // Handle password update with hashing
    if (body.password !== undefined) {
      if (body.password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(body.password, 10);
    }
    
    // Update resource fields
    const resource = await prisma.resource.update({
      where: { id },
      data: updateData,
      include: { roles: { include: { role: true } } },
    });
    
    // If roleIds provided, update roles
    if (Array.isArray(body.roleIds)) {
      // Remove all existing roles
      await prisma.resourceRole.deleteMany({ where: { resourceId: id } });
      // Add new roles
      for (const roleId of body.roleIds) {
        await prisma.resourceRole.create({ data: { resourceId: id, roleId } });
      }
    }
    
    // Fetch updated resource with roles
    const updated = await prisma.resource.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    
    const mapped = {
      ...updated,
      roles: (updated?.roles as any[]).map((rr: any) => rr.role),
    };
    
    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update resource' }, { status: 500 });
  }
} 