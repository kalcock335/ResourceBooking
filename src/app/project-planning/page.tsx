"use client";
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { addWeeks, format, parseISO } from 'date-fns';
import { apiClient } from '../../lib/apiClient';
import { RESOURCE_ROLE_OPTIONS } from '../../types/resourceRoles';
import type { Project, Skill, Resource } from '../../types/shared';

// Helper: get array of week start dates for a forecast
function getForecastWeeks(startDate: string, numWeeks: number) {
  const weeks: string[] = [];
  if (!startDate || !numWeeks) return weeks;
  let d = parseISO(startDate);
  for (let i = 0; i < numWeeks; i++) {
    weeks.push(format(addWeeks(d, i), 'yyyy-MM-dd'));
  }
  return weeks;
}

// Helper: UK date format
function formatUK(dateStr: string) {
  const d = parseISO(dateStr);
  return format(d, 'dd-MM-yyyy');
}

export default function ProjectPlanningPage() {
  // All hooks must be called unconditionally and before any return
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: '', customer: '' });
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    role: '',
    quantity: 1,
    daysPerWeek: 1,
    numWeeks: 1,
    startDate: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ daysPerWeek: number; quantity: number }>({ daysPerWeek: 1, quantity: 1 });
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // allocationId -> resourceId
  const [resourceLoading, setResourceLoading] = useState(false);
  const [rowResources, setRowResources] = useState<Record<string, string>>({}); // rowId -> resourceId
  const [cellDays, setCellDays] = useState<Record<string, number>>({}); // rowId-week -> days
  const [totalProjectDays, setTotalProjectDays] = useState<number | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, { available: number; overbooked: boolean }>>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const allWeeks = useMemo(() => Array.from(new Set(allocations.flatMap(a => getForecastWeeks(a.startDate, a.numWeeks)))).sort(), [allocations]);
  const rows = useMemo(() => allocations.flatMap(a =>
    Array.from({ length: a.quantity }, (_, i) => ({ ...a, slot: i + 1, rowId: `${a.id}-slot${i + 1}` }))
  ), [allocations]);
  // Add state for allocations
  // const [allocations, setAllocations] = useState<any[]>([]); // This line is removed as per the new_code

  useEffect(() => {
    apiClient<{ success: boolean; data: any[] }>('/api/projects').then(data => {
      if (data.success) setProjects(data.data);
    });
  }, []);

  useEffect(() => {
    apiClient<{ success: boolean; data: any[] }>('/api/skills').then(data => {
      if (data.success) setSkills(data.data);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setAllocations([]);
      return;
    }
    setAllocationsLoading(true);
    apiClient<{ success: boolean; data: any[] }>(`/api/allocations?projectId=${selectedProjectId}`)
      .then(data => {
        if (data.success) setAllocations(data.data);
        else setAllocations([]);
      })
      .finally(() => setAllocationsLoading(false));
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setResourceLoading(true);
    apiClient<{ success: boolean; data: any[] }>('/api/resources')
      .then(data => {
        if (data.success) setResources(data.data);
      })
      .finally(() => setResourceLoading(false));
  }, [selectedProjectId, allocations.length]);

  useEffect(() => {
    async function fetchAvailability() {
      const pairs: { resourceId: string; week: string }[] = [];
      rows.forEach((row: any) => {
        allWeeks.forEach((week: string) => {
          if (getForecastWeeks(row.startDate, row.numWeeks).includes(week) && rowResources[row.rowId]) {
            pairs.push({ resourceId: rowResources[row.rowId], week });
          }
        });
      });
      // Remove duplicates
      const uniquePairs = Array.from(new Set(pairs.map(p => `${p.resourceId}-${p.week}`))).map(key => {
        const [resourceId, week] = key.split('-');
        return { resourceId, week };
      });
      // Fetch all in parallel
      const results = await Promise.all(uniquePairs.map(async ({ resourceId, week }) => {
        const data = await apiClient<{ success: boolean; data: any[] }>(`/api/availability?resourceId=${resourceId}&weekStart=${week}`);
        if (data.success && data.data.length > 0) {
          return { key: `${resourceId}-${week}`, available: data.data[0].availabilityLeft, overbooked: data.data[0].overbooked };
        } else {
          return { key: `${resourceId}-${week}`, available: 5, overbooked: false };
        }
      }));
      const map: Record<string, { available: number; overbooked: boolean }> = {};
      results.forEach(r => { map[r.key] = { available: r.available, overbooked: r.overbooked }; });
      setAvailabilityMap(map);
    }
    fetchAvailability();
  }, [rows, allWeeks, rowResources]);

  // Only after all hooks:
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }
  if (!session || !session.user.roles?.includes('admin')) {
    if (typeof window !== 'undefined') router.push('/auth/signin');
    return null;
  }

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(e.target.value);
  };

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiClient<{ success: boolean; data: any }>('/api/projects', {
      method: 'POST',
      body: newProject,
    });
    const data = res;
    if (data.success) {
      setProjects((prev) => [...prev, data.data]);
      setSelectedProjectId(data.data.id);
      setNewProject({ name: '', customer: '' });
    }
  };

  const handleAllocationFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAllocationForm((prev) => ({ ...prev, [name]: name === 'quantity' || name === 'daysPerWeek' || name === 'numWeeks' ? Number(value) : value }));
  };

  // Add forecast (planned allocation) via API
  const handleAddForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }
    
    try {
      console.log('Adding forecast with data:', { ...allocationForm, projectId: selectedProjectId, status: 'forecast' });
      
      const res = await apiClient<{ success: boolean; data: any; error?: string }>('/api/allocations', {
        method: 'POST',
        body: { ...allocationForm, projectId: selectedProjectId, status: 'forecast' },
      });
      
      console.log('API response:', res);
      
      if (res.success) {
        setAllocations(a => [...a, res.data]);
        setAllocationForm({ role: '', quantity: 1, daysPerWeek: 1, numWeeks: 1, startDate: '' });
        alert('Forecast added successfully!');
      } else {
        alert(`Failed to add forecast: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding forecast:', error);
      alert(`Error adding forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Remove forecast (planned allocation) via API
  const handleRemoveForecast = async (id: string) => {
    await apiClient(`/api/allocations/${id}`, { method: 'DELETE' });
    setAllocations(a => a.filter(ax => ax.id !== id));
  };

  // Edit logic for planned allocations
  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setEditForm({ daysPerWeek: a.daysPerWeek, quantity: a.quantity });
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: Number(value) }));
  };
  const handleEditSave = async (id: string) => {
    await apiClient(`/api/allocations/${id}`, {
      method: 'PATCH',
      body: { daysPerWeek: editForm.daysPerWeek, quantity: editForm.quantity },
    });
    setAllocations(a => a.map(ax => ax.id === id ? { ...ax, daysPerWeek: editForm.daysPerWeek, quantity: editForm.quantity } : ax));
    setEditingId(null);
  };
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Filter allocations for forecasts (planned work)
  const forecasts = allocations.filter(a => a.status === 'forecast');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6">Project Planning</h1>
          {/* Project Selection/Creation */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
            <select
              value={selectedProjectId || ''}
              onChange={handleProjectSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            >
              <option value="">-- Select a project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.customer})</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mb-2">Or create a new project:</div>
            <form onSubmit={handleNewProject} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Project Name"
                value={newProject.name}
                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="flex-1 px-2 py-1 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Customer"
                value={newProject.customer}
                onChange={e => setNewProject({ ...newProject, customer: e.target.value })}
                className="flex-1 px-2 py-1 border rounded"
                required
              />
              <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
            </form>
          </div>
          {/* Forecasts Section */}
          {selectedProjectId && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Opportunity Forecasts</h2>
              <form onSubmit={handleAddForecast} className="mb-4">
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                    <select
                      name="role"
                      value={allocationForm.role}
                      onChange={handleAllocationFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select role</option>
                      {RESOURCE_ROLE_OPTIONS.filter(opt => !opt.isAdmin).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      name="quantity"
                      value={allocationForm.quantity}
                      onChange={handleAllocationFormChange}
                      min={1}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Days/Week</label>
                    <input
                      type="number"
                      name="daysPerWeek"
                      value={allocationForm.daysPerWeek}
                      onChange={handleAllocationFormChange}
                      min={1}
                      max={5}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1"># Weeks</label>
                    <input
                      type="number"
                      name="numWeeks"
                      value={allocationForm.numWeeks}
                      onChange={handleAllocationFormChange}
                      min={1}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={allocationForm.startDate}
                      onChange={handleAllocationFormChange}
                      className="w-full px-2 py-1 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <button type="submit" className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700">Add Forecast</button>
                  </div>
                </div>
              </form>
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Days/Week</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"># Weeks</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Assign</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {forecasts.map((f) => {
                    // Filter resources by role (multi-role support)
                    const availableResources = resources.filter(r =>
                      Array.isArray(r.roles) && r.roles.some(role => role.name === f.role)
                    );
                    return (
                      <>
                        <tr key={f.id}>
                          <td className="px-4 py-2 text-sm">{f.role}</td>
                          <td className="px-4 py-2 text-center text-sm">
                            {editingId === f.id ? (
                              <input
                                type="number"
                                name="quantity"
                                value={editForm.quantity}
                                onChange={handleEditChange}
                                min={1}
                                className="w-16 px-1 py-0.5 border rounded"
                              />
                            ) : (
                              f.quantity
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-sm">
                            {editingId === f.id ? (
                              <input
                                type="number"
                                name="daysPerWeek"
                                value={editForm.daysPerWeek}
                                onChange={handleEditChange}
                                min={1}
                                max={5}
                                className="w-16 px-1 py-0.5 border rounded"
                              />
                            ) : (
                              f.daysPerWeek
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-sm">{f.numWeeks}</td>
                          <td className="px-4 py-2 text-center text-sm">{formatUK(f.startDate)}</td>
                          <td className="px-4 py-2 text-center text-sm">
                            {resourceLoading ? (
                              <span className="text-gray-400 text-xs">Loading...</span>
                            ) : (
                              <select
                                value={assignments[f.id] || ''}
                                onChange={e => setAssignments(a => ({ ...a, [f.id]: e.target.value }))}
                                className="px-2 py-1 border rounded"
                              >
                                <option value="">Select resource</option>
                                {availableResources.length === 0 && <option disabled>No {f.role}s</option>}
                                {availableResources.map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-sm">
                            {editingId === f.id ? (
                              <>
                                <button onClick={() => handleEditSave(f.id)} className="text-green-600 hover:underline mr-2">Save</button>
                                <button onClick={handleEditCancel} className="text-gray-500 hover:underline">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(f)} className="text-blue-600 hover:underline mr-2">Edit</button>
                                <button onClick={() => handleRemoveForecast(f.id)} className="text-red-600 hover:underline">Remove</button>
                              </>
                            )}
                          </td>
                        </tr>
                        <tr key={f.id + '-skills'}>
                          <td colSpan={7} className="px-4 py-2 text-sm">
                            {/* Required Skills UI */}
                            <div className="mt-2">
                              <strong>Required Skills:</strong>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {/* The old ForecastSkill logic is removed, so this section is now empty */}
                                {/* Add skill dropdown */}
                                <select
                                  className="px-1 py-0.5 border rounded w-40 text-xs"
                                  value=""
                                  onChange={e => {
                                    // This functionality is no longer applicable as ForecastSkill is removed
                                  }}
                                >
                                  <option value="">Add skill...</option>
                                  {skills
                                    .filter(s => !((Array.isArray(allocations) ? allocations : [])
                                      .some(a => ((a.requiredSkills ?? []) as any[])
                                        .some((rs: any) => rs.skillId === s.id))))
                                    .map(skill => (
                                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })}
                  {forecasts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-2 text-center text-gray-400">No forecasts yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* After forecasts table, render matrix view only once when forecasts exist */}
          {/* If forecasts exist, show forecast-based matrix; else, show allocations-based matrix */}
          {forecasts.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Project Assignment Matrix</h3>
              <div className="flex justify-end mb-2">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  onClick={async () => {
                    if (!selectedProjectId) return;
                    window.location.href = `/api/project-planning/export?projectId=${selectedProjectId}`;
                  }}
                >
                  Export to CSV/Excel
                </button>
              </div>
              {(() => {
                const allWeeks = Array.from(new Set(allocations.flatMap(a => getForecastWeeks(a.startDate, a.numWeeks)))).sort();
                const rows = allocations.flatMap(a =>
                  Array.from({ length: a.quantity }, (_, i) => ({ ...a, slot: i + 1, rowId: `${a.id}-slot${i + 1}` }))
                );
                const totalAllocated = rows.reduce((total, row) => {
                  const weekKeys = allWeeks.filter(week => getForecastWeeks(row.startDate, row.numWeeks).includes(week)).map(week => row.rowId + '-' + week);
                  return total + weekKeys.reduce((sum, key) => sum + (cellDays[key] !== undefined ? cellDays[key] : row.daysPerWeek), 0);
                }, 0);
                // Render matrix
                return (
                  <div className="overflow-x-auto">
                    {/* Editable Total Project Days Agreed field */}
                    <div className="mb-4 flex items-center gap-4">
                      <label className="font-medium">Total Project Days Agreed:</label>
                      <input
                        type="number"
                        min={0}
                        value={totalProjectDays !== null ? totalProjectDays : ''}
                        onChange={e => setTotalProjectDays(e.target.value ? Number(e.target.value) : null)}
                        className="w-32 px-2 py-1 border rounded text-sm"
                        placeholder="Enter days"
                      />
                      {totalProjectDays !== null && (
                        <span className="ml-4 text-sm">
                          Difference: <span style={{ color: totalAllocated > totalProjectDays ? '#dc2626' : '#166534', fontWeight: 'bold' }}>{totalAllocated - totalProjectDays}</span>
                        </span>
                      )}
                    </div>
                    <table className="min-w-full border divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
                      <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 z-30 bg-gray-50 min-w-[120px]">Role</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-[120px] z-30 bg-gray-50 min-w-[60px]">Slot</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-[180px] z-30 bg-gray-50 min-w-[180px]">Resource</th>
                          {allWeeks.map(w => (
                            <th key={w} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase min-w-[110px]">{formatUK(w)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map(row => (
                          <tr key={row.rowId}>
                            <td className="px-2 py-2 text-sm sticky left-0 z-20 bg-white border-r border-gray-200">{row.role}</td>
                            <td className="px-2 py-2 text-sm sticky left-[80px] z-20 bg-white border-r border-gray-200">{row.slot}</td>
                            <td className="px-2 py-2 text-sm sticky left-[160px] z-20 bg-white border-r border-gray-200">
                              <select
                                value={rowResources[row.rowId] || ''}
                                onChange={e => setRowResources(r => ({ ...r, [row.rowId]: e.target.value }))}
                                className="px-1 py-0.5 border rounded text-xs"
                              >
                                <option value="">Assign</option>
                                {resources
                                  .filter(r => Array.isArray(r.roles) && r.roles.some(role => role.name.trim().toLowerCase() === row.role.trim().toLowerCase()))
                                  .map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                              </select>
                            </td>
                            {allWeeks.map(week => {
                              const isPlanned = getForecastWeeks(row.startDate, row.numWeeks).includes(week);
                              const cellKey = row.rowId + '-' + week;
                              return (
                                <td key={week} className={`px-2 py-2 text-center text-sm ${
                                  availabilityMap[rowResources[row.rowId] + '-' + week]?.overbooked
                                    ? 'bg-red-100'
                                    : (cellDays[cellKey] > availabilityMap[rowResources[row.rowId] + '-' + week]?.available
                                      ? 'bg-yellow-100'
                                      : 'bg-green-100')
                                }`} title={`Assigned: ${cellDays[cellKey] !== undefined ? cellDays[cellKey] : row.daysPerWeek}d\nAvailable: ${availabilityMap[rowResources[row.rowId] + '-' + week]?.available ?? 5}d\n${availabilityMap[rowResources[row.rowId] + '-' + week]?.overbooked ? 'Overbooked!' : ''}`}>
                                  {isPlanned ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={7}
                                      value={cellDays[cellKey] !== undefined ? cellDays[cellKey] : row.daysPerWeek}
                                      onChange={e => setCellDays(c => ({ ...c, [cellKey]: Number(e.target.value) }))}
                                      className="w-12 px-1 py-0.5 border rounded text-xs text-center"
                                    />
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        {/* Per-row summary: total allocated days per resource/slot */}
                        {rows.map(row => {
                          const weekKeys = allWeeks.filter(week => getForecastWeeks(row.startDate, row.numWeeks).includes(week)).map(week => row.rowId + '-' + week);
                          const rowTotal = weekKeys.reduce((sum, key) => sum + (cellDays[key] !== undefined ? cellDays[key] : row.daysPerWeek), 0);
                          return (
                            <tr key={row.rowId + '-summary'}>
                              <td colSpan={3} className="px-2 py-2 text-right text-xs font-semibold text-gray-700">{row.role} {row.slot} Total</td>
                              {allWeeks.map(week => <td key={week}></td>)}
                              <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: '#166534' }}>{rowTotal}d</td>
                            </tr>
                          );
                        })}
                        {/* Grand total row */}
                        <tr>
                          <td colSpan={3} className="px-2 py-2 text-right text-xs font-bold text-gray-900">Grand Total</td>
                          {allWeeks.map(week => <td key={week}></td>)}
                          <td className="px-2 py-2 text-center text-xs font-bold" style={{ color: '#166534' }}>
                            {(() => {
                              let total = 0;
                              rows.forEach(row => {
                                const weekKeys = allWeeks.filter(week => getForecastWeeks(row.startDate, row.numWeeks).includes(week)).map(week => row.rowId + '-' + week);
                                total += weekKeys.reduce((sum, key) => sum + (cellDays[key] !== undefined ? cellDays[key] : row.daysPerWeek), 0);
                              });
                              return total + 'd';
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role(s)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days Allocated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allocations.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-2 text-center text-gray-400">No allocations for this project.</td></tr>
                  )}
                  {allocations.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-sm">{a.resource?.name || '-'}</td>
                      <td className="px-4 py-2 text-sm">{a.resource?.roles ? a.resource.roles.map((r: any) => r.label).join(', ') : '-'}</td>
                      <td className="px-4 py-2 text-sm">{formatUK(a.weekStart)}</td>
                      <td className="px-4 py-2 text-sm">{a.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
} 