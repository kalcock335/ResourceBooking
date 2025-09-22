'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import NewAssignmentModal from './NewAssignmentModal';
import { Dialog } from '@headlessui/react';
import Link from 'next/link';
import Holidays from 'date-holidays';
import { apiClient } from '../lib/apiClient';
import { RESOURCE_ROLE_OPTIONS } from '../types/resourceRoles';
import { useForm } from 'react-hook-form';
import { useForm as useProjectForm } from 'react-hook-form';
import { useForm as useSkillForm } from 'react-hook-form';
import type { Resource, Project, Skill, ResourceSkill } from '../types/shared';
import type { Role } from '../types/shared';

export default function AdminPanel() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordResourceId, setPasswordResourceId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Resource form state
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      roleIds: [],
      jobTitle: '',
      defaultAvailability: 5,
    },
  });

  // Project form state
  const { register: registerProject, handleSubmit: handleProjectSubmit, reset: resetProject, formState: { errors: projectErrors } } = useProjectForm({
    defaultValues: {
      name: '',
      customer: '',
    },
  });

  // Editing state
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', roleIds: [] as string[], jobTitle: '', isActive: true });
  const [editLoading, setEditLoading] = useState(false);

  // Utilization Report State
  const [utilization, setUtilization] = useState<any[]>([]);
  const [utilLoading, setUtilLoading] = useState(true);

  // Skills/Certifications State
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [resourceSkills, setResourceSkills] = useState<ResourceSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Form state for adding new skills
  const { register: registerSkill, handleSubmit: handleSkillSubmit, reset: resetSkill, formState: { errors: skillErrors } } = useSkillForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Fetch roles for select options
  const [roles, setRoles] = useState<Role[]>([]);
  useEffect(() => {
    apiClient<{ success: boolean; data: Role[] }>('/api/roles').then(res => {
      if (res.success) setRoles(res.data);
    });
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    calculateUtilization();
  }, []);

  // Fetch all skills and assigned skills when editing a resource
  useEffect(() => {
    if (editingResourceId) {
      setSkillsLoading(true);
      apiClient<{ data: any[] }>('/api/skills')
        .then((data) => setAllSkills((data as { data: any[] }).data || []));
      apiClient(`/api/resource-skills?resourceId=${editingResourceId}`)
        .then((data) => setResourceSkills((data as { data: any[] }).data || []))
        .finally(() => setSkillsLoading(false));
    }
  }, [editingResourceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resourcesRes, projectsRes] = await Promise.all([
        apiClient('/api/resources'),
        apiClient('/api/projects'),
      ]);

      if (resourcesRes && Array.isArray((resourcesRes as any).data)) {
        setResources((resourcesRes as any).data as Resource[]);
      }

      if (projectsRes && Array.isArray((projectsRes as any).data)) {
        setProjects((projectsRes as any).data as Project[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate available working days for a date range, excluding weekends and UK bank holidays
  function getWorkingDays(start: Date, end: Date) {
    const hd = new Holidays('GB', 'ENG'); // England (adjust for Wales/Scotland/NI if needed)
    let count = 0;
    let d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      const isWeekend = day === 0 || day === 6;
      const isHoliday = hd.isHoliday(d);
      if (!isWeekend && !isHoliday) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  // Calculate utilization for each resource
  async function calculateUtilization() {
    setUtilLoading(true);
    try {
      // Fetch allocations and resources
      const [allocRes, resourcesRes] = await Promise.all([
        apiClient<{ success: boolean; data: any[] }>('/api/allocations'),
        apiClient<{ success: boolean; data: Resource[] }>('/api/resources'),
      ]);
      const allocData = allocRes.data;
      const resourcesData = resourcesRes.data;
      if (!allocData.length || !resourcesData.length) return;
      const allocations = allocData;
      const resources = resourcesData;
      // Find min and max weekStart
      const weekStarts = allocations.map((a: any) => new Date(a.weekStart).getTime());
      if (weekStarts.length === 0) return setUtilization([]);
      const minDate = new Date(Math.min(...weekStarts));
      const maxDate = new Date(Math.max(...weekStarts));
      // Calculate available days for each resource
      const availableDays = getWorkingDays(minDate, maxDate);
      // Group allocations by resource
      const byResource: Record<string, number> = {};
      allocations.forEach((a: any) => {
        if (!byResource[a.resourceId]) byResource[a.resourceId] = 0;
        byResource[a.resourceId] += a.days;
      });
      // Build utilization array
      const utilArr = resources.map((r: any) => {
        const allocated = byResource[r.id] || 0;
        const utilization = availableDays > 0 ? Math.round((allocated / availableDays) * 100) : 0;
        return {
          name: r.name,
          role: r.role,
          allocated,
          available: availableDays,
          utilization,
        };
      });
      setUtilization(utilArr);
    } finally {
      setUtilLoading(false);
    }
  }

  // Handler to add a skill to resource
  const handleAddSkill = async (skillId: string) => {
    setSkillsLoading(true);
    await apiClient('/api/resource-skills', {
      method: 'POST',
      body: { resourceId: editingResourceId, skillId },
    });
    // Refresh
    apiClient(`/api/resource-skills?resourceId=${editingResourceId}`)
      .then((data) => setResourceSkills((data as { data: any[] }).data || []))
      .finally(() => setSkillsLoading(false));
  };

  // Handler to remove a skill from resource
  const handleRemoveSkill = async (resourceSkillId: string) => {
    setSkillsLoading(true);
    await apiClient(`/api/resource-skills?id=${resourceSkillId}`, { method: 'DELETE' });
    apiClient(`/api/resource-skills?resourceId=${editingResourceId}`)
      .then((data) => setResourceSkills((data as { data: any[] }).data || []))
      .finally(() => setSkillsLoading(false));
  };

  // Handler to update proficiency/expiry
  const handleUpdateResourceSkill = async (resourceSkillId: string, updates: Partial<ResourceSkill>) => {
    setSkillsLoading(true);
    await apiClient(`/api/resource-skills?id=${resourceSkillId}`, {
      method: 'PATCH',
      body: updates,
    });
    apiClient(`/api/resource-skills?resourceId=${editingResourceId}`)
      .then((data) => setResourceSkills((data as { data: any[] }).data || []))
      .finally(() => setSkillsLoading(false));
  };

  const onResourceSubmit = async (data: any) => {
    try {
      setResourceLoading(true);
      const response = await apiClient('/api/resources', {
        method: 'POST',
        body: {
          name: data.name.trim(),
          roleIds: Array.isArray(data.roleIds) ? data.roleIds : [data.roleIds],
          jobTitle: data.jobTitle.trim() || null,
        },
      });
      const resData = response as { success: boolean; error?: string };
      if (resData.success) {
        toast.success('Resource created successfully');
        reset();
        fetchData();
      } else {
        toast.error(resData.error || 'Failed to create resource');
      }
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to create resource');
    } finally {
      setResourceLoading(false);
    }
  };

  const onProjectSubmit = async (data: any) => {
    try {
      setProjectLoading(true);
      const response = await apiClient('/api/projects', {
        method: 'POST',
        body: {
          name: data.name.trim(),
          customer: data.customer.trim(),
        },
      });
      const resData = response as { success: boolean; error?: string };
      if (resData.success) {
        toast.success('Project created successfully');
        resetProject();
        fetchData();
      } else {
        toast.error(resData.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setProjectLoading(false);
    }
  };

  const handleAssignmentCreated = () => {
    // Refresh the admin panel data
    fetchData();
  };

  const startEditResource = (resource: Resource) => {
    setEditingResourceId(resource.id);
    setEditForm({
      name: resource.name,
      // Ensure roleIds are always strings (sometimes Prisma returns Buffer or other types)
      roleIds: Array.isArray(resource.roles) ? resource.roles.map(r => String(r.id)) : [],
      jobTitle: resource.jobTitle || '',
      isActive: resource.isActive,
    });
  };

  const cancelEditResource = () => {
    setEditingResourceId(null);
    setEditForm({ name: '', roleIds: [], jobTitle: '', isActive: true });
  };

  const saveEditResource = async (id: string) => {
    // Confirmation dialog for role change
    const original = resources.find(r => r.id === id);
    if (original && original.roles.length !== editForm.roleIds.length) {
      const ok = window.confirm(`Are you sure you want to change roles?`);
      if (!ok) return;
    }
    try {
      setEditLoading(true);
      const response = await apiClient(`/api/resources/${id}`, {
        method: 'PATCH',
        body: editForm,
      });
      const data = response as { success: boolean; error?: string };
      if (data.success) {
        toast.success('Resource updated');
        fetchData();
        cancelEditResource();
      } else {
        toast.error(data.error || 'Failed to update resource');
      }
    } catch (error) {
      toast.error('Failed to update resource');
    } finally {
      setEditLoading(false);
    }
  };

  const handleArchiveResource = async (resource: Resource) => {
    // Confirmation dialog for archiving/restoring
    const ok = window.confirm(`Are you sure you want to ${resource.isActive ? 'archive' : 'restore'} this user?`);
    if (!ok) return;
    try {
      setEditLoading(true);
      const response = await apiClient(`/api/resources/${resource.id}`, {
        method: 'PATCH',
        body: { isActive: !resource.isActive },
      });
      const data = response as { success: boolean; error?: string };
      if (data.success) {
        toast.success(resource.isActive ? 'Resource archived' : 'Resource restored');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to update resource');
      }
    } catch (error) {
      toast.error('Failed to update resource');
    } finally {
      setEditLoading(false);
    }
  };

  // Password reset handler
  const openPasswordModal = (resourceId: string) => {
    setPasswordResourceId(resourceId);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalOpen(true);
  };
  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordResourceId(null);
    setNewPassword('');
    setConfirmPassword('');
  };
  const handlePasswordReset = async () => {
    if (!passwordResourceId || !newPassword.trim()) return;
    setPasswordLoading(true);
    try {
      const response = await apiClient(`/api/resources/${passwordResourceId}/password`, {
        method: 'PATCH',
        body: { password: newPassword },
      });
      const data = response as { success: boolean; error?: string };
      if (data.success) {
        toast.success('Password updated');
        closePasswordModal();
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password strength validation function
  function validatePassword(pw: string) {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must include a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include a special character.';
    return '';
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Utilization Report */}
      

      {/* Resource Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Resource Management</h2>
        </div>
        
        <div className="p-6">
          {/* Add Resource Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Resource</h3>
            <form onSubmit={handleSubmit(onResourceSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="resourceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="resourceName"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter resource name"
                  />
                  {errors.name && <span className="text-red-600 text-xs">{errors.name.message}</span>}
                </div>
                <div>
                  <label htmlFor="resourceRoles" className="block text-sm font-medium text-gray-700 mb-1">
                    Roles
                  </label>
                  <select
                    id="resourceRoles"
                    multiple
                    {...register('roleIds', { required: 'At least one role is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {RESOURCE_ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.roleIds && <span className="text-red-600 text-xs">{errors.roleIds.message as string}</span>}
                </div>
                <div>
                  <label htmlFor="resourceJobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    id="resourceJobTitle"
                    {...register('jobTitle')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter job title (optional)"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={resourceLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resourceLoading ? 'Adding...' : 'Add Resource'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Resources Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(Array.isArray(resources) ? resources : []).map((resource) => (
                  <tr key={resource.id}>
                    {editingResourceId === resource.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-2 py-1 border rounded" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <select
                            multiple
                            value={editForm.roleIds}
                            onChange={e => setEditForm({ ...editForm, roleIds: Array.from(e.target.selectedOptions).map(option => option.value) })}
                            className="w-full px-2 py-1 border rounded"
                          >
                            {roles.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input value={editForm.jobTitle} onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })} className="w-full px-2 py-1 border rounded" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${editForm.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{editForm.isActive ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resource._count?.allocations || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => saveEditResource(resource.id)} disabled={editLoading} className="mr-2 text-blue-600">Save</button>
                          <button onClick={cancelEditResource} disabled={editLoading} className="text-gray-500">Cancel</button>
                        </td>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap bg-gray-50" style={{ borderTop: '1px solid #eee' }}>
                          <div>
                            <strong>Skills/Certifications:</strong>
                            {skillsLoading ? (
                              <span className="ml-2 text-gray-400">Loading...</span>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {/* Assigned skills */}
                                {resourceSkills.map(rs => (
                                  <div key={rs.id} className="flex items-center gap-2">
                                    <span className="font-medium">{rs.skill.name}</span>
                                    <input
                                      type="text"
                                      placeholder="Proficiency (e.g. Advanced)"
                                      value={rs.proficiency || ''}
                                      onChange={e => handleUpdateResourceSkill(rs.id, { proficiency: e.target.value })}
                                      className="px-2 py-1 border rounded w-32"
                                    />
                                    <input
                                      type="date"
                                      value={rs.expiry ? rs.expiry.slice(0, 10) : ''}
                                      onChange={e => handleUpdateResourceSkill(rs.id, { expiry: e.target.value })}
                                      className="px-2 py-1 border rounded w-36"
                                    />
                                    <button onClick={() => handleRemoveSkill(rs.id)} className="text-red-600 hover:underline ml-2">Remove</button>
                                  </div>
                                ))}
                                {/* Add skill dropdown */}
                                <div className="flex items-center gap-2 mt-2">
                                  <select
                                    className="px-2 py-1 border rounded w-48"
                                    value=""
                                    onChange={e => {
                                      if (e.target.value) handleAddSkill(e.target.value);
                                    }}
                                  >
                                    <option value="">Add skill...</option>
                                    {allSkills.filter(s => !resourceSkills.some(rs => rs.skillId === s.id)).map(skill => (
                                      <option key={skill.id} value={skill.id}>{skill.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{resource.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {resource.roles && resource.roles.length > 0
                            ? resource.roles.map((r: any) => r.label).join(', ')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resource.jobTitle || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${resource.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{resource.isActive ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resource._count?.allocations || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => startEditResource(resource)} className="mr-2 text-blue-600">Edit</button>
                          <button onClick={() => handleArchiveResource(resource)} disabled={editLoading} className="text-gray-500 mr-4">{resource.isActive ? 'Archive' : 'Restore'}</button>
                          <button onClick={() => openPasswordModal(resource.id)} className="text-gray-500">Reset Password</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {resources.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No resources found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Project Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Project Management</h2>
        </div>
        
        <div className="p-6">
          {/* Add Project Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Project</h3>
            <form onSubmit={handleProjectSubmit(onProjectSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    {...registerProject('name', { required: 'Name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                  {projectErrors.name && <span className="text-red-600 text-xs">{projectErrors.name.message}</span>}
                </div>
                <div>
                  <label htmlFor="projectCustomer" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <input
                    type="text"
                    id="projectCustomer"
                    {...registerProject('customer', { required: 'Customer is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer name"
                  />
                  {projectErrors.customer && <span className="text-red-600 text-xs">{projectErrors.customer.message}</span>}
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={projectLoading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {projectLoading ? 'Adding...' : 'Add Project'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Projects Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocations
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.customer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        project.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {project.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project._count?.allocations || 0}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Assignment Modal */}
      <NewAssignmentModal
        isOpen={isNewAssignmentModalOpen}
        onClose={() => setIsNewAssignmentModalOpen(false)}
        onAssignmentCreated={handleAssignmentCreated}
      />

      {/* Password reset modal */}
      <Dialog open={passwordModalOpen} onClose={closePasswordModal} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black opacity-30" />
          <div className="bg-white rounded-lg shadow-xl p-6 z-10 w-full max-w-md mx-auto">
            <Dialog.Title className="text-lg font-semibold mb-2">Reset Password</Dialog.Title>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-2"
              placeholder="New password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                setPasswordError(validatePassword(e.target.value));
              }}
              disabled={passwordLoading}
            />
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-2"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={passwordLoading}
            />
            {passwordError && (
              <div className="text-red-600 text-sm mb-2">{passwordError}</div>
            )}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="text-red-600 text-sm mb-2">Passwords do not match.</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={closePasswordModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 bg-blue-600 text-white rounded"
                disabled={
                  passwordLoading ||
                  !newPassword.trim() ||
                  !confirmPassword.trim() ||
                  newPassword !== confirmPassword ||
                  !!passwordError
                }
              >
                {passwordLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Skills & Certifications Management */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Certifications</h2>
        <SkillsManagement />
      </div>
    </div>
  );
}

function SkillsManagement() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSkills(); }, []);
  async function fetchSkills() {
    setLoading(true);
    const res = await apiClient<{ success: boolean; data: Skill[] }>('/api/skills');
    if (res.success) setSkills(res.data || []);
    setLoading(false);
  }
  const { register: registerSkill, handleSubmit: handleSkillSubmit, reset: resetSkill, formState: { errors: skillErrors } } = useSkillForm({
    defaultValues: {
      name: '',
      description: '',
    },
  });
  const onAddSkill = async (data: any) => {
    if (!data.name.trim()) return;
    setLoading(true);
    await apiClient('/api/skills', {
      method: 'POST',
      body: data,
    });
    resetSkill();
    fetchSkills();
    setLoading(false);
  };
  async function deleteSkill(id: string) {
    setLoading(true);
    await apiClient(`/api/skills?id=${id}`, { method: 'DELETE' });
    fetchSkills();
  }
  return (
    <div>
      <form onSubmit={handleSkillSubmit(onAddSkill)} className="flex gap-2 mb-4">
        <input type="text" placeholder="Skill/Certification Name" {...registerSkill('name', { required: 'Name is required' })} className="px-2 py-1 border rounded w-48" />
        <input type="text" placeholder="Description (optional)" {...registerSkill('description')} className="px-2 py-1 border rounded w-64" />
        <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">Add</button>
        {skillErrors.name && <span className="text-red-600 text-xs ml-2">{skillErrors.name.message}</span>}
      </form>
      {loading ? <div>Loading...</div> : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skills.map((skill: Skill) => (
              <tr key={skill.id}>
                <td className="px-4 py-2 text-sm">{skill.name}</td>
                <td className="px-4 py-2 text-sm">{skill.description || '-'}</td>
                <td className="px-4 py-2 text-sm">
                  <button onClick={() => deleteSkill(skill.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {skills.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-2 text-center text-gray-400">No skills found.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
} 