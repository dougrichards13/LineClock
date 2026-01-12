import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { timeEntriesAPI, vacationsAPI, questionsAPI } from '../services/api';

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'time' | 'vacation' | 'questions'>('time');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Time Entry Form
  const [timeForm, setTimeForm] = useState({ date: '', hoursWorked: '', description: '' });
  // Vacation Form
  const [vacationForm, setVacationForm] = useState({ startDate: '', endDate: '', reason: '' });
  // Question Form
  const [questionText, setQuestionText] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

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
    try {
      await timeEntriesAPI.create({
        date: timeForm.date,
        hoursWorked: parseFloat(timeForm.hoursWorked),
        description: timeForm.description,
      });
      setTimeForm({ date: '', hoursWorked: '', description: '' });
      loadData();
    } catch (err) {
      alert('Failed to create time entry');
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
    try {
      await timeEntriesAPI.update(id, { status: 'SUBMITTED' });
      loadData();
    } catch (err) {
      alert('Failed to submit for review');
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
        </div>

        {activeTab === 'time' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">New Time Entry</h2>
              <form onSubmit={submitTimeEntry} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <input type="date" required value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} className="px-3 py-2 border rounded" />
                  <input type="number" step="0.5" required placeholder="Hours" value={timeForm.hoursWorked} onChange={(e) => setTimeForm({ ...timeForm, hoursWorked: e.target.value })} className="px-3 py-2 border rounded" />
                  <input type="text" required placeholder="Description" value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} className="px-3 py-2 border rounded" />
                </div>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700">Add Entry</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">My Time Entries</h2>
              {loading ? <p>Loading...</p> : (
                <div className="space-y-2">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="border p-4 rounded flex justify-between">
                      <div>
                        <p className="font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">{entry.hoursWorked} hours - {entry.description}</p>
                        <span className={`text-xs px-2 py-1 rounded ${entry.status === 'APPROVED' ? 'bg-green-100' : entry.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'}`}>{entry.status}</span>
                      </div>
                      {entry.status === 'DRAFT' && (
                        <button onClick={() => submitTimeForReview(entry.id)} className="text-sm text-primary hover:text-blue-700">Submit for Review</button>
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
      </div>
    </div>
  );
};

export default EmployeeDashboard;
