import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { timeEntriesAPI, vacationsAPI, questionsAPI, clientsAPI, projectsAPI } from '../services/api';
import Profile from '../components/Profile';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import LiveClock from '../components/LiveClock';
import WeeklyTimeEntry from '../components/WeeklyTimeEntry';

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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <AnimatedBackground />
      
      <nav className="bg-slate-800 shadow-lg border-b border-slate-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <LiveClock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">LineClock™</h1>
              <p className="text-xs text-gray-400">Employee Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 font-medium">Welcome, {user?.name}</span>
            <button onClick={logout} className="text-sm bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition-all font-medium border border-slate-600">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 relative">
        {/* Three-column opacity effect */}
        <div className="absolute inset-0 flex pointer-events-none">
          {/* Left column - 100% opacity */}
          <div className="w-1/6 bg-slate-900"></div>
          {/* Center column - allows background to show through */}
          <div className="flex-1"></div>
          {/* Right column - 100% opacity */}
          <div className="w-1/6 bg-slate-900"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-3 mb-8 flex-wrap">
            <button onClick={() => setActiveTab('time')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'time' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Time Entries</button>
            <button onClick={() => setActiveTab('vacation')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'vacation' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Vacation Requests</button>
            <button onClick={() => setActiveTab('questions')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'questions' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Questions</button>
            <button onClick={() => setActiveTab('profile')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'profile' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Profile</button>
          </div>

        {activeTab === 'time' && (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            <WeeklyTimeEntry
              onSuccess={() => {
                setSuccess('Time entries submitted successfully!');
                loadData();
                setTimeout(() => setSuccess(''), 3000);
              }}
              onError={(err) => {
                setError(err);
                setTimeout(() => setError(''), 5000);
              }}
            />

            <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
              <h2 className="text-lg font-semibold mb-4 text-white">My Time Entries</h2>
              {loading ? (
                <p className="text-gray-300">Loading...</p>
              ) : timeEntries.length === 0 ? (
                <p className="text-gray-300 text-center py-8">No time entries yet. Create your first one above!</p>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
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
                            <p className="font-medium text-white">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                            <p className="text-sm text-gray-300">
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
                                <span className="text-xs text-gray-400">
                                  Reviewed by {entry.reviewer.name} on {new Date(entry.reviewedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {entry.status === 'DRAFT' && (
                              <>
                                <button onClick={() => startEditEntry(entry)} className="text-sm text-indigo-400 hover:text-indigo-300 px-2 py-1">Edit</button>
                                <button onClick={() => deleteEntry(entry.id)} className="text-sm text-red-400 hover:text-red-300 px-2 py-1">Delete</button>
                                <button onClick={() => submitTimeForReview(entry.id)} className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-500 hover:to-purple-500">Submit</button>
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
            <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
              <h2 className="text-lg font-semibold mb-4 text-white">New Vacation Request</h2>
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

            <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
              <h2 className="text-lg font-semibold mb-4 text-white">My Vacation Requests</h2>
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
            <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
              <h2 className="text-lg font-semibold mb-4 text-white">Ask a Question</h2>
              <form onSubmit={submitQuestion} className="space-y-4">
                <textarea required placeholder="Your question..." value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700">Submit Question</button>
              </form>
            </div>

            <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
              <h2 className="text-lg font-semibold mb-4 text-white">My Questions</h2>
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
      
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
