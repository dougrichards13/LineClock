import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { dashboardAPI, timeEntriesAPI, vacationsAPI, questionsAPI } from '../services/api';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'vacation' | 'questions'>('overview');
  const [pendingTime, setPendingTime] = useState<any[]>([]);
  const [pendingVacations, setPendingVacations] = useState<any[]>([]);
  const [openQuestions, setOpenQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});

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
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reviewTimeEntry = async (id: string, status: string) => {
    try {
      await timeEntriesAPI.review(id, status);
      loadData();
      loadStats();
    } catch (err) {
      alert('Failed to review time entry');
    }
  };

  const reviewVacation = async (id: string, status: string) => {
    try {
      await vacationsAPI.review(id, status);
      loadData();
      loadStats();
    } catch (err) {
      alert('Failed to review vacation');
    }
  };

  const answerQuestion = async (id: string) => {
    try {
      await questionsAPI.answer(id, answerText[id] || '');
      setAnswerText({ ...answerText, [id]: '' });
      loadData();
      loadStats();
    } catch (err) {
      alert('Failed to answer question');
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
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Pending Time Entries</h2>
            {loading ? <p>Loading...</p> : (
              <div className="space-y-3">
                {pendingTime.map((entry) => (
                  <div key={entry.id} className="border p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{entry.user.name} - {entry.user.email}</p>
                        <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
                        <p className="text-sm">{entry.hoursWorked} hours - {entry.description}</p>
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
        )}

        {activeTab === 'vacation' && (
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
        )}

        {activeTab === 'questions' && (
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
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
