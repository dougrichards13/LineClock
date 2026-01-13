import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { authAPI } from '../services/api';

interface EntraUser {
  entraId: string;
  name: string;
  email: string;
  existsInDb: boolean;
  userId?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isHidden: boolean;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<EntraUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHidden, setShowHidden] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await authAPI.getEntraUsers();
      setUsers(response.data.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'EMPLOYEE') => {
    try {
      setError('');
      setSuccess('');
      console.log('Updating role for userId:', userId, 'to:', newRole);
      await authAPI.updateUserRole(userId, newRole);
      setSuccess(`Role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.userId === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      console.error('Role update error:', err);
      setError(err.response?.data?.error || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleToggleHidden = async (userId: string, currentHidden: boolean) => {
    try {
      setError('');
      setSuccess('');
      await authAPI.toggleUserHidden(userId, !currentHidden);
      setSuccess(currentHidden ? 'User shown' : 'User hidden');
      setTimeout(() => setSuccess(''), 3000);
      
      // Update local state
      setUsers(prev =>
        prev.map(u => (u.userId === userId ? { ...u, isHidden: !currentHidden } : u))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update visibility');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  const filteredUsers = showHidden ? users : users.filter(u => !u.isHidden);
  const hiddenCount = users.filter(u => u.isHidden).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-600">
            Manage user roles from your Entra ID directory. Users will be created on first login.
          </p>
        </div>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {showHidden ? `Hide ${hiddenCount} Hidden` : `Show ${hiddenCount} Hidden`}
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No users found in your Entra ID directory
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.entraId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.existsInDb ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not logged in yet
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.existsInDb && user.userId ? (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.userId!, e.target.value as 'ADMIN' | 'EMPLOYEE')
                        }
                        className="block w-32 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <select
                          id={`role-${user.entraId}`}
                          defaultValue="EMPLOYEE"
                          className="block w-32 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-blue-50"
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={async (e) => {
                            const selectElement = (e.currentTarget.previousElementSibling as HTMLSelectElement);
                            const role = selectElement.value as 'ADMIN' | 'EMPLOYEE';
                            try {
                              setError('');
                              setSuccess('');
                              await authAPI.preHideUser(user.entraId, user.email, user.name, role, false);
                              setSuccess(`User imported as ${role}`);
                              setTimeout(() => setSuccess(''), 3000);
                              await fetchUsers();
                            } catch (err: any) {
                              setError(err.response?.data?.error || 'Failed to import user');
                              setTimeout(() => setError(''), 3000);
                            }
                          }}
                          className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium"
                        >
                          Import
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.email === currentUser?.email ? (
                      <span className="text-gray-400 text-xs italic">You</span>
                    ) : user.existsInDb && user.userId ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleHidden(user.userId!, user.isHidden)}
                          className={`px-3 py-1 text-xs rounded-md transition-colors ${
                            user.isHidden 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {user.isHidden ? '👁️ Show' : '🚫 Hide'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${user.name}? This will permanently remove their account and all associated data.`)) {
                              return;
                            }
                            try {
                              setError('');
                              setSuccess('');
                              await authAPI.deleteUser(user.userId!);
                              setSuccess('User deleted successfully');
                              setTimeout(() => setSuccess(''), 3000);
                              await fetchUsers();
                            } catch (err: any) {
                              setError(err.response?.data?.error || 'Failed to delete user');
                              setTimeout(() => setError(''), 3000);
                            }
                          }}
                          className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          title="Permanently delete this user"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            setError('');
                            setSuccess('');
                            await authAPI.preHideUser(user.entraId, user.email, user.name, 'EMPLOYEE', true);
                            setSuccess('User pre-hidden. They will be hidden when they login.');
                            setTimeout(() => setSuccess(''), 3000);
                            await fetchUsers();
                          } catch (err: any) {
                            setError(err.response?.data?.error || 'Failed to pre-hide user');
                            setTimeout(() => setError(''), 3000);
                          }
                        }}
                        className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        title="Pre-hide this user to prevent them from appearing in lists"
                      >
                        🚫 Pre-Hide
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-500 border-t pt-4">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Only active user accounts are fetched from your Entra ID directory</li>
          <li><strong>Import users</strong> by selecting their role from the dropdown (Employee/Admin)</li>
          <li>Imported users immediately appear in User Assignments for project assignment</li>
          <li>Hide distribution lists or non-employee accounts using the Hide button</li>
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;
