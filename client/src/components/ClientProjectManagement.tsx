import React, { useState, useEffect } from 'react';
import { clientsAPI, projectsAPI, assignmentsAPI, authAPI } from '../services/api';

const ClientProjectManagement: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState<'clients' | 'projects' | 'assignments'>('clients');
  const [users, setUsers] = useState<any[]>([]);

  // Client form state
  const [newClientName, setNewClientName] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');

  // Project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  useEffect(() => {
    loadClients();
    loadProjects();
    loadUsers();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await clientsAPI.getAll();
      setClients(res.data.data);
    } catch (err) {
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.getAll();
      setProjects(res.data.data);
    } catch (err) {
      console.error('Load projects error:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await assignmentsAPI.getUsers();
      setUsers(res.data.data);
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newClientName.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      await clientsAPI.create(newClientName);
      setSuccess('Client created successfully');
      setNewClientName('');
      loadClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create client');
    }
  };

  const updateClient = async (id: string) => {
    setError('');
    setSuccess('');

    if (!editClientName.trim()) {
      setError('Client name is required');
      return;
    }

    try {
      await clientsAPI.update(id, { name: editClientName });
      setSuccess('Client updated successfully');
      setEditingClient(null);
      setEditClientName('');
      loadClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update client');
    }
  };

  const deleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await clientsAPI.delete(id);
      setSuccess('Client deactivated successfully');
      loadClients();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate client');
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (!newProjectClient) {
      setError('Client is required');
      return;
    }

    try {
      await projectsAPI.create(newProjectName, newProjectClient);
      setSuccess('Project created successfully');
      setNewProjectName('');
      setNewProjectClient('');
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    }
  };

  const updateProject = async (id: string) => {
    setError('');
    setSuccess('');

    if (!editProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      await projectsAPI.update(id, { name: editProjectName });
      setSuccess('Project updated successfully');
      setEditingProject(null);
      setEditProjectName('');
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update project');
    }
  };

  const deleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await projectsAPI.delete(id);
      setSuccess('Project deactivated successfully');
      loadProjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate project');
    }
  };

  const assignUserToClient = async (userId: string, clientId: string) => {
    setError('');
    setSuccess('');

    try {
      await assignmentsAPI.assignClient(userId, clientId);
      setSuccess('User assigned to client successfully');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign user');
    }
  };

  const removeUserFromClient = async (userId: string, clientId: string) => {
    setError('');
    setSuccess('');

    try {
      await assignmentsAPI.removeClient(userId, clientId);
      setSuccess('User removed from client');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove assignment');
    }
  };

  const assignUserToProject = async (userId: string, projectId: string) => {
    setError('');
    setSuccess('');

    try {
      await assignmentsAPI.assignProject(userId, projectId);
      setSuccess('User assigned to project successfully');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign user');
    }
  };

  const removeUserFromProject = async (userId: string, projectId: string) => {
    setError('');
    setSuccess('');

    try {
      await assignmentsAPI.removeProject(userId, projectId);
      setSuccess('User removed from project');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove assignment');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('clients')}
          className={`px-4 py-2 rounded ${view === 'clients' ? 'bg-primary text-white' : 'bg-white border'}`}
        >
          Clients ({clients.length})
        </button>
        <button
          onClick={() => setView('projects')}
          className={`px-4 py-2 rounded ${view === 'projects' ? 'bg-primary text-white' : 'bg-white border'}`}
        >
          Projects ({projects.length})
        </button>
        <button
          onClick={() => setView('assignments')}
          className={`px-4 py-2 rounded ${view === 'assignments' ? 'bg-primary text-white' : 'bg-white border'}`}
        >
          User Assignments ({users.length})
        </button>
      </div>

      {/* Clients View */}
      {view === 'clients' && (
        <div className="space-y-4">
          {/* Create Client Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
            <form onSubmit={createClient} className="flex gap-2">
              <input
                type="text"
                placeholder="Client name (e.g., Acme Corp)"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
              >
                Add Client
              </button>
            </form>
          </div>

          {/* Clients List */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Clients</h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : clients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No clients yet. Add your first client above!</p>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div key={client.id} className="border p-4 rounded">
                    {editingClient === client.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded"
                        />
                        <button
                          onClick={() => updateClient(client.id)}
                          className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingClient(null);
                            setEditClientName('');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-600">
                            {client._count?.projects || 0} projects · {client._count?.timeEntries || 0} time entries
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingClient(client.id);
                              setEditClientName(client.name);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteClient(client.id, client.name)}
                            className="text-sm text-red-600 hover:text-red-700 px-2 py-1"
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects View */}
      {view === 'projects' && (
        <div className="space-y-4">
          {/* Create Project Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Add New Project</h3>
            <form onSubmit={createProject} className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Project name (e.g., Cookie)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>

          {/* Projects List */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Projects</h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : projects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No projects yet. Add your first project above!</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="border p-4 rounded">
                    {editingProject === project.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded"
                        />
                        <button
                          onClick={() => updateProject(project.id)}
                          className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProject(null);
                            setEditProjectName('');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-gray-600">
                            Client: {project.client.name} · {project._count?.timeEntries || 0} time entries
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProject(project.id);
                              setEditProjectName(project.name);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProject(project.id, project.name)}
                            className="text-sm text-red-600 hover:text-red-700 px-2 py-1"
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Assignments View */}
      {view === 'assignments' && (
        <div className="space-y-4">
          {users.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-center py-12">
                <p className="text-gray-700 font-medium mb-2">No employees to assign yet</p>
                <p className="text-sm text-gray-500 mb-4">Employees will appear here once they:</p>
                <ul className="text-sm text-gray-600 space-y-1 inline-block text-left">
                  <li>✓ Login via Microsoft (Entra ID)</li>
                  <li>✓ Have role set to "Employee" (in Users tab)</li>
                  <li>✓ Are not hidden</li>
                </ul>
                <p className="text-sm text-gray-500 mt-4">
                  Go to <span className="font-medium">Users</span> tab to manage user roles
                </p>
              </div>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-white p-6 rounded-lg shadow">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete ${user.name}? This will permanently remove their account and all time entries, assignments, and other data.`)) {
                        return;
                      }
                      try {
                        setError('');
                        setSuccess('');
                        await authAPI.deleteUser(user.id);
                        setSuccess(`${user.name} deleted successfully`);
                        setTimeout(() => setSuccess(''), 3000);
                        await loadUsers();
                      } catch (err: any) {
                        console.error('Delete error:', err);
                        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete user';
                        setError(errorMsg);
                        setTimeout(() => setError(''), 5000);
                      }
                    }}
                    className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    title="Permanently delete this user"
                  >
                    🗑️ Delete User
                  </button>
                </div>

                {/* Assigned Clients */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Assigned Clients</h4>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignUserToClient(user.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-sm px-2 py-1 border rounded"
                    >
                      <option value="">+ Add Client</option>
                      {clients
                        .filter(c => !user.assignedClients.some((ac: any) => ac.client.id === c.id))
                        .map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.assignedClients.length === 0 ? (
                      <p className="text-sm text-gray-500">No clients assigned</p>
                    ) : (
                      user.assignedClients.map((assignment: any) => (
                        <span
                          key={assignment.id}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {assignment.client.name}
                          <button
                            onClick={() => removeUserFromClient(user.id, assignment.client.id)}
                            className="hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Assigned Projects */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Assigned Projects</h4>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignUserToProject(user.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-sm px-2 py-1 border rounded"
                    >
                      <option value="">+ Add Project</option>
                      {projects
                        .filter(p => !user.assignedProjects.some((ap: any) => ap.project.id === p.id))
                        .map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.client.name} / {project.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.assignedProjects.length === 0 ? (
                      <p className="text-sm text-gray-500">No projects assigned</p>
                    ) : (
                      user.assignedProjects.map((assignment: any) => (
                        <span
                          key={assignment.id}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {assignment.project.client.name} / {assignment.project.name}
                          <button
                            onClick={() => removeUserFromProject(user.id, assignment.project.id)}
                            className="hover:text-green-900"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClientProjectManagement;
