import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { timeEntriesAPI, vacationsAPI, questionsAPI, clientsAPI, projectsAPI } from '../services/api';
import Profile from '../components/Profile';

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'time' | 'vacation' | 'questions' | 'profile'>('time');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Time Entry Form
  const [timeForm, setTimeForm] = useState({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', hoursWorked: '', clientId: '', projectId: '', description: '' });
  // Vacation Form
  const [vacationForm, setVacationForm] = useState({ startDate: '', endDate: '', reason: '' });
  // Question Form
  const [questionText, setQuestionText] = useState('');

  useEffect(() => {
    loadData();
    loadClients();
  }, [activeTab]);

  const loadClients = async () => {
    try {
      const res = await clientsAPI.getAll();
      setClients(res.data.data);
    } catch (err) {
      console.error('Load clients error:', err);
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

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'time') {
        const res = await timeEntriesAPI.getAll();
        setTimeEntries(res.data.data);
      } else if (activeTab === 'vacation') {
        const res = await vacationsAPI.getAll();
        setVacations(res.data.data);
      } else {
        const res = await questionsAPI.getAll();
        setQuestions(res.data.data);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
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

  const submitVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await vacationsAPI.create(vacationForm);
      setVacationForm({ startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (err) {
      alert('Failed to create vacation request');
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await questionsAPI.create(questionText);
      setQuestionText('');
      loadData();
    } catch (err) {
      alert('Failed to submit question');
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
    // Load projects for the selected client
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

    // Validation
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Smart Factory - Employee Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-700">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('time')} className={`px-4 py-2 rounded ${activeTab === 'time' ? 'bg-primary text-white' : 'bg-white'}`}>Time Entries</button>
          <button onClick={() => setActiveTab('vacation')} className={`px-4 py-2 rounded ${activeTab === 'vacation' ? 'bg-primary text-white' : 'bg-white'}`}>Vacation Requests</button>
          <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded ${activeTab === 'questions' ? 'bg-primary text-white' : 'bg-white'}`}>Questions</button>
          <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded ${activeTab === 'profile' ? 'bg-primary text-white' : 'bg-white'}`}>Profile</button>
        </div>

        {activeTab === 'time' && (
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
              ) : timeEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No time entries yet. Create your first one above!</p>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry) => (
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

        {activeTab === 'vacation' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">New Vacation Request</h2>
              <form onSubmit={submitVacation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Start Date</label>
                    <input type="date" required value={vacationForm.startDate} onChange={(e) => setVacationForm({ ...vacationForm, startDate: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">End Date</label>
                    <input type="date" required value={vacationForm.endDate} onChange={(e) => setVacationForm({ ...vacationForm, endDate: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>
                <textarea required placeholder="Reason" value={vacationForm.reason} onChange={(e) => setVacationForm({ ...vacationForm, reason: e.target.value })} className="w-full px-3 py-2 border rounded" rows={3} />
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700">Submit Request</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">My Vacation Requests</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-2">
                  {vacations.map((vac) => (
                    <div key={vac.id} className="border p-4 rounded">
                      <p className="font-medium">{new Date(vac.startDate).toLocaleDateString()} - {new Date(vac.endDate).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{vac.reason}</p>
                      <span className={`text-xs px-2 py-1 rounded ${vac.status === 'APPROVED' ? 'bg-green-100' : vac.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'}`}>{vac.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Ask a Question</h2>
              <form onSubmit={submitQuestion} className="space-y-4">
                <textarea required placeholder="Your question..." value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700">Submit Question</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">My Questions</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="border p-4 rounded">
                      <div className="flex justify-between mb-2">
                        <p className="font-medium">Q: {q.question}</p>
                        <span className={`text-xs px-2 py-1 rounded ${q.status === 'ANSWERED' ? 'bg-green-100' : 'bg-yellow-100'}`}>{q.status}</span>
                      </div>
                      {q.answer && (
                        <div className="mt-2 pl-4 border-l-2 border-primary">
                          <p className="text-sm text-gray-700"><strong>A:</strong> {q.answer}</p>
                          {q.answerer && <p className="text-xs text-gray-500 mt-1">Answered by {q.answerer.name}</p>}
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

export default EmployeeDashboard;
