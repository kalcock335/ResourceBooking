import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/allocations/[id] - Update an allocation by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate allocation exists
    const existingAllocation = await prisma.allocation.findUnique({
      where: { id },
      include: {
        resource: true,
        project: true,
        workType: true,
      },
    });
    
    if (!existingAllocation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Allocation not found',
        },
        { status: 404 }
      );
    }
    
    // Build update data object
    const updateData: any = {};
    
    // Validate and update fields if provided
    if (body.days !== undefined) {
      if (typeof body.days !== 'number' || body.days < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Days must be a non-negative number',
          },
          { status: 400 }
        );
      }
      updateData.days = body.days;
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Handle new unified model fields
    if (body.status !== undefined) {
      if (!['forecast', 'confirmed'].includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Status must be either "forecast" or "confirmed"',
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.role !== undefined) {
      updateData.role = body.role;
    }

    if (body.quantity !== undefined) {
      if (typeof body.quantity !== 'number' || body.quantity < 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Quantity must be a positive number',
          },
          { status: 400 }
        );
      }
      updateData.quantity = body.quantity;
    }

    if (body.daysPerWeek !== undefined) {
      if (typeof body.daysPerWeek !== 'number' || body.daysPerWeek < 1 || body.daysPerWeek > 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Days per week must be between 1 and 5',
          },
          { status: 400 }
        );
      }
      updateData.daysPerWeek = body.daysPerWeek;
    }

    if (body.numWeeks !== undefined) {
      if (typeof body.numWeeks !== 'number' || body.numWeeks < 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Number of weeks must be a positive number',
          },
          { status: 400 }
        );
      }
      updateData.numWeeks = body.numWeeks;
    }

    if (body.startDate !== undefined) {
      if (body.startDate === null) {
        updateData.startDate = null;
      } else {
        const startDate = new Date(body.startDate);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid startDate format',
            },
            { status: 400 }
          );
        }
        updateData.startDate = startDate;
      }
    }
    
    // Handle projectId updates
    if (body.projectId !== undefined) {
      if (body.projectId === null) {
        updateData.projectId = null;
      } else {
        // Validate project exists
        const project = await prisma.project.findUnique({
          where: { id: body.projectId },
        });
        
        if (!project) {
          return NextResponse.json(
            {
              success: false,
              error: 'Project not found',
            },
            { status: 404 }
          );
        }
        updateData.projectId = body.projectId;
      }
    }
    
    // Handle workTypeId updates
    if (body.workTypeId) {
      const workType = await prisma.workType.findUnique({
        where: { id: body.workTypeId },
      });
      
      if (!workType) {
        return NextResponse.json(
          {
            success: false,
            error: 'Work type not found',
          },
          { status: 404 }
        );
      }
      updateData.workTypeId = body.workTypeId;
    }
    
    // Handle weekStart updates
    if (body.weekStart) {
      const weekStartDate = new Date(body.weekStart);
      if (isNaN(weekStartDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid weekStart date format',
          },
          { status: 400 }
        );
      }
      
      // Get the start of the week (Monday)
      const day = weekStartDate.getDay();
      const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1);
      const mondayStart = new Date(weekStartDate.setDate(diff));
      mondayStart.setHours(0, 0, 0, 0);
      
      updateData.weekStart = mondayStart;
    }
    
    // Handle resourceId updates
    if (body.resourceId) {
      const resource = await prisma.resource.findUnique({
        where: { id: body.resourceId },
      });
      if (!resource) {
        return NextResponse.json(
          {
            success: false,
            error: 'Resource not found',
          },
          { status: 404 }
        );
      }
      updateData.resourceId = body.resourceId;
    }
    
    // Check for conflicts if weekStart, workTypeId, resourceId, or projectId changed
    if (updateData.weekStart || updateData.workTypeId || updateData.resourceId || updateData.projectId !== undefined) {
      const newWeekStart = updateData.weekStart || existingAllocation.weekStart;
      const newWorkTypeId = updateData.workTypeId || existingAllocation.workTypeId;
      const newResourceId = updateData.resourceId || existingAllocation.resourceId;
      // projectId can be null, so handle that
      const newProjectId = updateData.hasOwnProperty('projectId') ? updateData.projectId : existingAllocation.projectId;
      const conflictingAllocation = await prisma.allocation.findFirst({
        where: {
          resourceId: newResourceId,
          projectId: newProjectId,
          workTypeId: newWorkTypeId,
          weekStart: newWeekStart,
        },
      });
      if (conflictingAllocation && conflictingAllocation.id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Allocation already exists for this resource, project, work type, and week',
          },
          { status: 409 }
        );
      }
    }
    
    // Update the allocation
    const updatedAllocation = await prisma.allocation.update({
      where: { id },
      data: updateData,
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
    
    // Map resource.roles to Role[]
    const mapped = {
      ...updatedAllocation,
      resource: updatedAllocation.resource
        ? {
            ...updatedAllocation.resource,
            roles: (updatedAllocation.resource.roles as any[]).map((rr: any) => rr.role),
          }
        : null,
    };
    
    return NextResponse.json({
      success: true,
      data: mapped,
      message: 'Allocation updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating allocation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update allocation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/allocations/[id] - Delete an allocation by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if allocation exists
    const existingAllocation = await prisma.allocation.findUnique({
      where: { id },
    });
    
    if (!existingAllocation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Allocation not found',
        },
        { status: 404 }
      );
    }
    
    // Delete the allocation
    await prisma.allocation.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Allocation deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete allocation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 