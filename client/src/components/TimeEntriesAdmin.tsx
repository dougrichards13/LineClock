import React, { useState, useEffect } from 'react';
import { timeEntriesAPI, modificationRequestsAPI } from '../services/api';

interface ModificationRequest {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  client: { id: string; name: string };
  project: { id: string; name: string };
  weekStartDate: string;
  entries: string | Array<{ date: string; hours: number; description?: string }>;
  reason: string;
  status: string;
  approver: { id: string; name: string; email: string } | null;
  createdAt: string;
}

// Helper to parse entries (handles both string and array)
const parseEntries = (entries: string | Array<{ date: string; hours: number; description?: string }>): Array<{ date: string; hours: number; description?: string }> => {
  if (typeof entries === 'string') {
    try {
      return JSON.parse(entries);
    } catch {
      return [];
    }
  }
  return entries;
};

interface TimeEntriesAdminProps {
  onPendingCountChange?: (timeCount: number, modCount: number) => void;
  onCountChange?: () => void;
}

const TimeEntriesAdmin: React.FC<TimeEntriesAdminProps> = ({ onPendingCountChange, onCountChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'entries' | 'modifications'>('entries');
  const [pendingTime, setPendingTime] = useState<any[]>([]);
  const [pendingModifications, setPendingModifications] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [timeRes, modRes] = await Promise.all([
        timeEntriesAPI.getPending(),
        modificationRequestsAPI.getPending()
      ]);
      setPendingTime(timeRes.data.data);
      setPendingModifications(modRes.data.data);
      
      // Notify parent of counts
      if (onPendingCountChange) {
        onPendingCountChange(timeRes.data.data.length, modRes.data.data.length);
      }
      if (onCountChange) {
        onCountChange();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const reviewTimeEntry = async (id: string, status: string) => {
    try {
      setError('');
      setSuccess('');
      await timeEntriesAPI.review(id, status);
      setSuccess(`Time entry ${status.toLowerCase()} successfully`);
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review time entry');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleReviewModification = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setError('');
      setSuccess('');
      await modificationRequestsAPI.review(requestId, status, reviewNotes[requestId]);
      setSuccess(`Modification request ${status.toLowerCase()} successfully`);
      setReviewNotes({ ...reviewNotes, [requestId]: '' });
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to review modification request');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatWeekDates = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const getTotalHours = (entries: Array<{ hours: number }>) => {
    return entries.reduce((sum, e) => sum + e.hours, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg backdrop-blur">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg backdrop-blur">
          {error}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-600 pb-2">
        <button
          onClick={() => setActiveSubTab('entries')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'entries'
              ? 'bg-slate-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pending Time Entries
          {pendingTime.length > 0 && (
            <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-full text-xs font-bold">
              {pendingTime.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('modifications')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'modifications'
              ? 'bg-slate-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Modification Requests
          {pendingModifications.length > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 rounded-full text-xs font-bold">
              {pendingModifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Time Entries */}
      {activeSubTab === 'entries' && (
        <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
          <h2 className="text-lg font-semibold mb-4 text-white">Pending Time Entries</h2>
          <div className="space-y-3">
            {pendingTime.map((entry) => (
              <div key={entry.id} className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-white">{entry.user.name} - {entry.user.email}</p>
                    <p className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString()} - {entry.hoursWorked} hours</p>
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">{entry.client?.name}</span> / {entry.project?.name}
                      {entry.description && ` - ${entry.description}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewTimeEntry(entry.id, 'APPROVED')}
                      className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reviewTimeEntry(entry.id, 'REJECTED')}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingTime.length === 0 && (
              <p className="text-gray-400 text-center py-8">No pending time entries</p>
            )}
          </div>
        </div>
      )}

      {/* Modification Requests */}
      {activeSubTab === 'modifications' && (
        <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Pending Modification Requests</h2>
            <p className="text-sm text-gray-400">
              Review and approve or reject time entry modification requests for past work weeks.
            </p>
          </div>

          <div className="space-y-4">
            {pendingModifications.map((request) => (
              <div
                key={request.id}
                className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-white">{request.user.name}</p>
                    <p className="text-sm text-gray-400">{request.user.email}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded border border-yellow-500/30">
                    {request.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-400">Week: </span>
                    <span className="text-white">{formatWeekDates(request.weekStartDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Hours: </span>
                    <span className="text-indigo-400 font-medium">{getTotalHours(parseEntries(request.entries)).toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Client: </span>
                    <span className="text-white">{request.client.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Project: </span>
                    <span className="text-white">{request.project.name}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-1">Entries:</p>
                  <div className="bg-slate-800/50 rounded p-2 space-y-1">
                    {parseEntries(request.entries).map((entry, idx) => (
                      <div key={idx} className="text-sm text-gray-300 flex justify-between">
                        <span>{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="text-indigo-300">{entry.hours}h</span>
                        {entry.description && <span className="text-gray-500 truncate max-w-[200px]">{entry.description}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-1">Reason:</p>
                  <p className="text-sm text-white bg-slate-800/50 rounded p-2">{request.reason}</p>
                </div>

                <div className="mb-3">
                  <label className="text-sm text-gray-400 mb-1 block">Review Notes (optional):</label>
                  <input
                    type="text"
                    value={reviewNotes[request.id] || ''}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                    placeholder="Add notes about your decision..."
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-sm"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => handleReviewModification(request.id, 'REJECTED')}
                    className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReviewModification(request.id, 'APPROVED')}
                    className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}

            {pendingModifications.length === 0 && (
              <p className="text-gray-400 text-center py-8">No pending modification requests</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeEntriesAdmin;
