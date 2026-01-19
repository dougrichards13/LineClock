import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../utils/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  name: string;
  email: string;
  billableRate?: number;
}

interface Project {
  id: string;
  name: string;
  client?: {
    name: string;
  };
}

const FinancialReports: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeView, setActiveView] = useState<'fip-dashboard' | '1099' | 'profitability' | 'company'>('fip-dashboard');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // FIP Dashboard state
  const [fipData, setFipData] = useState<any>(null);

  // 1099 Report state
  const [selected1099User, setSelected1099User] = useState('');
  const [selected1099Year, setSelected1099Year] = useState(new Date().getFullYear().toString());
  const [report1099Data, setReport1099Data] = useState<any>(null);

  // Profitability state
  const [selectedProject, setSelectedProject] = useState('');
  const [profitabilityStartDate, setProfitabilityStartDate] = useState('');
  const [profitabilityEndDate, setProfitabilityEndDate] = useState('');
  const [profitabilityData, setProfitabilityData] = useState<any>(null);

  // Company Summary state
  const [companySummaryData, setCompanySummaryData] = useState<any>(null);
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');

  useEffect(() => {
    loadUsers();
    loadProjects();
    if (currentUser) {
      loadMyFIPDashboard();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/entra/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadMyFIPDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/fractional-incentives/my-incentives`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFipData(response.data.data);
    } catch (error) {
      console.error('Failed to load FIP dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const load1099Report = async () => {
    if (!selected1099User || !selected1099Year) {
      alert('Please select a user and year');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/financial-reports/1099/${selected1099User}/${selected1099Year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport1099Data(response.data.data);
    } catch (error: any) {
      console.error('Failed to load 1099 report:', error);
      alert(error.response?.data?.error || 'Failed to load 1099 report');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitabilityReport = async () => {
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (profitabilityStartDate) params.append('startDate', profitabilityStartDate);
      if (profitabilityEndDate) params.append('endDate', profitabilityEndDate);

      const response = await axios.get(
        `${API_URL}/financial-reports/project-profitability/${selectedProject}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfitabilityData(response.data.data);
    } catch (error: any) {
      console.error('Failed to load profitability report:', error);
      alert(error.response?.data?.error || 'Failed to load profitability report');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (summaryStartDate) params.append('startDate', summaryStartDate);
      if (summaryEndDate) params.append('endDate', summaryEndDate);

      const response = await axios.get(
        `${API_URL}/financial-reports/company-summary?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanySummaryData(response.data.data);
    } catch (error: any) {
      console.error('Failed to load company summary:', error);
      alert(error.response?.data?.error || 'Failed to load company summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Financial Reports</h2>
        <p className="text-gray-400">View earnings, profitability, and FIP performance</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveView('fip-dashboard')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeView === 'fip-dashboard'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
        >
          My FIP Dashboard
        </button>
        {currentUser?.role === 'ADMIN' && (
          <>
            <button
              onClick={() => setActiveView('1099')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeView === '1099'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              1099 Reports
            </button>
            <button
              onClick={() => setActiveView('profitability')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeView === 'profitability'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              Project Profitability
            </button>
            <button
              onClick={() => setActiveView('company')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeView === 'company'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              Company Summary
            </button>
          </>
        )}
      </div>

      {/* FIP Dashboard View */}
      {activeView === 'fip-dashboard' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-gray-300 py-8">Loading FIP data...</div>
          ) : fipData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl border border-slate-700">
                  <p className="text-sm text-gray-400 mb-1">Total FIP Earnings (YTD)</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ${fipData.totalEarnings?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl border border-slate-700">
                  <p className="text-sm text-gray-400 mb-1">Active FIP Assignments</p>
                  <p className="text-3xl font-bold text-blue-400">{fipData.asLeader?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Where you earn incentives</p>
                </div>
                <div className="bg-slate-800/90 backdrop-blur p-6 rounded-xl border border-slate-700">
                  <p className="text-sm text-gray-400 mb-1">FIP Earnings Count</p>
                  <p className="text-3xl font-bold text-purple-400">{fipData.earnings?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Individual earning events</p>
                </div>
              </div>

              {/* Active FIP Assignments */}
              {fipData.asLeader && fipData.asLeader.length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Your Active FIP Assignments (You Earn From)
                  </h3>
                  <div className="space-y-3">
                    {fipData.asLeader.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="bg-slate-700/50 p-4 rounded-lg border border-slate-600"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">{assignment.consultant.name}</p>
                            <p className="text-sm text-gray-400">
                              {assignment.project ? `${assignment.project.name}` : 'All Projects'}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 rounded-md text-sm font-semibold">
                            ${assignment.incentiveRate.toFixed(2)}/hr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent FIP Earnings */}
              {fipData.earnings && fipData.earnings.length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent FIP Earnings</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {fipData.earnings.slice(0, 20).map((earning: any) => (
                      <div
                        key={earning.id}
                        className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-white">
                            {new Date(earning.timeEntry.date).toLocaleDateString()} - {earning.timeEntry.user.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {earning.timeEntry.project.name} · {earning.timeEntry.hoursWorked} hours
                          </p>
                        </div>
                        <span className="text-emerald-400 font-semibold">
                          +${earning.incentiveAmount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fipData.asLeader?.length === 0 && fipData.earnings?.length === 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-12 border border-slate-700 text-center">
                  <p className="text-gray-400 mb-2">No FIP data available</p>
                  <p className="text-sm text-gray-500">
                    You don't have any active FIP assignments or earnings yet.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-800/90 backdrop-blur rounded-xl p-12 border border-slate-700 text-center">
              <p className="text-gray-400">Click refresh to load your FIP dashboard</p>
              <button
                onClick={loadMyFIPDashboard}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
              >
                Load Dashboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1099 Report View */}
      {activeView === '1099' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Generate 1099 Report</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <select
                value={selected1099User}
                onChange={(e) => setSelected1099User(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select User...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selected1099Year}
                onChange={(e) => setSelected1099Year(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="Year"
                min="2020"
                max={new Date().getFullYear()}
              />
              <button
                onClick={load1099Report}
                disabled={loading || !selected1099User || !selected1099Year}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {report1099Data && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">
                  1099 Summary for {report1099Data.user.name} - {report1099Data.year}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-400">Direct Billable</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${report1099Data.summary.directEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {report1099Data.directBillable.totalHours.toFixed(1)} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">FIP Incentives</p>
                    <p className="text-2xl font-bold text-purple-400">
                      ${report1099Data.summary.fipEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {report1099Data.fipIncentives.totalHours.toFixed(1)} incentive hours
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Income</p>
                    <p className="text-2xl font-bold text-white">
                      ${report1099Data.summary.totalIncome.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">For tax reporting</p>
                  </div>
                </div>
                {report1099Data.user.billableRate && (
                  <p className="text-sm text-gray-400">
                    Current Billable Rate: ${report1099Data.user.billableRate.toFixed(2)}/hr
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Profitability View */}
      {activeView === 'profitability' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Project Profitability Analysis</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.client?.name} - {project.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={profitabilityStartDate}
                onChange={(e) => setProfitabilityStartDate(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="Start Date (optional)"
              />
              <input
                type="date"
                value={profitabilityEndDate}
                onChange={(e) => setProfitabilityEndDate(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="End Date (optional)"
              />
              <button
                onClick={loadProfitabilityReport}
                disabled={loading || !selectedProject}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Analyze'}
              </button>
            </div>
          </div>

          {profitabilityData && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">
                  {profitabilityData.project.client?.name} - {profitabilityData.project.name}
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Hours</p>
                    <p className="text-2xl font-bold text-white">
                      {profitabilityData.summary.totalHours.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Client Revenue</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${profitabilityData.summary.totalClientAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Consultant Cost</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      ${profitabilityData.summary.totalConsultantAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">FIP Paid</p>
                    <p className="text-2xl font-bold text-purple-400">
                      ${profitabilityData.summary.totalFipAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Net Margin</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${profitabilityData.summary.totalMargin.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {profitabilityData.summary.marginPercentage}% margin
                    </p>
                  </div>
                </div>
              </div>

              {/* By Consultant Breakdown */}
              {profitabilityData.byConsultant && Object.keys(profitabilityData.byConsultant).length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Breakdown by Consultant</h4>
                  <div className="space-y-3">
                    {Object.entries(profitabilityData.byConsultant).map(([name, data]: [string, any]) => (
                      <div key={name} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-white">{name}</p>
                            <p className="text-sm text-gray-400">{data.hours.toFixed(1)} hours</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-emerald-400">Revenue: ${data.clientAmount.toFixed(2)}</p>
                            <p className="text-gray-400">Cost: ${data.consultantAmount.toFixed(2)}</p>
                            {data.fipAmount > 0 && (
                              <p className="text-purple-400">FIP: ${data.fipAmount.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Company Summary View */}
      {activeView === 'company' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Company-Wide Financial Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <input
                type="date"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="Start Date (optional)"
              />
              <input
                type="date"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="End Date (optional)"
              />
              <button
                onClick={loadCompanySummary}
                disabled={loading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Generate Summary'}
              </button>
            </div>
          </div>

          {companySummaryData && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Overall Performance</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Hours</p>
                    <p className="text-2xl font-bold text-white">
                      {companySummaryData.summary.totalHours.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${companySummaryData.summary.totalClientAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Cost</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      ${companySummaryData.summary.totalConsultantAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Net Margin</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${companySummaryData.summary.totalMargin.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {companySummaryData.summary.marginPercentage}%
                    </p>
                  </div>
                </div>
              </div>

              {/* By Project */}
              {companySummaryData.byProject && Object.keys(companySummaryData.byProject).length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-4">By Project</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Object.entries(companySummaryData.byProject)
                      .sort((a: any, b: any) => b[1].margin - a[1].margin)
                      .map(([name, data]: [string, any]) => (
                        <div
                          key={name}
                          className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0"
                        >
                          <div>
                            <p className="text-white font-medium">{name}</p>
                            <p className="text-sm text-gray-400">
                              {data.clientName} · {data.hours.toFixed(1)} hours
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-semibold">
                              ${data.margin.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-400">
                              ${data.clientAmount.toFixed(2)} revenue
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* By Client */}
              {companySummaryData.byClient && Object.keys(companySummaryData.byClient).length > 0 && (
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 border border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-4">By Client</h4>
                  <div className="space-y-2">
                    {Object.entries(companySummaryData.byClient)
                      .sort((a: any, b: any) => b[1].clientAmount - a[1].clientAmount)
                      .map(([name, data]: [string, any]) => (
                        <div
                          key={name}
                          className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0"
                        >
                          <div>
                            <p className="text-white font-medium">{name}</p>
                            <p className="text-sm text-gray-400">{data.hours.toFixed(1)} hours</p>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-400 font-semibold">
                              ${data.clientAmount.toFixed(2)}
                            </p>
                            <p className="text-sm text-emerald-400">
                              ${data.margin.toFixed(2)} margin
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
