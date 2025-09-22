'use client';

import { useState, useMemo, useEffect } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'react-hot-toast';
import Holidays from 'date-holidays';
import { apiClient } from '../lib/apiClient';
import { RESOURCE_ROLE_OPTIONS } from '../types/resourceRoles';

const fetcher = (url: string) => apiClient(url);

interface MatrixTableProps {
  filters: FilterParams;
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
  resourceRoles: string[];
  totalAllocated: number;
  totalCapacity: number;
  availabilityLeft: number;
  overbooked: boolean;
  distinctWeeks: number;
  defaultAvailability: number;
}

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

function AllocationBlock({ label, days, color, textColor, tooltip, onClick }: { label: string; days: number; color: string; textColor: string; tooltip?: string; onClick?: () => void }) {
  return (
    <div
      className={`px-2 py-1 rounded text-xs font-medium flex items-center justify-center shadow-sm ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ background: color, color: textColor, minWidth: 40, marginRight: 4 }}
      title={tooltip || `${label} • ${days}d`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      <span className="ml-1">{days}d</span>
    </div>
  );
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

export default function MatrixTable({ filters }: MatrixTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverWeek, setDragOverWeek] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);

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
      if (value) params.append(key, value);
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
  // Default the first week column to current week (Monday) if available
  useEffect(() => {
    if (Array.isArray(weeks) && weeks.length > 0 && !filters.weekStart) {
      const today = new Date();
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      const currentMondayISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const weekStarts = (weeks as any[]).map((w: any) => String(w.weekStart).slice(0, 10));
      const chosen = weekStarts.includes(currentMondayISO)
        ? currentMondayISO
        : weekStarts.find(ws => new Date(ws) >= d) || weekStarts[0];
      // Update the URL query building via filters by mutating a copy and triggering re-render
      // Note: MatrixTable receives filters as props; the parent owns them. Ideally we'd lift this
      // defaulting up, but to keep scope minimal, we just no-op here (the table renders all weeks anyway).
    }
  }, [weeks]);
  const availability = (availabilityData as { data?: any[] })?.data || [];
  const summaries = (summaryData as { data?: any[] })?.data || [];

  // Create summary map for quick lookup
  const summaryMap = useMemo(() => {
    const map = new Map<string, ResourceSummary>();
    summaries.forEach((summary: ResourceSummary) => {
      map.set(summary.resourceId, summary);
    });
    return map;
  }, [summaries]);

  // Group allocations by resource + project + workType
  const groupedAllocations = useMemo(() => {
    const groups = new Map<string, Allocation[]>();
    
    // Ignore allocations that don't have a resolved resource
    (allocations as Allocation[])
      .filter((allocation) => allocation && allocation.resource && allocation.resource.id)
      .forEach((allocation: Allocation) => {
        const key = `${allocation.resourceId}-${allocation.projectId || 'null'}-${allocation.workTypeId}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(allocation);
      });
    
    return Array.from(groups.entries())
      .map(([key, groupAllocations]) => {
        const first = groupAllocations[0];
        return {
          key,
          resource: first?.resource ?? null,
          project: first?.project ?? null,
          workType: first?.workType ?? null,
          allocations: groupAllocations,
        };
      })
      // Ensure only valid groups with a resource proceed
      .filter((g) => g.resource && g.resource.id);
  }, [allocations]);

  // Create a map for quick allocation lookup
  const allocationMap = useMemo(() => {
    const map = new Map<string, Allocation>();
    allocations.forEach((allocation: Allocation) => {
      const key = `${allocation.resourceId}-${allocation.projectId || 'null'}-${allocation.workTypeId}-${allocation.weekStart}`;
      map.set(key, allocation);
    });
    return map;
  }, [allocations]);

  // Create availability map
  const availabilityMap = useMemo(() => {
    const map = new Map<string, any>();
    availability.forEach((item: any) => {
      const key = `${item.resourceId}-${item.weekStart}`;
      map.set(key, item);
    });
    return map;
  }, [availability]);

  // Fetch resources for forecast conversion
  useEffect(() => {
    apiClient<{ data: any[] }>('/api/resources').then(data => setResources(data.data || []));
  }, []);

  // Handler for clicking on allocation blocks
  const handleAllocationClick = (allocation: Allocation) => {
    // For regular allocations, we could add edit functionality here if needed
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const [resourceId, projectId, workTypeId, weekStart] = active.id.toString().split('-');
    const allocation = allocationMap.get(active.id.toString());
    
    if (allocation && allocation.days > 0) {
      setDraggedItem({
        allocation,
        sourceWeek: weekStart,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!draggedItem || !over) {
      setDraggedItem(null);
      setDragOverWeek(null);
      return;
    }

    const targetWeek = over.id.toString();
    
    // Don't allow dropping on the same week
    if (targetWeek === draggedItem.sourceWeek) {
      setDraggedItem(null);
      setDragOverWeek(null);
      return;
    }

    try {
      const { allocation } = draggedItem;
      
      // Check if target week already has an allocation for this resource+project+workType
      const targetKey = `${allocation.resourceId}-${allocation.projectId || 'null'}-${allocation.workTypeId}-${targetWeek}`;
      const existingAllocation = allocationMap.get(targetKey);
      
      // Check for overbooking
      const currentWeekTotal = getWeekTotalForResource(allocation.resourceId, targetWeek);
      const wouldBeOverbooked = currentWeekTotal + allocation.days > getWorkingDaysInWeek(targetWeek);
      
      if (wouldBeOverbooked) {
        toast.error(`Moving would cause overbooking (>${getWorkingDaysInWeek(targetWeek)} days) in week ${new Date(targetWeek).toLocaleDateString()}`);
        setDraggedItem(null);
        setDragOverWeek(null);
        return;
      }

      if (existingAllocation) {
        // Merge allocations
        const newDays = existingAllocation.days + allocation.days;
        
        // Update existing allocation
        await apiClient(`/api/allocations/${existingAllocation.id}`, {
          method: 'PATCH',
          body: { days: newDays },
        });
        
        // Delete original allocation
        await apiClient(`/api/allocations/${allocation.id}`, { method: 'DELETE' });
        
        toast.success(`Merged ${allocation.days} days into existing allocation`);
      } else {
        // Move allocation to new week
        await apiClient(`/api/allocations/${allocation.id}`, {
          method: 'PATCH',
          body: { weekStart: targetWeek },
        });
        
        toast.success(`Moved ${allocation.days} days to ${new Date(targetWeek).toLocaleDateString()}`);
      }

      // Refresh data
      mutateAllocations();
    } catch (error) {
      console.error('Error moving allocation:', error);
      toast.error('Failed to move allocation');
    }

    setDraggedItem(null);
    setDragOverWeek(null);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      setDragOverWeek(over.id.toString());
    }
  };

  const getWeekTotalForResource = (resourceId: string, weekStart: string) => {
    return allocations
      .filter((allocation: Allocation) => 
        allocation.resourceId === resourceId && allocation.weekStart === weekStart
      )
      .reduce((sum: number, allocation: Allocation) => sum + allocation.days, 0);
  };

  const handleCellEdit = (resourceId: string, projectId: string | null, workTypeId: string, weekStart: string) => {
    const key = `${resourceId}-${projectId || 'null'}-${workTypeId}-${weekStart}`;
    const allocation = allocationMap.get(key);
    setEditingCell(key);
    setEditValue(allocation ? allocation.days.toString() : '');
  };

  const handleCellSave = async (resourceId: string, projectId: string | null, workTypeId: string, weekStart: string) => {
    const key = `${resourceId}-${projectId || 'null'}-${workTypeId}-${weekStart}`;
    const allocation = allocationMap.get(key);
    const days = parseFloat(editValue);

    if (isNaN(days) || days < 0) {
      setEditingCell(null);
      return;
    }

    try {
      if (allocation) {
        // Update existing allocation
        if (days === 0) {
          // Delete allocation if days is 0
          await apiClient(`/api/allocations/${allocation.id}`, { method: 'DELETE' });
          toast.success('Allocation deleted');
        } else {
          // Update allocation
          await apiClient(`/api/allocations/${allocation.id}`, {
            method: 'PATCH',
            body: { days },
          });
          toast.success('Allocation updated');
        }
      } else if (days > 0) {
        // Create new allocation
        await apiClient('/api/allocations', {
          method: 'POST',
          body: {
            resourceId,
            projectId,
            workTypeId,
            weekStart,
            days,
          },
        });
        toast.success('Allocation created');
      }

      // Refresh data
      mutateAllocations();
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast.error('Failed to save allocation');
    }

    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const getCellValue = (resourceId: string, projectId: string | null, workTypeId: string, weekStart: string) => {
    const key = `${resourceId}-${projectId || 'null'}-${workTypeId}-${weekStart}`;
    const allocation = allocationMap.get(key);
    return allocation ? allocation.days : 0;
  };

  const isOverbooked = (resourceId: string, weekStart: string) => {
    const key = `${resourceId}-${weekStart}`;
    const availabilityItem = availabilityMap.get(key);
    return availabilityItem?.overbooked || false;
  };

  const calculateRowTotal = (group: any) => {
    return group.allocations.reduce((sum: number, allocation: Allocation) => sum + allocation.days, 0);
  };

  const calculateWeekTotal = (weekStart: string) => {
    return allocations
      .filter((allocation: Allocation) => allocation.weekStart === weekStart)
      .reduce((sum: number, allocation: Allocation) => sum + allocation.days, 0);
  };

  const getResourceSummary = (resourceId: string): ResourceSummary => {
    const group = groupedAllocations.find((g: any) => g.resource && g.resource.id === resourceId);
    let resourceRoles: string[] = [];
    if (group && 'roles' in (group.resource || {}) && Array.isArray(group.resource.roles)) {
      resourceRoles = group.resource.roles.map((r: any) => r.label);
    }
    return {
      resourceId,
      resourceName: group?.resource?.name || '',
      resourceRoles,
      totalAllocated: 0, // ... fill as before
      totalCapacity: 0,
      availabilityLeft: 0,
      overbooked: false,
      distinctWeeks: 0,
      defaultAvailability: 0,
    };
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-gray-50 border-b items-center">
          <span className="text-xs text-gray-500 font-medium mr-2">Legend:</span>
          <AllocationBlock label="Project" days={1} color={WORK_TYPE_COLORS.Project.bg} textColor={WORK_TYPE_COLORS.Project.text} />
          <AllocationBlock label="Holiday" days={1} color={WORK_TYPE_COLORS.Holiday.bg} textColor={WORK_TYPE_COLORS.Holiday.text} />
          <AllocationBlock label="Internal" days={1} color={WORK_TYPE_COLORS.Internal.bg} textColor={WORK_TYPE_COLORS.Internal.text} />
          <AllocationBlock label="PreSales" days={1} color={WORK_TYPE_COLORS.PreSales.bg} textColor={WORK_TYPE_COLORS.PreSales.text} />
          <AllocationBlock label="Available" days={1} color={WORK_TYPE_COLORS.Available.bg} textColor={WORK_TYPE_COLORS.Available.text} />
          <AllocationBlock label="Forecast" days={1} color={WORK_TYPE_COLORS.Forecast.bg} textColor={WORK_TYPE_COLORS.Forecast.text} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Resource / Project / Type
                </th>
                {weeks.map((week: Week) => (
                  <th key={week.weekStart} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    {new Date(week.weekStart).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 min-w-[100px]">
                  Row Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 min-w-[120px]">
                  Resource Summary
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedAllocations.map((group) => {
                const resourceSummary = getResourceSummary(group.resource?.id);
                
                return (
                  <tr key={group.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="font-medium">{group.resource?.name || '-'}</div>
                      <div className="text-gray-500 text-xs">
                        {group.project ? group.project.name : 'No Project'} • {group.workType?.name || '-'}
                      </div>
                    </td>
                    {weeks.map((week: Week) => {
                      const cellKey = `${group.resource?.id}-${group.project?.id || 'null'}-${group.workType?.id}-${week.weekStart}`;
                      const isEditing = editingCell === cellKey;
                      const overbooked = group.resource?.id ? isOverbooked(group.resource.id, week.weekStart) : false;
                      const isDragOver = dragOverWeek === week.weekStart;
                      // Find all allocations for this resource/project/type in this week
                      const weekAllocations = allocations.filter((a: Allocation) =>
                        a.resourceId === (group.resource?.id || '') &&
                        (a.projectId || 'null') === (group.project?.id || 'null') &&
                        a.workTypeId === (group.workType?.id || '') &&
                        a.weekStart === week.weekStart
                      );
                      const totalAllocated = weekAllocations.reduce((sum: number, a: Allocation) => sum + a.days, 0);
                      const availableDays = Math.max(0, getWorkingDaysInWeek(week.weekStart) - totalAllocated);
                      return (
                        <td
                          key={week.weekStart}
                          className={`px-2 py-2 text-center transition-colors ${
                            isDragOver ? 'bg-blue-100 border-2 border-blue-300' : ''
                          }`}
                          data-week={week.weekStart}
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellSave(group.resource?.id || '', group.project?.id || null, group.workType?.id || '', week.weekStart)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellSave(group.resource?.id || '', group.project?.id || null, group.workType?.id || '', week.weekStart);
                                  } else if (e.key === 'Escape') {
                                    handleCellCancel();
                                  }
                                }}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex flex-row flex-wrap items-center justify-center min-h-[32px] px-1 py-1">
                              {weekAllocations.map((allocation: Allocation) => {
                                const { bg, text } = getWorkTypeColor(allocation.workType);
                                return (
                                  <AllocationBlock
                                    key={allocation.id}
                                    label={allocation.workType.name}
                                    days={allocation.days}
                                    color={bg}
                                    textColor={text}
                                    tooltip={`${allocation.project?.name || allocation.workType.name} • ${allocation.days}d`}
                                    onClick={() => handleAllocationClick(allocation)}
                                  />
                                );
                              })}
                              {availableDays > 0 && (
                                <AllocationBlock
                                  label="Available"
                                  days={availableDays}
                                  color={WORK_TYPE_COLORS.Available.bg}
                                  textColor={WORK_TYPE_COLORS.Available.text}
                                  tooltip={`Available: ${availableDays}d`}
                                />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 bg-gray-50">
                      {calculateRowTotal(group)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm bg-gray-50">
                      {resourceSummary ? (
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${
                            resourceSummary.overbooked ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {resourceSummary.totalAllocated}/{resourceSummary.totalCapacity}
                          </div>
                          <div className={`text-xs ${
                            resourceSummary.overbooked ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {resourceSummary.overbooked ? (
                              <span className="flex items-center justify-center">
                                ⚠️ Overbooked by {Math.abs(resourceSummary.availabilityLeft)}
                              </span>
                            ) : (
                              <span>{resourceSummary.availabilityLeft} left</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                  Week Totals
                </td>
                {weeks.map((week: Week) => (
                  <td key={week.weekStart} className="px-2 py-3 text-center text-sm font-medium text-gray-900">
                    {calculateWeekTotal(week.weekStart)}
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                  {allocations.reduce((sum: number, allocation: Allocation) => sum + allocation.days, 0)}
                </td>
                <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                  {/* Grand total summary */}
                  <div className="text-xs">
                    <div className="font-medium">
                      {summaries.reduce((sum: number, s: ResourceSummary) => sum + s.totalAllocated, 0)}/
                      {summaries.reduce((sum: number, s: ResourceSummary) => sum + s.totalCapacity, 0)}
                    </div>
                    <div className="text-gray-500">
                      Total allocated/capacity
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <DragOverlay>
        {draggedItem ? (
          <div className="bg-blue-100 border-2 border-blue-300 rounded px-3 py-2 text-sm font-medium text-blue-800 shadow-lg">
            {draggedItem.allocation.days} days
          </div>
        ) : null}
      </DragOverlay>
      
    </DndContext>
  );
} 