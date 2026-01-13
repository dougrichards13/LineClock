import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { dashboardAPI, timeEntriesAPI, vacationsAPI, questionsAPI, clientsAPI, projectsAPI } from '../services/api';
import Profile from '../components/Profile';
import ClientProjectManagement from '../components/ClientProjectManagement';
import UserManagement from '../components/UserManagement';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'vacation' | 'questions' | 'clients' | 'users' | 'mytime' | 'profile'>('overview');
  const [pendingTime, setPendingTime] = useState<any[]>([]);
  const [pendingVacations, setPendingVacations] = useState<any[]>([]);
  const [openQuestions, setOpenQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  
  // My Time Entry state
  const [myTimeEntries, setMyTimeEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [timeForm, setTimeForm] = useState({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab !== 'overview') loadData();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'time') {
        const res = await timeEntriesAPI.getPending();
        setPendingTime(res.data.data);
      } else if (activeTab === 'vacation') {
        const res = await vacationsAPI.getPending();
        setPendingVacations(res.data.data);
      } else if (activeTab === 'questions') {
        const res = await questionsAPI.getOpen();
        setOpenQuestions(res.data.data);
      } else if (activeTab === 'mytime') {
        const res = await timeEntriesAPI.getAll();
        setMyTimeEntries(res.data.data);
        const clientsRes = await clientsAPI.getAll();
        setClients(clientsRes.data.data);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsForClient = async (clientId: string) => {
    try {
      const res = await projectsAPI.getByClient(clientId);
      setProjects(res.data.data);
    } catch (err) {
      console.error('Load projects error:', err);
    }
  };

  const submitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const hours = parseFloat(timeForm.hoursWorked);
    if (hours <= 0 || hours > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }

    try {
      await timeEntriesAPI.create({
        date: timeForm.date,
        hoursWorked: hours,
        clientId: timeForm.clientId,
        projectId: timeForm.projectId,
        description: timeForm.description || undefined,
      });
      setTimeForm({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });
      setProjects([]);
      setSuccess('Time entry created successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create time entry');
    }
  };

  const submitTimeForReview = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await timeEntriesAPI.update(id, { status: 'SUBMITTED' });
      setSuccess('Time entry submitted for review');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit for review');
    }
  };

  const startEditEntry = async (entry: any) => {
    setEditingEntry(entry.id);
    setEditForm({
      date: entry.date.split('T')[0],
      hoursWorked: entry.hoursWorked.toString(),
      clientId: entry.clientId,
      projectId: entry.projectId,
      description: entry.description || '',
    });
    if (entry.clientId) {
      await loadProjectsForClient(entry.clientId);
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });
    setProjects([]);
    setError('');
  };

  const saveEdit = async (id: string) => {
    setError('');
    setSuccess('');

    const hours = parseFloat(editForm.hoursWorked);
    if (hours <= 0 || hours > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }

    try {
      await timeEntriesAPI.update(id, {
        date: editForm.date,
        hoursWorked: hours,
        clientId: editForm.clientId,
        projectId: editForm.projectId,
        description: editForm.description || undefined,
      });
      setEditingEntry(null);
      setSuccess('Time entry updated successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update time entry');
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await timeEntriesAPI.delete(id);
      setSuccess('Time entry deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete time entry');
    }
  };

  const reviewTimeEntry = async (id: string, status: string) => {
    setError('');
    setSuccess('');
    try {
      await timeEntriesAPI.review(id, status);
      setSuccess(`Time entry ${status.toLowerCase()} successfully`);
      loadData();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review time entry');
    }
  };

  const reviewVacation = async (id: string, status: string) => {
    setError('');
    setSuccess('');
    try {
      await vacationsAPI.review(id, status);
      setSuccess(`Vacation request ${status.toLowerCase()} successfully`);
      loadData();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review vacation request');
    }
  };

  const answerQuestion = async (id: string) => {
    const answer = answerText[id] || '';
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await questionsAPI.answer(id, answer);
      setAnswerText({ ...answerText, [id]: '' });
      setSuccess('Question answered successfully');
      loadData();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to answer question');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Smart Factory - Admin Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user?.name}</span>
            <button onClick={logout} className="text-sm bg-white text-primary px-3 py-1 rounded hover:bg-gray-100">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded ${activeTab === 'overview' ? 'bg-primary text-white' : 'bg-white'}`}>Overview</button>
          <button onClick={() => setActiveTab('time')} className={`px-4 py-2 rounded ${activeTab === 'time' ? 'bg-primary text-white' : 'bg-white'}`}>Time Entries</button>
          <button onClick={() => setActiveTab('vacation')} className={`px-4 py-2 rounded ${activeTab === 'vacation' ? 'bg-primary text-white' : 'bg-white'}`}>Vacations</button>
          <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded ${activeTab === 'questions' ? 'bg-primary text-white' : 'bg-white'}`}>Questions</button>
          <button onClick={() => setActiveTab('clients')} className={`px-4 py-2 rounded ${activeTab === 'clients' ? 'bg-primary text-white' : 'bg-white'}`}>Clients & Projects</button>
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-white'}`}>Users</button>
          <button onClick={() => setActiveTab('mytime')} className={`px-4 py-2 rounded ${activeTab === 'mytime' ? 'bg-primary text-white' : 'bg-white'}`}>My Time</button>
          <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded ${activeTab === 'profile' ? 'bg-primary text-white' : 'bg-white'}`}>Profile</button>
        </div>

        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Pending Time Entries</p>
              <p className="text-3xl font-bold text-primary">{stats.pendingTimeEntries}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Pending Vacations</p>
              <p className="text-3xl font-bold text-primary">{stats.pendingVacations}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Open Questions</p>
              <p className="text-3xl font-bold text-primary">{stats.openQuestions}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-primary">{stats.totalEmployees}</p>
            </div>
          </div>
        )}

        {activeTab === 'time' && (
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
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Pending Time Entries</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-3">
                  {pendingTime.map((entry) => (
                    <div key={entry.id} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{entry.user.name} - {entry.user.email}</p>
                        <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                        <p className="text-sm"><span className="font-medium">{entry.client?.name}</span> / {entry.project?.name}{entry.description && ` - ${entry.description}`}</p>
                      </div>
                        <div className="flex gap-2">
                          <button onClick={() => reviewTimeEntry(entry.id, 'APPROVED')} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">Approve</button>
                          <button onClick={() => reviewTimeEntry(entry.id, 'REJECTED')} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingTime.length === 0 && <p className="text-gray-500">No pending time entries</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vacation' && (
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
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Pending Vacation Requests</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-3">
                  {pendingVacations.map((vac) => (
                    <div key={vac.id} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{vac.user.name} - {vac.user.email}</p>
                          <p className="text-sm text-gray-600">{new Date(vac.startDate).toLocaleDateString()} - {new Date(vac.endDate).toLocaleDateString()}</p>
                          <p className="text-sm">{vac.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => reviewVacation(vac.id, 'APPROVED')} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">Approve</button>
                          <button onClick={() => reviewVacation(vac.id, 'REJECTED')} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingVacations.length === 0 && <p className="text-gray-500">No pending vacation requests</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
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
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Open Questions</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-4">
                  {openQuestions.map((q) => (
                    <div key={q.id} className="border p-4 rounded">
                      <p className="font-medium">{q.user.name} asked:</p>
                      <p className="text-sm text-gray-700 mt-1">{q.question}</p>
                      <div className="mt-3">
                        <textarea
                          placeholder="Your answer..."
                          value={answerText[q.id] || ''}
                          onChange={(e) => setAnswerText({ ...answerText, [q.id]: e.target.value })}
                          className="w-full px-3 py-2 border rounded"
                          rows={3}
                        />
                        <button
                          onClick={() => answerQuestion(q.id)}
                          className="mt-2 px-4 py-2 bg-primary text-white text-sm rounded hover:bg-blue-700"
                        >
                          Submit Answer
                        </button>
                      </div>
                    </div>
                  ))}
                  {openQuestions.length === 0 && <p className="text-gray-500">No open questions</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <ClientProjectManagement />
        )}

        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <UserManagement />
          </div>
        )}

        {activeTab === 'mytime' && (
          <div className="space-y-6">
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

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">New Time Entry</h2>
              <form onSubmit={submitTimeEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date *</label>
                    <input type="date" required value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Hours *</label>
                    <input type="number" step="0.5" min="0.5" max="24" required placeholder="8.0" value={timeForm.hoursWorked} onChange={(e) => setTimeForm({ ...timeForm, hoursWorked: e.target.value })} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Client *</label>
                    <select
                      required
                      value={timeForm.clientId}
                      onChange={(e) => {
                        const clientId = e.target.value;
                        setTimeForm({ ...timeForm, clientId, projectId: '' });
                        if (clientId) loadProjectsForClient(clientId);
                        else setProjects([]);
                      }}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Project *</label>
                    <select
                      required
                      value={timeForm.projectId}
                      onChange={(e) => setTimeForm({ ...timeForm, projectId: e.target.value })}
                      disabled={!timeForm.clientId || projects.length === 0}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                    >
                      <option value="">Select Project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Task Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="What did you work on?"
                    value={timeForm.description}
                    onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">Add Entry</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">My Time Entries</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : myTimeEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No time entries yet. Create your first one above!</p>
              ) : (
                <div className="space-y-3">
                  {myTimeEntries.map((entry) => (
                    <div key={entry.id} className="border p-4 rounded">
                      {editingEntry === entry.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="px-3 py-2 border rounded" />
                            <input type="number" step="0.5" min="0.5" max="24" value={editForm.hoursWorked} onChange={(e) => setEditForm({ ...editForm, hoursWorked: e.target.value })} className="px-3 py-2 border rounded" placeholder="Hours" />
                            <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="px-3 py-2 border rounded" placeholder="Description" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(entry.id)} className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-blue-700">Save</button>
                            <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">{entry.client?.name}</span> / {entry.project?.name}
                              {entry.description && ` - ${entry.description}`}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                entry.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                entry.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                entry.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>{entry.status}</span>
                              {entry.reviewer && (
                                <span className="text-xs text-gray-500">
                                  Reviewed by {entry.reviewer.name} on {new Date(entry.reviewedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {entry.status === 'DRAFT' && (
                              <>
                                <button onClick={() => startEditEntry(entry)} className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1">Edit</button>
                                <button onClick={() => deleteEntry(entry.id)} className="text-sm text-red-600 hover:text-red-700 px-2 py-1">Delete</button>
                                <button onClick={() => submitTimeForReview(entry.id)} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-blue-700">Submit</button>
                              </>
                            )}
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

        {activeTab === 'profile' && (
          <Profile />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
