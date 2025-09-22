'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { FilterParams } from './Filters';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { toast } from 'react-hot-toast';
import React from 'react';
import Holidays from 'date-holidays';
import { apiClient } from '../lib/apiClient';
import { RESOURCE_ROLE_OPTIONS } from '../types/resourceRoles';

const fetcher = (url: string) => apiClient(url);

interface CalendarViewProps {
  filters: FilterParams;
  onNewAssignment?: () => void;
}

interface Allocation {
  id: string;
  resourceId: string;
  projectId: string | null;
  workTypeId: string;
  weekStart: string;
  days: number;
  notes: string | null;
  status: 'forecast' | 'confirmed';
  resource: {
    id: string;
    name: string;
    roles: any[];
  };
  project: {
    id: string;
    name: string;
    customer: string;
  } | null;
  workType: {
    id: string;
    name: string;
    color: string;
  };
}

interface Week {
  weekStart: string;
}

interface DraggedItem {
  allocation: Allocation;
  sourceWeek: string;
}

interface ResourceSummary {
  resourceId: string;
  resourceName: string;
  resourceRole: string;
  totalAllocated: number;
  totalCapacity: number;
  availabilityLeft: number;
  overbooked: boolean;
  distinctWeeks: number;
  defaultAvailability: number;
}

// Color palette for work types
const WORK_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Project: { bg: '#dbeafe', text: '#1e40af' },      // Soft blue
  Holiday: { bg: '#f3f4f6', text: '#374151' },      // Soft gray
  Internal: { bg: '#ede9fe', text: '#6d28d9' },     // Soft purple
  PreSales: { bg: '#ccfbf1', text: '#0f766e' },     // Soft teal
  Available: { bg: '#dcfce7', text: '#166534' },    // Soft green
  Forecast: { bg: '#fef3c7', text: '#92400e' },     // Amber for forecasts
};

function getWorkTypeColor(workType: { name: string; color?: string | null }) {
  if (workType.color) {
    // Use DB color if set
    return { bg: workType.color, text: '#1e293b' };
  }
  return WORK_TYPE_COLORS[workType.name] || { bg: '#e5e7eb', text: '#1f2937' };
}

// Draggable Allocation Block Component
function DraggableAllocationBlock({ allocation }: { allocation: Allocation }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: allocation.id,
    data: allocation,
  });
  const { bg, text } = getWorkTypeColor(allocation.workType);
  const style = {
    background: bg,
    color: text,
    minWidth: 40,
    marginRight: 4,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
    cursor: 'grab',
  };
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`px-2 py-1 rounded text-xs font-medium flex items-center justify-center shadow-sm w-full text-center hover:underline`}
      style={style}
      title={`${allocation.project?.name || allocation.workType.name} • ${allocation.days}d`}
    >
      <span className="truncate">{allocation.project?.name || allocation.workType.name}</span>
      <span className="ml-1">{allocation.days}d</span>
    </div>
  );
}

// AllocationBlock for static (non-draggable) use (if needed elsewhere)
function AllocationBlock({ allocation, onClick }: { allocation: Allocation; onClick?: () => void }) {
  const { bg, text } = getWorkTypeColor(allocation.workType);
  return (
    <div
      className={`px-2 py-1 rounded text-xs font-medium flex items-center justify-center shadow-sm w-full text-center ${onClick ? 'cursor-pointer hover:underline' : ''}`}
      style={{ background: bg, color: text, minWidth: 40, marginRight: 4 }}
      title={`${allocation.project?.name || allocation.workType.name} • ${allocation.days}d`}
      onClick={onClick}
    >
      <span className="truncate">{allocation.project?.name || allocation.workType.name}</span>
      <span className="ml-1">{allocation.days}d</span>
    </div>
  );
}

