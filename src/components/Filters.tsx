'use client';

import { useEffect, useState } from 'react';
import { useResources, useProjects, useWorkTypes, useWeeks } from '../hooks/useApiData';
import { apiClient } from '../lib/apiClient';

interface FiltersProps {
  onFiltersChange: (filters: FilterParams) => void;
}

export interface FilterParams {
  resourceId?: string;
  projectId?: string;
  workTypeId?: string;
  weekStart?: string;
  weekEnd?: string;
  roleIds: string[];
}

export default function Filters({ onFiltersChange }: FiltersProps) {
  const [filters, setFilters] = useState<FilterParams>({ roleIds: [] });
  const [allRoles, setAllRoles] = useState<any[]>([]);

  // Fetch data for filter options using custom hooks
  const { data: resources } = useResources();
  const { data: projects } = useProjects();
  const { data: workTypes } = useWorkTypes();
  const { data: weeks } = useWeeks();

  // Fetch all roles from the API
  useEffect(() => {
    apiClient('/api/roles').then((data) => setAllRoles(Array.isArray((data as { data: any[] })?.data) ? (data as { data: any[] }).data : []));
  }, []);

  // Set default weekStart to the current week's Monday once weeks are loaded
  useEffect(() => {
    if (!filters.weekStart && Array.isArray(weeks) && weeks.length > 0) {
      const today = new Date();
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      const currentMondayISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      // Find the matching weekStart in the list; if not present, fall back to the first future/present week
      const weekStarts = (weeks as any[]).map((w: any) => String(w.weekStart).slice(0, 10));
      const chosen = weekStarts.includes(currentMondayISO)
        ? currentMondayISO
        : weekStarts.find(ws => new Date(ws) >= d) || weekStarts[0];
      const newFilters = { ...filters, weekStart: chosen };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    }
  }, [weeks]);

  const handleFilterChange = (key: keyof FilterParams, value: string) => {
    const newFilters = { ...filters, [key]: value, roleIds: filters.roleIds };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Add roleIds to filters (use role IDs)
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFilters(f => ({ ...f, roleIds: selected }));
    onFiltersChange({ ...filters, roleIds: selected });
  };

  const clearFilters = () => {
    setFilters({ roleIds: [] });
    onFiltersChange({ roleIds: [] });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Resource Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resource
          </label>
          <select
            value={filters.resourceId || ''}
            onChange={(e) => handleFilterChange('resourceId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Resources</option>
            {(Array.isArray(resources) ? resources : []).map((resource: any) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} {resource.roles && resource.roles.length > 0 ? `(${resource.roles.map((r: any) => r.label).join(', ')})` : ''}
              </option>
            ))}
          </select>
        </div>
        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role(s)
          </label>
          <select
            multiple
            value={filters.roleIds}
            onChange={handleRoleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {allRoles.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={filters.projectId || ''}
            onChange={(e) => handleFilterChange('projectId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Projects</option>
            {(Array.isArray(projects) ? projects : []).map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        {/* Work Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type of Work
          </label>
          <select
            value={filters.workTypeId || ''}
            onChange={(e) => handleFilterChange('workTypeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {(Array.isArray(workTypes) ? workTypes : []).map((workType: any) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </select>
        </div>
        {/* Week Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Week Range
          </label>
          <div className="flex gap-2">
            <select
              value={filters.weekStart || ''}
              onChange={(e) => handleFilterChange('weekStart', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">From</option>
              {(Array.isArray(weeks) ? weeks : []).map((week: any) => (
                <option key={week.weekStart} value={week.weekStart}>
                  {new Date(week.weekStart).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </option>
              ))}
            </select>
            <select
              value={filters.weekEnd || ''}
              onChange={(e) => handleFilterChange('weekEnd', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">To</option>
              {(Array.isArray(weeks) ? weeks : []).map((week: any) => (
                <option key={week.weekStart} value={week.weekStart}>
                  {new Date(week.weekStart).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Active Filters Display */}
      {Object.keys(filters).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              let label = '';
              let displayValue = value;
              switch (key) {
                case 'resourceId':
                  label = 'Resource';
                  const selectedResource = Array.isArray(resources) ? resources.find((r: any) => r.id === value) : undefined;
                  displayValue = selectedResource ? `${selectedResource.name} (${selectedResource.roles.map((r: any) => r.label).join(', ')})` : value;
                  break;
                case 'projectId':
                  label = 'Project';
                  const selectedProject = Array.isArray(projects) ? projects.find((p: any) => p.id === value) : undefined;
                  displayValue = selectedProject ? selectedProject.name : value;
                  break;
                case 'workTypeId':
                  label = 'Work Type';
                  const selectedWorkType = Array.isArray(workTypes) ? workTypes.find((w: any) => w.id === value) : undefined;
                  displayValue = selectedWorkType ? selectedWorkType.name : value;
                  break;
                case 'weekStart':
                  label = 'From Week';
                  displayValue = new Date(value).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit'
                  });
                  break;
                case 'weekEnd':
                  label = 'To Week';
                  displayValue = new Date(value).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit'
                  });
                  break;
                case 'roleIds': // Handle roleIds display
                  label = 'Role(s)';
                  displayValue = value.length > 0 ? value.map((id: string) => allRoles.find(r => r.id === id)?.label || id).join(', ') : 'All Roles';
                  break;
              }
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {label}: {displayValue}
                  <button
                    onClick={() => handleFilterChange(key as keyof FilterParams, '')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 