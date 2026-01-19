import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { dashboardAPI, timeEntriesAPI, vacationsAPI, questionsAPI, clientsAPI, projectsAPI } from '../services/api';
import Profile from '../components/Profile';
import ClientProjectManagement from '../components/ClientProjectManagement';
import UserManagement from '../components/UserManagement';
import Invoicing from '../components/Invoicing';
import FIPManagement from '../components/FIPManagement';
import FinancialReports from '../components/FinancialReports';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';
import LiveClock from '../components/LiveClock';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'vacation' | 'clients' | 'users' | 'mytime' | 'invoicing' | 'fip' | 'reports' | 'profile'>('overview');
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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <style>{`
        /* Card backgrounds */
        .dark-theme-wrapper .bg-white,
        .dark-theme-wrapper .bg-gray-50 {
          background-color: rgb(30 41 59 / 0.9) !important;
          backdrop-filter: blur(12px);
          border-color: rgb(71 85 105) !important;
        }
        .dark-theme-wrapper .bg-gray-100 {
          background-color: rgb(51 65 85 / 0.5) !important;
        }
        
        /* Text colors - ensure ALL text is light on dark backgrounds */
        .dark-theme-wrapper h1,
        .dark-theme-wrapper h2,
        .dark-theme-wrapper h3,
        .dark-theme-wrapper h4,
        .dark-theme-wrapper h5,
        .dark-theme-wrapper h6,
        .dark-theme-wrapper p,
        .dark-theme-wrapper span,
        .dark-theme-wrapper div,
        .dark-theme-wrapper .text-gray-900,
        .dark-theme-wrapper .text-black {
          color: rgb(255 255 255) !important;
        }
        .dark-theme-wrapper .text-gray-800 {
          color: rgb(229 231 235) !important;
        }
        .dark-theme-wrapper .text-gray-700 {
          color: rgb(209 213 219) !important;
        }
        .dark-theme-wrapper .text-gray-600 {
          color: rgb(203 213 225) !important;
        }
        .dark-theme-wrapper .text-gray-500 {
          color: rgb(203 213 225) !important;
        }
        .dark-theme-wrapper .text-gray-400 {
          color: rgb(203 213 225) !important;
        }
        
        /* Remove visible borders, use subtle ones */
        .dark-theme-wrapper .border-gray-300,
        .dark-theme-wrapper .border-gray-200,
        .dark-theme-wrapper .border {
          border-color: transparent !important;
        }
        .dark-theme-wrapper .divide-gray-200 > * {
          border-color: transparent !important;
        }
        
        /* Add card styling instead of borders */
        .dark-theme-wrapper > div > div {
          background-color: rgb(30 41 59 / 0.6) !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          border: 1px solid rgb(71 85 105 / 0.3) !important;
        }
        
        /* Form inputs */
        .dark-theme-wrapper input,
        .dark-theme-wrapper select,
        .dark-theme-wrapper textarea {
          background-color: rgb(51 65 85) !important;
          border-color: rgb(71 85 105) !important;
          color: white !important;
        }
        .dark-theme-wrapper input::placeholder,
        .dark-theme-wrapper textarea::placeholder {
          color: rgb(107 114 128) !important;
        }
        
        /* Buttons - force consistent styling */
        .dark-theme-wrapper button {
          border-color: rgb(71 85 105) !important;
        }
        
        /* Override ALL button text colors */
        .dark-theme-wrapper button,
        .dark-theme-wrapper button span {
          color: white !important;
        }
        
        /* Primary action buttons */
        .dark-theme-wrapper button.bg-primary,
        .dark-theme-wrapper button[type="submit"]:not(.bg-gradient-to-r) {
          background: linear-gradient(to right, rgb(79 70 229), rgb(147 51 234)) !important;
          color: white !important;
          border: none !important;
        }
        
        /* Text-only buttons - make them visible */
        .dark-theme-wrapper button.text-blue-600,
        .dark-theme-wrapper button.text-blue-700,
        .dark-theme-wrapper .text-blue-600,
        .dark-theme-wrapper .text-blue-700 {
          color: rgb(129 140 248) !important;
        }
        
        .dark-theme-wrapper button.text-red-600,
        .dark-theme-wrapper button.text-red-700,
        .dark-theme-wrapper .text-red-600,
        .dark-theme-wrapper .text-red-700 {
          color: rgb(248 113 113) !important;
        }
        
        /* Delete/Deactivate buttons */
        .dark-theme-wrapper button.bg-red-100,
        .dark-theme-wrapper .bg-red-100 {
          background-color: rgb(127 29 29 / 0.5) !important;
          color: rgb(248 113 113) !important;
        }
        
        /* Badge styling */
        .dark-theme-wrapper .bg-blue-100 {
          background-color: rgb(30 64 175 / 0.3) !important;
          color: rgb(147 197 253) !important;
        }
        
        .dark-theme-wrapper .bg-green-100,
        .dark-theme-wrapper .text-green-800 {
          background-color: rgb(20 83 45 / 0.3) !important;
          color: rgb(134 239 172) !important;
        }
        
        .dark-theme-wrapper .text-blue-800 {
          color: rgb(147 197 253) !important;
        }
        
        /* Dropdown selects */
        .dark-theme-wrapper select option {
          background-color: rgb(51 65 85) !important;
          color: white !important;
        }
        
        /* Table styling */
        .dark-theme-wrapper table {
          background-color: transparent !important;
        }
        
        .dark-theme-wrapper thead {
          background-color: rgb(51 65 85 / 0.5) !important;
        }
        
        .dark-theme-wrapper thead th {
          color: rgb(203 213 225) !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          font-size: 0.75rem !important;
          letter-spacing: 0.05em !important;
        }
        
        .dark-theme-wrapper tbody {
          background-color: transparent !important;
        }
        
        .dark-theme-wrapper tbody tr {
          border-bottom: 1px solid rgb(71 85 105 / 0.3) !important;
        }
        
        .dark-theme-wrapper tbody td {
          color: rgb(226 232 240) !important;
          padding: 1rem 1.5rem !important;
        }
        
        .dark-theme-wrapper .divide-y > * {
          border-color: rgb(71 85 105 / 0.3) !important;
        }
        
        /* Status badges in tables */
        .dark-theme-wrapper .bg-gray-100.text-gray-800 {
          background-color: rgb(71 85 105 / 0.3) !important;
          color: rgb(203 213 225) !important;
        }
      `}</style>
      <AnimatedBackground />
      
      <nav className="bg-slate-800 shadow-lg border-b border-slate-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <LiveClock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">LineClock™</h1>
              <p className="text-xs text-gray-400">Admin Portal</p>
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
            <button onClick={() => setActiveTab('overview')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Overview</button>
            <button onClick={() => setActiveTab('time')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'time' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Time Entries</button>
            <button onClick={() => setActiveTab('vacation')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'vacation' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Vacations</button>
            <button onClick={() => setActiveTab('clients')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'clients' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Clients & Projects</button>
            <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Users</button>
            <button onClick={() => setActiveTab('invoicing')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'invoicing' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Invoicing</button>
            <button onClick={() => setActiveTab('fip')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'fip' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>FIP</button>
            <button onClick={() => setActiveTab('reports')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'reports' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Reports</button>
            <button onClick={() => setActiveTab('mytime')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'mytime' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>My Time</button>
            <button onClick={() => setActiveTab('profile')} className={`px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'profile' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-slate-800/90 backdrop-blur text-white hover:bg-slate-700/90 border border-slate-600'}`}>Profile</button>
          </div>

          {activeTab === 'overview' && stats && (
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Pending Time Entries</p>
                    <p className="text-4xl font-black text-indigo-400 mt-2">{stats.pendingTimeEntries}</p>
                  </div>
                  <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Pending Vacations</p>
                    <p className="text-4xl font-black text-purple-400 mt-2">{stats.pendingVacations}</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Total Employees</p>
                    <p className="text-4xl font-black text-emerald-400 mt-2">{stats.totalEmployees}</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg backdrop-blur">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg backdrop-blur">
                  {success}
                </div>
              )}
              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
                <h2 className="text-lg font-semibold mb-4 text-white">Pending Time Entries</h2>
                {loading ? <p className="text-gray-400">Loading...</p> : (
                  <div className="space-y-3">
                    {pendingTime.map((entry) => (
                      <div key={entry.id} className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{entry.user.name} - {entry.user.email}</p>
                          <p className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                          <p className="text-sm text-gray-300"><span className="font-medium">{entry.client?.name}</span> / {entry.project?.name}{entry.description && ` - ${entry.description}`}</p>
                        </div>
                          <div className="flex gap-2">
                            <button onClick={() => reviewTimeEntry(entry.id, 'APPROVED')} className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors">Approve</button>
                            <button onClick={() => reviewTimeEntry(entry.id, 'REJECTED')} className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingTime.length === 0 && <p className="text-gray-400 text-center py-8">No pending time entries</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vacation' && (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg backdrop-blur">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg backdrop-blur">
                  {success}
                </div>
              )}
              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
                <h2 className="text-lg font-semibold mb-4 text-white">Pending Vacation Requests</h2>
                {loading ? <p className="text-gray-400">Loading...</p> : (
                  <div className="space-y-3">
                    {pendingVacations.map((vac) => (
                      <div key={vac.id} className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{vac.user.name} - {vac.user.email}</p>
                            <p className="text-sm text-gray-400">{new Date(vac.startDate).toLocaleDateString()} - {new Date(vac.endDate).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-300">{vac.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => reviewVacation(vac.id, 'APPROVED')} className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors">Approve</button>
                            <button onClick={() => reviewVacation(vac.id, 'REJECTED')} className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingVacations.length === 0 && <p className="text-gray-400 text-center py-8">No pending vacation requests</p>}
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
            <div className="dark-theme-wrapper">
              <ClientProjectManagement />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="dark-theme-wrapper">
              <UserManagement />
            </div>
          )}

          {activeTab === 'invoicing' && (
            <div className="dark-theme-wrapper">
              <Invoicing />
            </div>
          )}

          {activeTab === 'fip' && <FIPManagement />}

          {activeTab === 'reports' && <FinancialReports />}

          {activeTab === 'mytime' && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg backdrop-blur">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg backdrop-blur">
                  {success}
                </div>
              )}

              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
                <h2 className="text-lg font-semibold mb-4 text-white">New Time Entry</h2>
                <form onSubmit={submitTimeEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Date *</label>
                      <input type="date" required value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Hours *</label>
                      <input type="number" step="0.5" min="0.5" max="24" required placeholder="8.0" value={timeForm.hoursWorked} onChange={(e) => setTimeForm({ ...timeForm, hoursWorked: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Client *</label>
                      <select
                        required
                        value={timeForm.clientId}
                        onChange={(e) => {
                          const clientId = e.target.value;
                          setTimeForm({ ...timeForm, clientId, projectId: '' });
                          if (clientId) loadProjectsForClient(clientId);
                          else setProjects([]);
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Project *</label>
                      <select
                        required
                        value={timeForm.projectId}
                        onChange={(e) => setTimeForm({ ...timeForm, projectId: e.target.value })}
                        disabled={!timeForm.clientId || projects.length === 0}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-800 disabled:text-gray-500"
                      >
                        <option value="">Select Project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Task Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="What did you work on?"
                      value={timeForm.description}
                      onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all">Add Entry</button>
                </form>
              </div>

              <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
                <h2 className="text-lg font-semibold mb-4 text-white">My Time Entries</h2>
                {loading ? (
                  <p className="text-gray-400">Loading...</p>
                ) : myTimeEntries.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No time entries yet. Create your first one above!</p>
                ) : (
                  <div className="space-y-3">
                    {myTimeEntries.map((entry) => (
                      <div key={entry.id} className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg">
                        {editingEntry === entry.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg" />
                              <input type="number" step="0.5" min="0.5" max="24" value={editForm.hoursWorked} onChange={(e) => setEditForm({ ...editForm, hoursWorked: e.target.value })} className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg" placeholder="Hours" />
                              <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg placeholder-gray-500" placeholder="Description" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(entry.id)} className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all">Save</button>
                              <button onClick={cancelEdit} className="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-medium text-white">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                                {(entry.consultantAmount || entry.clientAmount) && (
                                  <div className="flex items-center gap-2 text-xs">
                                    {entry.consultantAmount > 0 && (
                                      <span className="px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded-md border border-emerald-700/50">
                                        💰 Your Earnings: ${entry.consultantAmount.toFixed(2)}
                                      </span>
                                    )}
                                    {entry.clientAmount > 0 && (
                                      <span className="px-2 py-1 bg-blue-900/40 text-blue-300 rounded-md border border-blue-700/50">
                                        📊 Client Billed: ${entry.clientAmount.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">
                                <span className="font-medium">{entry.client?.name}</span> / {entry.project?.name}
                                {entry.description && ` - ${entry.description}`}
                              </p>
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-lg ${
                                  entry.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                                  entry.status === 'REJECTED' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                                  entry.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                  'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                }`}>{entry.status}</span>
                                {entry.consultantRate > 0 && (
                                  <span className="text-xs text-gray-400">
                                    @ ${entry.consultantRate.toFixed(2)}/hr
                                  </span>
                                )}
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
                                  <button onClick={() => startEditEntry(entry)} className="text-sm text-indigo-400 hover:text-indigo-300 px-2 py-1 transition-colors">Edit</button>
                                  <button onClick={() => deleteEntry(entry.id)} className="text-sm text-red-400 hover:text-red-300 px-2 py-1 transition-colors">Delete</button>
                                  <button onClick={() => submitTimeForReview(entry.id)} className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all">Submit</button>
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
            <div className="dark-theme-wrapper">
              <Profile />
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
