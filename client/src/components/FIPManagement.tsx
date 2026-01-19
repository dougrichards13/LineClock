import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  name: string;
  email: string;
  userId?: string;
  existsInDb?: boolean;
}

interface Project {
  id: string;
  name: string;
  client?: {
    name: string;
  };
}

interface FIPAssignment {
  id: string;
  leaderId: string;
  leader: User;
  consultantId: string;
  consultant: User;
  projectId: string | null;
  project?: Project | null;
  incentiveRate: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

const FIPManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<FIPAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    leaderId: '',
    consultantId: '',
    projectId: '',
    incentiveRate: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [assignmentsRes, usersRes, projectsRes] = await Promise.all([
        axios.get(`${API_URL}/fractional-incentives`, { headers }),
        axios.get(`${API_URL}/auth/entra/users`, { headers }),
        axios.get(`${API_URL}/projects`, { headers }),
      ]);

      setAssignments(assignmentsRes.data.data || []);
      // Only show users that exist in the database
      const allUsers = usersRes.data.data.users || [];
      const dbUsers = allUsers.filter((u: any) => u.existsInDb && u.userId).map((u: any) => ({
        id: u.userId,
        name: u.name,
        email: u.email,
      }));
      setUsers(dbUsers);
      setProjects(projectsRes.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load FIP data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaderId || !formData.consultantId || !formData.incentiveRate || !formData.startDate) {
      alert('Leader, consultant, incentive rate, and start date are required');
      return;
    }

    if (formData.leaderId === formData.consultantId) {
      alert('Leader and consultant cannot be the same person');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        leaderId: formData.leaderId,
        consultantId: formData.consultantId,
        projectId: formData.projectId || null,
        incentiveRate: parseFloat(formData.incentiveRate),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
      };

      if (editingId) {
        await axios.put(`${API_URL}/fractional-incentives/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/fractional-incentives`, payload, { headers });
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Failed to save FIP assignment:', error);
      alert(error.response?.data?.error || 'Failed to save FIP assignment');
    }
  };

  const handleEdit = (assignment: FIPAssignment) => {
    setFormData({
      leaderId: assignment.leaderId,
      consultantId: assignment.consultantId,
      projectId: assignment.projectId || '',
      incentiveRate: assignment.incentiveRate.toString(),
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate ? assignment.endDate.split('T')[0] : '',
    });
    setEditingId(assignment.id);
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/fractional-incentives/${id}`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      alert('Failed to update assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FIP assignment?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/fractional-incentives/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      leaderId: '',
      consultantId: '',
      projectId: '',
      incentiveRate: '',
      startDate: '',
      endDate: '',
    });
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'All Projects';
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.client?.name} - ${project.name}` : 'Unknown';
  };

  if (loading) {
    return <div className="text-center text-gray-300 py-8">Loading FIP assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fractional Incentive Program (FIP)</h2>
          <p className="text-gray-400 mt-1">Manage performance-based incentive assignments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          {showForm ? 'Cancel' : '+ New FIP Assignment'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingId ? 'Edit FIP Assignment' : 'New FIP Assignment'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Leader (earns incentive) *
                </label>
                <select
                  value={formData.leaderId}
                  onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select leader...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Consultant (generates incentive) *
                </label>
                <select
                  value={formData.consultantId}
                  onChange={e => setFormData({ ...formData, consultantId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select consultant...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Project (optional)
                </label>
                <select
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  disabled={!!editingId}
                >
                  <option value="">All projects (global FIP)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.client?.name} - {project.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank for incentive to apply to all projects
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Incentive Rate ($/hour) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.incentiveRate}
                  onChange={e => setFormData({ ...formData, incentiveRate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="5.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for ongoing assignment</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                {editingId ? 'Update Assignment' : 'Create Assignment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Leader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Consultant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No FIP assignments found. Create one to get started.
                  </td>
                </tr>
              ) : (
                assignments.map(assignment => (
                  <tr key={assignment.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 text-sm text-white">{assignment.leader.name}</td>
                    <td className="px-6 py-4 text-sm text-white">{assignment.consultant.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {assignment.project ? (
                        <span>
                          {assignment.project.client?.name} - {assignment.project.name}
                        </span>
                      ) : (
                        <span className="text-emerald-400">All Projects</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">
                      ${assignment.incentiveRate.toFixed(2)}/hr
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(assignment.startDate).toLocaleDateString()}
                      {assignment.endDate && (
                        <> - {new Date(assignment.endDate).toLocaleDateString()}</>
                      )}
                      {!assignment.endDate && <span className="text-gray-400"> (ongoing)</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.isActive
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : 'bg-slate-700 text-gray-400'
                        }`}
                      >
                        {assignment.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(assignment.id, assignment.isActive)}
                        className="text-yellow-400 hover:text-yellow-300 transition"
                      >
                        {assignment.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">About FIP</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            The Fractional Incentive Program (FIP) allows leaders to earn incentives based on their
            team's billable hours.
          </p>
          <p>
            <strong>How it works:</strong> When a consultant logs time, any active FIP assignments
            where they are the consultant will automatically create incentive earnings for their
            leader(s).
          </p>
          <p>
            <strong>Example:</strong> If a consultant with a $75/hr billable rate works 10 hours on
            a project, and their leader has a $5/hr FIP rate, the leader earns $50 in incentives for
            that time period.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FIPManagement;
