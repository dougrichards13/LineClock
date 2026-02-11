import React, { useState, useEffect } from 'react';
import { timeEntriesAPI, clientsAPI, projectsAPI, modificationRequestsAPI } from '../services/api';

interface WeeklyTimeEntryProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface DayEntry {
  date: string;
  hours: string;
  description: string;
  clientId: string;
  projectId: string;
}

const WeeklyTimeEntry: React.FC<WeeklyTimeEntryProps> = ({ onSuccess, onError }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [weekEntries, setWeekEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modification request modal state
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [modificationReason, setModificationReason] = useState('');
  const [submittingModification, setSubmittingModification] = useState(false);

  // Get the current Monday (start of work week)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // day: 0=Sun, 1=Mon, 2=Tue, etc. We want Monday (1) as start.
    // If Sunday (0), go back 6 days. Otherwise go back (day - 1) days.
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Initialize week to current Monday
  useEffect(() => {
    const monday = getWeekStart(new Date());
    setCurrentWeekStart(monday);
    initializeWeekEntries(monday);
    loadClients();
  }, []);

  const initializeWeekEntries = (startDate: Date) => {
    const entries: DayEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      // Format as YYYY-MM-DD in local timezone (avoid UTC shift from toISOString)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      entries.push({
        date: `${year}-${month}-${day}`,
        hours: '',
        description: '',
        clientId: '',
        projectId: '',
      });
    }
    setWeekEntries(entries);
  };

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
      setProjects([]);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId('');
    if (clientId) {
      loadProjectsForClient(clientId);
    } else {
      setProjects([]);
    }
    // Update all entries with new client
    setWeekEntries(weekEntries.map(entry => ({
      ...entry,
      clientId,
      projectId: '',
    })));
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Update all entries with new project
    setWeekEntries(weekEntries.map(entry => ({
      ...entry,
      projectId,
    })));
  };

  const updateEntry = (index: number, field: keyof DayEntry, value: string) => {
    const updated = [...weekEntries];
    updated[index] = { ...updated[index], [field]: value };
    setWeekEntries(updated);
  };

  const handleSubmit = async () => {
    // Validate: at least one entry must have hours
    const hasEntries = weekEntries.some(e => parseFloat(e.hours) > 0);
    if (!hasEntries) {
      onError('Please enter hours for at least one day');
      return;
    }

    // Validate: client and project must be selected
    if (!selectedClientId || !selectedProjectId) {
      onError('Please select a client and project');
      return;
    }

    // Check if trying to modify past week
    const weekStartDate = new Date(currentWeekStart);
    const now = new Date();
    const currentSaturday = getWeekStart(now);
    
    if (weekStartDate < currentSaturday) {
      onError('Cannot modify time entries for past work weeks. Please submit a modification request to your administrator.');
      return;
    }

    setLoading(true);

    try {
      // Submit each entry that has hours
      for (const entry of weekEntries) {
        const hours = parseFloat(entry.hours);
        if (hours > 0 && hours <= 24) {
          await timeEntriesAPI.create({
            date: entry.date,
            hoursWorked: hours,
            clientId: selectedClientId,
            projectId: selectedProjectId,
            description: entry.description || undefined,
          });
        } else if (entry.hours && (hours <= 0 || hours > 24)) {
          onError(`Hours for ${new Date(entry.date).toLocaleDateString()} must be between 0 and 24`);
          setLoading(false);
          return;
        }
      }
      
      // Clear form
      initializeWeekEntries(currentWeekStart);
      setSelectedClientId('');
      setSelectedProjectId('');
      setProjects([]);
      onSuccess();
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to submit time entries');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
    initializeWeekEntries(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
    initializeWeekEntries(newStart);
  };

  const goToCurrentWeek = () => {
    const saturday = getWeekStart(new Date());
    setCurrentWeekStart(saturday);
    initializeWeekEntries(saturday);
  };

  const getTotalHours = () => {
    return weekEntries.reduce((sum, entry) => {
      const hours = parseFloat(entry.hours);
      return sum + (isNaN(hours) ? 0 : hours);
    }, 0);
  };

  const getDayName = (dateString: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Parse YYYY-MM-DD in local timezone (not UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return days[date.getDay()];
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(currentWeekStart.getDate() + 6);

  const isCurrentWeek = getWeekStart(new Date()).getTime() === currentWeekStart.getTime();
  const isPastWeek = currentWeekStart < getWeekStart(new Date());

  const handleSubmitModificationRequest = async () => {
    if (!modificationReason.trim()) {
      onError('Please provide a reason for the modification request');
      return;
    }

    if (!selectedClientId || !selectedProjectId) {
      onError('Please select a client and project');
      return;
    }

    const hasEntries = weekEntries.some(e => parseFloat(e.hours) > 0);
    if (!hasEntries) {
      onError('Please enter hours for at least one day');
      return;
    }

    setSubmittingModification(true);
    try {
      const entries = weekEntries
        .filter(e => parseFloat(e.hours) > 0)
        .map(e => ({
          date: e.date,
          hours: parseFloat(e.hours),
          description: e.description || undefined,
        }));

      await modificationRequestsAPI.create({
        weekStartDate: currentWeekStart.toISOString().split('T')[0],
        clientId: selectedClientId,
        projectId: selectedProjectId,
        entries,
        reason: modificationReason,
      });

      setShowModificationModal(false);
      setModificationReason('');
      initializeWeekEntries(currentWeekStart);
      setSelectedClientId('');
      setSelectedProjectId('');
      setProjects([]);
      onSuccess();
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to submit modification request');
    } finally {
      setSubmittingModification(false);
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl shadow-md border border-slate-600">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Weekly Time Entry</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all border border-slate-600"
            >
              ← Previous Week
            </button>
            {!isCurrentWeek && (
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all"
              >
                Current Week
              </button>
            )}
            <button
              onClick={goToNextWeek}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all border border-slate-600"
            >
              Next Week →
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-300">
            <span className="font-semibold">Week: </span>
            {currentWeekStart.toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
            {isCurrentWeek && <span className="ml-2 px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded text-xs">Current Week</span>}
            {isPastWeek && <span className="ml-2 px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded text-xs">Past Week - Read Only</span>}
          </p>
          <p className="text-gray-300">
            <span className="font-semibold">Total Hours: </span>
            <span className="text-indigo-400 font-bold text-lg">{getTotalHours().toFixed(1)}</span>
          </p>
        </div>
      </div>

      {isPastWeek && (
        <div className="mb-4 bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-xl">
          <p className="text-sm">
            ⚠️ This is a past work week. You cannot modify time entries for past weeks without submitting a{' '}
            <button
              onClick={() => setShowModificationModal(true)}
              className="text-yellow-300 underline hover:text-yellow-100 font-medium"
            >
              modification request to your administrator
            </button>.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Client and Project Selection */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-600">
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">Client *</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={isPastWeek}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={!selectedClientId || projects.length === 0 || isPastWeek}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Daily Time Entries */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">
            <div className="col-span-2">Day</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Hours</div>
            <div className="col-span-6">Task Notes (Optional)</div>
          </div>

          {weekEntries.map((entry, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-center bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
              <div className="col-span-2 text-sm font-medium text-white">
                {getDayName(entry.date)}
              </div>
              <div className="col-span-2 text-sm text-gray-300">
                {formatDate(entry.date)}
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="0.0"
                  value={entry.hours}
                  onChange={(e) => updateEntry(index, 'hours', e.target.value)}
                  disabled={isPastWeek}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="col-span-6">
                <input
                  type="text"
                  placeholder="What did you work on?"
                  value={entry.description}
                  onChange={(e) => updateEntry(index, 'description', e.target.value)}
                  disabled={isPastWeek}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {!isPastWeek && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedClientId || !selectedProjectId}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600"
            >
              {loading ? 'Submitting...' : 'Submit Week'}
            </button>
          </div>
        )}
      </div>

      {/* Modification Request Modal */}
      {showModificationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Request Past Week Modification</h3>
                <button
                  onClick={() => setShowModificationModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Week:</span>{' '}
                    {currentWeekStart.toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
                  </p>
                </div>

                {/* Client and Project Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 font-medium">Client *</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 font-medium">Project *</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      disabled={!selectedClientId || projects.length === 0}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-800 disabled:opacity-50"
                    >
                      <option value="">Select Project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Time Entries */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Time Entries *</label>
                  <div className="space-y-2">
                    {weekEntries.map((entry, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3 text-sm text-gray-300">
                          {getDayName(entry.date)} ({formatDate(entry.date)})
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="0.0"
                            value={entry.hours}
                            onChange={(e) => updateEntry(index, 'hours', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                        <div className="col-span-7">
                          <input
                            type="text"
                            placeholder="Task notes..."
                            value={entry.description}
                            onChange={(e) => updateEntry(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Total: <span className="font-medium text-indigo-400">{getTotalHours().toFixed(1)} hours</span>
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Reason for Modification *</label>
                  <textarea
                    value={modificationReason}
                    onChange={(e) => setModificationReason(e.target.value)}
                    placeholder="Please explain why you need to modify time entries for this past week..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 resize-none"
                  />
                </div>

                <div className="bg-blue-900/30 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-lg text-sm">
                  <p>ℹ️ This request will be sent to your direct supervisor for approval. Once approved, the time entries will be automatically added.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowModificationModal(false)}
                    className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitModificationRequest}
                    disabled={submittingModification || !selectedClientId || !selectedProjectId || !modificationReason.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingModification ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyTimeEntry;
