'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/apiClient';
import { RESOURCE_ROLE_OPTIONS } from '../types/resourceRoles';
import { useForm } from 'react-hook-form';
import type { Resource, Project } from '../types/shared';
import { useResources, useProjects, useWorkTypes, useWeeks } from '../hooks/useApiData';
import { useWorkingDays } from '../hooks/useWorkingDays';

interface WorkType {
  id: string;
  name: string;
  color: string | null;
}

interface Week {
  weekStart: string;
}

interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: () => void;
}

export default function NewAssignmentModal({ isOpen, onClose, onAssignmentCreated }: NewAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Use custom hooks for data fetching
  const { data: resources } = useResources();
  const { data: projects } = useProjects();
  const { data: workTypes } = useWorkTypes();
  const { data: weeks } = useWeeks();
  
  // Use custom hooks for utilities
  const { getWorkingDaysInWeek } = useWorkingDays();
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      resourceId: '',
      workTypeId: '',
      description: '',
      customer: '',
      weekStart: '',
      endWeek: '',
      numWeeks: 1,
      days: 1,
    },
  });

  const [showNewProjectPrompt, setShowNewProjectPrompt] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    customer: '',
  });

  const [dateError, setDateError] = useState('');

  // Data is now fetched automatically by custom hooks

  // Auto-calculate number of weeks when start and end week are set
  useEffect(() => {
    const weekStart = watch('weekStart');
    const endWeek = watch('endWeek');
    if (weekStart && endWeek) {
      const start = new Date(weekStart);
      const end = new Date(endWeek);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setDateError('');
        return;
      }
      if (end < start) {
        setDateError('End week cannot be before start week.');
        setValue('numWeeks', 1);
      } else {
        setDateError('');
        // Calculate number of weeks (inclusive)
        const diff = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        setValue('numWeeks', diff);
      }
    } else {
      setDateError('');
    }
  }, [watch('weekStart'), watch('endWeek'), setValue]);

  // Remove fetchData since we're using custom hooks now

  const onAssignmentSubmit = async (data: any) => {
    if (dateError) {
      toast.error(dateError);
      return;
    }
    
    if (!data.resourceId || !data.workTypeId || !data.weekStart || data.days <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate weekStarts array
    let weekStarts: string[] = [];
    const start = new Date(data.weekStart);
    if (data.endWeek) {
      const end = new Date(data.endWeek);
      let current = new Date(start);
      while (current <= end) {
        weekStarts.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 7);
      }
    } else if (data.numWeeks > 1) {
      let current = new Date(start);
      for (let i = 0; i < data.numWeeks; i++) {
        weekStarts.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 7);
      }
    } else {
      weekStarts = [data.weekStart];
    }

    // Filter out weeks with no working days
    weekStarts = weekStarts.filter(w => getWorkingDaysInWeek(w) > 0);
    if (weekStarts.length === 0) {
      toast.error('All selected weeks are UK holidays or weekends. Please choose a different range.');
      return;
    }

    try {
      setLoading(true);

      // If description is provided and not in existing projects, prompt to create new project
      if (data.description && !projects.find((p: Project) => p.name === data.description)) {
        setNewProjectData({
          name: data.description,
          customer: data.customer,
        });
        setShowNewProjectPrompt(true);
        return;
      }

      await createAssignment(weekStarts, data);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (weekStarts: string[], formData: any, projectId?: string) => {
    const assignmentData = {
      resourceId: formData.resourceId,
      workTypeId: formData.workTypeId,
      weekStarts,
      days: formData.days,
      projectId: projectId || (formData.description ? projects.find((p: Project) => p.name === formData.description)?.id : null),
    };

    const response = await apiClient<{ success: boolean; data?: any; error?: string }>('/api/allocations', {
      method: 'POST',
      body: assignmentData,
    });

    if (response.success) {
      toast.success('Assignment created successfully');
      onAssignmentCreated();
      handleClose();
    } else {
      toast.error(response.error || 'Failed to create assignment');
    }
  };

  const handleCreateProject = async () => {
    // Get form data from the form state
    const formData = watch();
    
    // Generate weekStarts array (same logic as in handleSubmit)
    let weekStarts: string[] = [];
    const start = new Date(formData.weekStart);
    if (formData.endWeek) {
      const end = new Date(formData.endWeek);
      let current = new Date(start);
      while (current <= end) {
        weekStarts.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 7);
      }
    } else if (formData.numWeeks > 1) {
      let current = new Date(start);
      for (let i = 0; i < formData.numWeeks; i++) {
        weekStarts.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 7);
      }
    } else {
      weekStarts = [formData.weekStart];
    }

    // Filter out weeks with no working days
    weekStarts = weekStarts.filter(w => getWorkingDaysInWeek(w) > 0);
    if (weekStarts.length === 0) {
      toast.error('All selected weeks are UK holidays or weekends. Please choose a different range.');
      setShowNewProjectPrompt(false);
      setLoading(false);
      return;
    }
    try {
      const response = await apiClient<{ success: boolean; data?: any; error?: string }>('/api/projects', {
        method: 'POST',
        body: newProjectData,
      });
      if (response.success && response.data) {
        toast.success('Project created successfully');
        // Refresh projects list
        const projectsRes = await apiClient<{ success: boolean; data?: any[]; error?: string }>('/api/projects');
        if (projectsRes.success) {
          // setProjects(projectsData.data); // This line was removed from useProjects
        }
        // Create assignment with new project
        await createAssignment(weekStarts, formData, response.data.id);
      } else {
        toast.error(response.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setShowNewProjectPrompt(false);
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setShowNewProjectPrompt(false);
    setNewProjectData({ name: '', customer: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">New Assignment</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <form onSubmit={handleSubmit(onAssignmentSubmit)} className="space-y-4">
            {/* Resource */}
            <div>
              <label htmlFor="resource" className="block text-sm font-medium text-gray-700 mb-1">
                Resource *
              </label>
              <select
                id="resource"
                {...register('resourceId', { required: 'Resource is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a resource</option>
                {(Array.isArray(resources) ? resources : [])
                  .filter((r: Resource) =>
                    Array.isArray(r.roles) && r.roles.some((role: any) => RESOURCE_ROLE_OPTIONS.find(opt => opt.value === role.name && opt.isPlannable))
                  )
                  .map((resource: Resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} {resource.roles && resource.roles.length > 0 ? `(${resource.roles.map((r: any) => r.label).join(', ')})` : ''}
                    </option>
                  ))}
              </select>
              {errors.resourceId && <p className="text-red-600 text-xs mt-1">{errors.resourceId.message}</p>}
            </div>

            {/* Work Type */}
            <div>
              <label htmlFor="workType" className="block text-sm font-medium text-gray-700 mb-1">
                Type of Work *
              </label>
              <select
                id="workType"
                {...register('workTypeId', { required: 'Work type is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select work type</option>
                {workTypes.map((workType: WorkType) => (
                  <option key={workType.id} value={workType.id}>
                    {workType.name}
                  </option>
                ))}
              </select>
              {errors.workTypeId && <p className="text-red-600 text-xs mt-1">{errors.workTypeId.message}</p>}
            </div>

            {/* Description/Project */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description/Project
              </label>
              <input
                type="text"
                id="description"
                {...register('description', { required: 'Description or project is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter description or select existing project"
                list="projects-list"
              />
              <datalist id="projects-list">
                {projects.map((project: Project) => (
                  <option key={project.id} value={project.name} />
                ))}
              </datalist>
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
            </div>

            {/* Customer */}
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <input
                type="text"
                id="customer"
                {...register('customer')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer name"
              />
            </div>

            {/* Week Start */}
            <div>
              <label htmlFor="weekStart" className="block text-sm font-medium text-gray-700 mb-1">
                Week Start *
              </label>
              <input
                type="date"
                id="weekStart"
                {...register('weekStart', { required: 'Week start is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.weekStart && <p className="text-red-600 text-xs mt-1">{errors.weekStart.message}</p>}
            </div>

            {/* End Week */}
            <div>
              <label htmlFor="endWeek" className="block text-sm font-medium text-gray-700 mb-1">
                End Week (optional)
              </label>
              <input
                type="date"
                id="endWeek"
                {...register('endWeek')}
                className={`w-full px-3 py-2 border ${dateError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              {dateError && <p className="text-red-600 text-xs mt-1">{dateError}</p>}
            </div>

            {/* Number of Weeks */}
            <div>
              <label htmlFor="numWeeks" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Weeks (optional)
              </label>
              <input
                type="number"
                id="numWeeks"
                {...register('numWeeks', { valueAsNumber: true, min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>

            {/* Days Allocated */}
            <div>
              <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
                Days Allocated *
              </label>
              <input
                type="number"
                id="days"
                {...register('days', { required: 'Days allocated is required', valueAsNumber: true, min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.5"
              />
              {errors.days && <p className="text-red-600 text-xs mt-1">{errors.days.message}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Project Prompt Modal */}
      {showNewProjectPrompt && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Project?</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                Project "{newProjectData.name}" does not exist. Would you like to create it?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewProjectPrompt(false);
                    setLoading(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 