// Droppable Week Column Component
function DroppableWeekColumn({ 
  week, 
  resourceId, 
  weekAllocations, 
  overbooked, 
  isDragOver, 
  onAllocationClick 
}: { 
  week: Week; 
  resourceId: string; 
  weekAllocations: Allocation[]; 
  overbooked: boolean; 
  isDragOver: boolean; 
  onAllocationClick: (allocation: Allocation) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: week.weekStart,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`px-2 py-2 min-h-[80px] transition-colors ${
        isDragOver || isOver ? 'bg-blue-100 border-2 border-blue-300' : ''
      } ${overbooked ? 'bg-red-50' : ''}`}
      data-week={week.weekStart}
    >
      <div className="space-y-1">
        {weekAllocations.map((allocation: Allocation) => (
          <div
            key={allocation.id}
            onClick={() => onAllocationClick(allocation)}
            className="cursor-pointer"
          >
            <DraggableAllocationBlock allocation={allocation} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Droppable Week Cell
function DroppableWeekCell({ weekStart, resourceId, children }: { weekStart: string; resourceId: string; children: React.ReactNode }) {
  const droppableId = `${resourceId}-${weekStart}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { resourceId, weekStart },
  });
  return (
    <div
      ref={setNodeRef}
      className={`p-2 min-h-[110px] flex flex-col items-center justify-center border-r border-slate-200 ${isOver ? 'bg-slate-200 ring-2 ring-blue-400' : 'hover:bg-slate-50'}`}
      data-week={weekStart}
    >
      {children}
    </div>
  );
}

export default function CalendarView({ filters, onNewAssignment }: CalendarViewProps) {
  const [draggedAllocation, setDraggedAllocation] = useState<Allocation | null>(null);
  const [dragOverWeek, setDragOverWeek] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ allocation: Allocation; targetWeek: string; targetResourceId?: string } | null>(null);
  const [mergeWarning, setMergeWarning] = useState<string | null>(null);
  const weeksPerPage = 6;
  const initialPageSet = useRef(false);
  const [page, setPage] = useState(0);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [dragTarget, setDragTarget] = useState<{ resourceId: string; weekStart: string } | null>(null);
  // Remove all forecast conversion modal and forecastRole logic
  // Only use Allocation model and status field
  const [selectedForecast, setSelectedForecast] = useState<Allocation | null>(null);
  const [selectedResourceForConversion, setSelectedResourceForConversion] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'roleIds') {
        const ids = Array.isArray(value) ? value : [];
        if (ids.length > 0) params.append('roleIds', ids.join(','));
        return;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        params.append(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  // Fetch data
  const { data: allocationsData, error: allocationsError, mutate: mutateAllocations } = useSWR(
    `/api/allocations?${queryString}`,
    fetcher
  );
  const { data: weeksData, error: weeksError } = useSWR('/api/weeks', fetcher);
  const { data: availabilityData } = useSWR('/api/availability', fetcher);
  const { data: summaryData, error: summaryError } = useSWR('/api/summary', fetcher);

  const allocations = (allocationsData as { data?: any[] })?.data || [];
  const weeks = (weeksData as { data?: any[] })?.data || [];
  const availability = (availabilityData as { data?: any[] })?.data || [];
  const summaries = (summaryData as { data?: any[] })?.data || [];

  // Helper: get Monday of a given date
  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Helper: get working days in a week (Mon-Fri, minus UK holidays)
  function getWorkingDaysInWeek(weekStart: string) {
    const hd = new Holidays('GB', 'ENG');
    const start = new Date(weekStart);
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      const isHoliday = hd.isHoliday(d);
      if (!isWeekend && !isHoliday) count++;
    }
    return count;
  }

  // Compute filteredWeeks from filtered allocations, but only include current/future weeks
  const today = new Date();
  const mondayOfCurrentWeek = getMonday(today);
  const allWeeks = Array.from(new Set(allocations.map((a: Allocation) => a.weekStart))).sort();
  const hasExplicitRange = Boolean((filters as any)?.weekStart || (filters as any)?.weekEnd);
  const filteredWeeks = allWeeks.filter(w => {
    if (hasExplicitRange) return true;
    const weekDate = getMonday(new Date(String(w)));
    return weekDate >= mondayOfCurrentWeek;
  });

  // Create summary map for quick lookup
  const summaryMap = useMemo(() => {
    const map = new Map<string, ResourceSummary>();
    summaries.forEach((summary: ResourceSummary) => {
      map.set(summary.resourceId, summary);
    });
    return map;
  }, [summaries]);

  // Group allocations by resource
  const resourceGroups = useMemo(() => {
    const groups = new Map<string, { resource: any; allocations: Allocation[] }>();
    allocations.forEach((allocation: Allocation) => {
      if (!groups.has(allocation.resourceId)) {
        groups.set(allocation.resourceId, {
          resource: allocation.resource,
          allocations: [],
        });
      }
      groups.get(allocation.resourceId)!.allocations.push(allocation);
    });
    // Only include resources with at least one allocation in a current/future filtered week
    return Array.from(groups.values())
      .filter(group =>
        group.resource && group.resource.name &&
        group.allocations.some(a => filteredWeeks.includes(a.weekStart))
      )
      .sort((a, b) => a.resource.name.localeCompare(b.resource.name));
  }, [allocations, filteredWeeks]);

  // Create availability map
  const availabilityMap = useMemo(() => {
    const map = new Map<string, any>();
    availability.forEach((item: any) => {
      const key = `${item.resourceId}-${item.weekStart}`;
      map.set(key, item);
    });
    return map;
  }, [availability]);

  // Set initial page to 0 (current week is always first)
  useEffect(() => {
    if (!initialPageSet.current && filteredWeeks.length > 0) {
      setPage(0);
      initialPageSet.current = true;
    }
  }, [filteredWeeks]);

  // Fetch resources, workTypes, projects for edit form
  useEffect(() => {
    if (showAllocationModal) {
      apiClient('/api/resources').then(data => setResources((data as { data?: any[] })?.data ?? []));
      apiClient('/api/work-types').then(data => setWorkTypes((data as { data?: any[] })?.data ?? []));
      apiClient('/api/projects').then(data => setProjects((data as { data?: any[] })?.data ?? []));
    }
  }, [showAllocationModal]);

  const handleDragStart = (event: DragStartEvent) => {
    const allocation: Allocation | undefined = allocations.find((a: Allocation) => a.id === String(event.active.id));
    if (allocation) {
      setDraggedAllocation(allocation);
    }
  };

  const handleDragOver = (event: any) => {
    if (event.over) {
      setDragOverWeek(String(event.over.id));
    } else {
      setDragOverWeek(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragOverWeek(null);
    if (!draggedAllocation || !event.over) {
      setDraggedAllocation(null);
      setDragTarget(null);
      return;
    }
    // Find target resource and week from drop target
    const dropData = event.over.data?.current;
    let targetResourceId = dropData?.resourceId;
    let targetWeekStart = dropData?.weekStart;
    // Fallback: parse from id if needed
    if ((!targetResourceId || !targetWeekStart) && typeof event.over.id === 'string') {
      const [resId, week] = event.over.id.split('-');
      targetResourceId = targetResourceId || resId;
      targetWeekStart = targetWeekStart || week;
    }
    // Only proceed if target is different from current
    if (
      !targetResourceId || !targetWeekStart ||
      (targetResourceId === draggedAllocation.resourceId &&
        new Date(targetWeekStart).toISOString().split('T')[0] === new Date(draggedAllocation.weekStart).toISOString().split('T')[0])
    ) {
      setDraggedAllocation(null);
      setDragTarget(null);
      return;
    }
    setPendingMove({ allocation: draggedAllocation, targetWeek: targetWeekStart, targetResourceId });
    setDragTarget({ resourceId: targetResourceId, weekStart: targetWeekStart });
    setDraggedAllocation(null);
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    try {
      await apiClient(`/api/allocations/${pendingMove.allocation.id}`, {
        method: 'PATCH',
        body: {
          resourceId: pendingMove.targetResourceId,
          weekStart: pendingMove.targetWeek,
        },
      });
      setPendingMove(null);
      setDragTarget(null);
      mutateAllocations();
      toast.success('Allocation moved');
    } catch (err: any) {
      const message = err?.message || err?.error || 'Failed to move allocation';
      toast.error(typeof message === 'string' ? message : 'Failed to move allocation');
    }
  };
  const cancelMove = () => { setPendingMove(null); setDragTarget(null); };

  const getWeekTotalForResource = (resourceId: string, weekStart: string) => {
    return allocations
      .filter((allocation: Allocation) => 
        allocation.resourceId === resourceId && 
        new Date(allocation.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
      )
      .reduce((sum: number, allocation: Allocation) => sum + allocation.days, 0);
  };

  const getWeekAllocationsForResource = (resourceId: string, weekStart: string) => {
    return allocations.filter((allocation: Allocation) => 
      allocation.resourceId === resourceId && 
      new Date(allocation.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
    );
  };

  const isOverbooked = (resourceId: string, weekStart: string) => {
    const key = `${resourceId}-${weekStart}`;
    const availabilityItem = availabilityMap.get(key);
    return availabilityItem?.overbooked || false;
  };

  // In getResourceSummary, support multiple roles
  const getResourceSummary = (resourceId: string) => {
    const group = resourceGroups.find((g: any) => g.resource.id === resourceId);
    let resourceRoles: string[] = [];
    if (group && 'roles' in group.resource && Array.isArray(group.resource.roles)) {
      resourceRoles = group.resource.roles.map((r: any) => r.label);
    } else if (group?.resource.role) {
      resourceRoles = [group.resource.role];
    }
    const pagedWeeks = filteredWeeks as string[];
    const pagedAllocations = group?.allocations
      ? group.allocations.filter((a: Allocation) =>
          pagedWeeks.some(weekStart =>
            new Date(a.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
          )
        )
      : [];
    
    const totalAllocated = pagedAllocations.reduce((sum: number, a: Allocation) => sum + a.days, 0);
    const totalCapacity = filteredWeeks.length > 0 && typeof filteredWeeks[0] === 'string' ? filteredWeeks.length * getWorkingDaysInWeek(filteredWeeks[0]) : 0;
    const availabilityLeft = totalCapacity - totalAllocated;
    const overbooked = totalAllocated > totalCapacity;
    const distinctWeeks = new Set(pagedAllocations.map((a: Allocation) => a.weekStart)).size;
    
    return {
      resourceId,
      resourceName: group?.resource.name || '',
      resourceRoles,
      totalAllocated,
      totalCapacity,
      availabilityLeft,
      overbooked,
      distinctWeeks,
      defaultAvailability: filteredWeeks.length > 0 && typeof filteredWeeks[0] === 'string' ? getWorkingDaysInWeek(filteredWeeks[0]) : 0
    };
  };

  // Calculate week summary for all resources
  const getWeekSummary = (weekStart: string) => {
    const weekAllocations = allocations.filter((a: Allocation) => 
      new Date(a.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
    );
    const totalAllocated = weekAllocations.reduce((sum: number, a: Allocation) => sum + a.days, 0);
    const totalCapacity = typeof weekStart === 'string' ? resourceGroups.length * getWorkingDaysInWeek(weekStart) : 0;
    const availabilityLeft = totalCapacity - totalAllocated;
    const utilizationPercentage = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
    
    return {
      weekStart,
      totalAllocated,
      totalCapacity,
      availabilityLeft,
      utilizationPercentage,
      resourceCount: resourceGroups.length
    };
  };

  const totalPages = Math.ceil(filteredWeeks.length / weeksPerPage);
  const pagedWeeks = (filteredWeeks as string[]).slice(page * weeksPerPage, (page + 1) * weeksPerPage);

  // Handler for clicking an allocation
  const handleAllocationClick = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setEditForm(null);
    setEditMode(false);
    setShowAllocationModal(true);
  };

  // Handler for starting edit
  const handleEdit = () => {
    if (!selectedAllocation) return;
    setEditForm({
      resourceId: selectedAllocation.resource.id,
      workTypeId: selectedAllocation.workType.id,
      projectId: selectedAllocation.project?.id || '',
      weekStart: selectedAllocation.weekStart.slice(0, 10),
      days: selectedAllocation.days,
      notes: selectedAllocation.notes || '',
    });
    setEditMode(true);
  };

  // Handler for saving edit
  const handleEditSave = async () => {
    if (!selectedAllocation || !editForm) return;
    try {
      await apiClient(`/api/allocations/${selectedAllocation.id}`, {
        method: 'PATCH',
        body: {
          resourceId: editForm.resourceId,
          workTypeId: editForm.workTypeId,
          projectId: editForm.projectId || null,
          weekStart: editForm.weekStart,
          days: Number(editForm.days),
          notes: editForm.notes,
        },
      });
      setShowAllocationModal(false);
      setEditMode(false);
      setSelectedAllocation(null);
      setEditForm(null);
      mutateAllocations();
      toast.success('Allocation updated');
    } catch (err: any) {
      const message = err?.message || err?.error || 'Failed to update allocation';
      toast.error(typeof message === 'string' ? message : 'Failed to update allocation');
    }
  };

  // Handler for canceling edit
  const handleEditCancel = () => {
    setEditMode(false);
    setEditForm(null);
  };

  if (allocationsError || weeksError || summaryError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading data. Please try again.</p>
      </div>
    );
  }

  if (!allocationsData || !weeksData || !summaryData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4">
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* ...filters go here... */}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2 bg-gray-50 border-b items-center">
        <span className="text-xs text-gray-500 font-medium mr-2">Legend:</span>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">Project 1d</span>
        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">Holiday 1d</span>
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">Internal 1d</span>
        <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-sm">PreSales 1d</span>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Available 1d</span>
        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm">Forecast 1d</span>
      </div>

      {/* Pagination Controls */}
      <div className="sticky top-0 z-30 bg-slate-50 py-2 flex items-center justify-between mb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </button>
          <div className="text-sm text-gray-700">
            Weeks {page * weeksPerPage + 1}–{Math.min((page + 1) * weeksPerPage, filteredWeeks.length)} of {filteredWeeks.length}
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
        
        {onNewAssignment && (
          <button
            onClick={onNewAssignment}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            New Assignment
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          {/* Week Header Row */}
          <div className="grid grid-cols-[200px_repeat(6,_minmax(0,_130px))] gap-x-0">
            <div className="text-sm font-medium text-gray-500 bg-slate-50 py-2 px-2 border-b border-slate-200">Resource</div>
            {(pagedWeeks as string[]).map((weekStart: string) => (
              <div
                key={weekStart}
                className="text-sm font-semibold text-center bg-slate-50 py-2 border-b border-slate-200"
              >
                {new Date(weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
              </div>
            ))}
          </div>

          {/* Resource Rows */}
          {resourceGroups.map((group) => (
            <div key={group.resource.id} className="bg-white rounded-xl shadow-sm mb-6">
              {/* Allocations row */}
              <div className="grid grid-cols-[200px_repeat(6,_minmax(0,_130px))] gap-x-0">
                <div className="p-4 text-lg font-semibold text-left border-r border-slate-200">
                  {group.resource.name}
                  <span className="text-sm text-gray-500 font-normal block">{group.resource.roles ? group.resource.roles.map((r: any) => r.label).join(', ') : group.resource.role}</span>
                </div>
                {(pagedWeeks as string[]).map((weekStart: string) => {
                  const weekAllocations = group.allocations.filter(
                    (a: Allocation) =>
                      new Date(a.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
                  );
                  return (
                    <DroppableWeekCell
                      key={weekStart}
                      weekStart={weekStart}
                      resourceId={group.resource.id}
                    >
                      <div className="flex flex-col gap-1 w-full items-center">
                        {weekAllocations.length === 0 ? (
                          <span className="bg-slate-50 text-gray-400 px-2 py-1 rounded-full text-xs w-full text-center">No allocation</span>
                        ) : (
                          weekAllocations.map((allocation: Allocation) => (
                            <div key={allocation.id} onClick={() => handleAllocationClick(allocation)} className="w-full">
                              <DraggableAllocationBlock allocation={allocation} />
                            </div>
                          ))
                        )}
                      </div>
                    </DroppableWeekCell>
                  );
                })}
              </div>
              
              {/* Weekly summary row */}
              <div className="grid grid-cols-[200px_repeat(6,_minmax(0,_130px))] gap-x-0 bg-slate-100 py-2 border-t border-slate-200">
                <div className="text-xs italic text-gray-400 flex items-center justify-center px-2">Summary</div>
                {(pagedWeeks as string[]).map((weekStart: string) => {
                  const weekAllocations = group.allocations.filter(
                    (a: Allocation) =>
                      new Date(a.weekStart).toISOString().split('T')[0] === new Date(weekStart).toISOString().split('T')[0]
                  );
                  const totalAllocated = weekAllocations.reduce((sum: number, a: Allocation) => sum + a.days, 0);
                  const availableDays = Math.max(0, getWorkingDaysInWeek(weekStart) - totalAllocated);
                  const overallocated = totalAllocated > getWorkingDaysInWeek(weekStart);
                  return (
                    <div
                      key={weekStart}
                      className="flex flex-col items-center justify-center h-full px-2"
                      title="Total days allocated / available for this week"
                    >
                      <span className={`text-sm font-semibold ${overallocated ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{totalAllocated}d allocated</span>
                      <span className="text-xs text-gray-500">{availableDays}d available</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DragOverlay>
          {draggedAllocation ? <DraggableAllocationBlock allocation={draggedAllocation} /> : null}
        </DragOverlay>
      </DndContext>
      {/* Allocation Detail/Edit Modal */}
      {showAllocationModal && selectedAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editMode ? 'Edit Allocation' : 'Allocation Details'}</h3>
              <button onClick={() => { setShowAllocationModal(false); setEditMode(false); setEditForm(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-2">
              {editMode && editForm ? (
                <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                    {(Array.isArray(resources) ? resources : []).filter(r => {
                      const roleOpt = RESOURCE_ROLE_OPTIONS.find(opt => opt.value === r.role);
                      return roleOpt && roleOpt.isPlannable;
                    }).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type of Work</label>
                    <select value={editForm.workTypeId} onChange={e => setEditForm({ ...editForm, workTypeId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select value={editForm.projectId} onChange={e => setEditForm({ ...editForm, projectId: e.target.value })} className="w-full px-2 py-1 border rounded">
                      <option value="">-</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Week Start</label>
                    <input type="date" value={editForm.weekStart} onChange={e => setEditForm({ ...editForm, weekStart: e.target.value })} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days Allocated</label>
                    <input type="number" min="0" step="0.5" value={editForm.days} onChange={e => setEditForm({ ...editForm, days: e.target.value })} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50" onClick={handleEditCancel}>Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
                  </div>
                </form>
              ) : (
                <>
                  <div><strong>Resource:</strong> {selectedAllocation.resource.name}</div>
                  <div><strong>Type of Work:</strong> {selectedAllocation.workType.name}</div>
                  <div><strong>Project:</strong> {selectedAllocation.project?.name || '-'}</div>
                  <div><strong>Week Start:</strong> {new Date(selectedAllocation.weekStart).toLocaleDateString()}</div>
                  <div><strong>Days Allocated:</strong> {selectedAllocation.days}</div>
                  {selectedAllocation.notes && <div><strong>Notes:</strong> {selectedAllocation.notes}</div>}
                </>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 border-t">
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                onClick={async () => {
                  await apiClient(`/api/allocations/${selectedAllocation.id}`, { method: 'DELETE' });
                  setShowAllocationModal(false);
                  setSelectedAllocation(null);
                  mutateAllocations();
                  toast.success('Allocation deleted');
                }}
              >
                Delete
              </button>
              {!editMode && (
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  onClick={handleEdit}
                >
                  Edit
                </button>
              )}
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => { setShowAllocationModal(false); setEditMode(false); setEditForm(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Drag-and-drop move confirmation modal */}
      {pendingMove && dragTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Move</h3>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div>Move <strong>{pendingMove.allocation.project?.name || pendingMove.allocation.workType.name}</strong> allocation</div>
              <div>From: <strong>{pendingMove.allocation.resource.name}</strong> ({new Date(pendingMove.allocation.weekStart).toLocaleDateString()})</div>
              <div>To: <strong>{resourceGroups.find(g => g.resource.id === dragTarget.resourceId)?.resource.name || 'Unknown'}</strong> ({new Date(dragTarget.weekStart).toLocaleDateString()})</div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 border-t">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50" onClick={cancelMove}>Decline</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700" onClick={confirmMove}>Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 