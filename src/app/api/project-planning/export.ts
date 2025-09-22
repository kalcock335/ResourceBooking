import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 });
    }

    // Fetch project
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Fetch all allocations for the project
    const allocations = await prisma.allocation.findMany({
      where: { projectId },
      include: { resource: { include: { roles: { include: { role: true } } } } },
      orderBy: [{ resource: { name: 'asc' } }, { weekStart: 'asc' }],
    });
    if (!allocations.length) {
      return NextResponse.json({ success: false, error: 'No allocations found for project' }, { status: 404 });
    }

    // Build all unique weeks
    const allWeeks = Array.from(new Set(
      allocations
        .filter(a => a.weekStart)
        .map(a => format(a.weekStart as Date, 'dd-MM-yyyy'))
    )).sort();
    // Build all unique resources
    const allResources = Array.from(new Set(allocations.map(a => a.resourceId)));
    // Map resourceId to resource info
    const resourceMap: Record<string, { name: string; roles: string }> = {};
    allocations.forEach(a => {
      if (!a.resourceId || !a.resource) return;
      if (!resourceMap[a.resourceId]) {
        const roles = Array.isArray(a.resource.roles)
          ? a.resource.roles.map((r: any) => r.label || r.name).join(', ')
          : '';
        resourceMap[a.resourceId] = { name: a.resource.name, roles };
      }
    });

    // Build CSV header
    const header = ['Resource Name', 'Roles', 'Project', ...allWeeks];
    const csvRows = [header];

    // Build CSV rows
    for (const resourceId of allResources) {
      if (!resourceId) continue;
      const resource = resourceMap[resourceId];
      if (!resource) continue;
      const rowData = [resource.name, resource.roles, project.name];
      for (const week of allWeeks) {
        const allocation = allocations.find(a =>
          a.resourceId === resourceId &&
          format(a.weekStart as Date, 'dd-MM-yyyy') === week
        );
        rowData.push(allocation ? String(allocation.days) : '');
      }
      csvRows.push(rowData);
    }

    // Convert to CSV string
    const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=project-planning-${projectId}.csv`,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 