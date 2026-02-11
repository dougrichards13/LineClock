import React, { useState, useEffect } from 'react';
import { orgChartAPI } from '../services/api';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  reportsToId: string | null;
  reportsTo: { id: string; name: string; email: string } | null;
  directReports: Array<{ id: string; name: string; email: string }>;
}

const OrgStructure: React.FC = () => {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  const fetchData = async (clearMessages = true) => {
    try {
      setLoading(true);
      if (clearMessages) setError('');
      const orgRes = await orgChartAPI.getOrgChart();
      setUsers(orgRes.data.data.users);
    } catch (err: any) {
      if (clearMessages) {
        setError(err.response?.data?.error || 'Failed to fetch org chart');
      }
      throw err; // Re-throw so caller knows it failed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateReportsTo = async (userId: string) => {
    try {
      setError('');
      setSuccess('');
      await orgChartAPI.updateReportsTo(userId, selectedManagerId || null);
      setSuccess('Reporting structure updated');
      setEditingUserId(null);
      setSelectedManagerId('');
      // Refresh data - don't let refresh errors override success
      try {
        await fetchData(false);
      } catch (refreshErr) {
        console.error('Failed to refresh data after update:', refreshErr);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Update failed:', err);
      setError(err.response?.data?.error || 'Failed to update reporting structure');
      setTimeout(() => setError(''), 5000);
    }
  };

  const startEditing = (user: OrgUser) => {
    setEditingUserId(user.id);
    setSelectedManagerId(user.reportsToId || '');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setSelectedManagerId('');
  };

  const getAvailableManagers = (userId: string) => {
    return users.filter(u => u.id !== userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Organization Structure</h3>
          <p className="text-sm text-gray-400">
            Set up reporting relationships. Modification requests will be routed to each employee's direct supervisor.
          </p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  
                  {editingUserId === user.id ? (
                    <div className="mt-3 flex items-center gap-3">
                      <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">No Manager (Top Level)</option>
                        {getAvailableManagers(user.id).map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.email})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleUpdateReportsTo(user.id)}
                        className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-400">Reports to:</span>
                      {user.reportsTo ? (
                        <span className="text-sm text-indigo-300 font-medium">
                          {user.reportsTo.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No manager assigned</span>
                      )}
                    </div>
                  )}

                  {user.directReports.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Direct reports: </span>
                      <span className="text-xs text-gray-300">
                        {user.directReports.map(r => r.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {editingUserId !== user.id && (
                  <button
                    onClick={() => startEditing(user)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 px-3 py-1 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-gray-400 text-center py-8">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgStructure;
