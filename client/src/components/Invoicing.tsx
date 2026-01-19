import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Invoice {
  id: string;
  clientId: string;
  client: { id: string; name: string };
  status: string;
  totalHours: number;
  totalAmount?: number;
  billComInvoiceId?: string;
  invoiceNumber?: string;
  dueDate?: string;
  submittedAt?: string;
  failureReason?: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
}

interface InvoiceLineItem {
  id: string;
  employeeName: string;
  projectName: string;
  description: string;
  hours: number;
  amount?: number;
  date: string;
}

interface InvoiceBatch {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  generatedAt: string;
  submittedAt?: string;
  notes?: string;
  invoices: Invoice[];
}

interface BillComConfig {
  configured: boolean;
  environment?: string;
  sessionValid?: boolean;
  lastUpdated?: string;
}

interface CustomerMapping {
  id: string;
  clientId: string;
  client: { id: string; name: string };
  billComCustomerId: string;
  billComCustomerName?: string;
}

type Tab = 'generate' | 'review' | 'history' | 'settings';

const Invoicing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate tab state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Review tab state
  const [batches, setBatches] = useState<InvoiceBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<InvoiceBatch | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // History tab state
  const [historyInvoices, setHistoryInvoices] = useState<Invoice[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');

  // Settings tab state
  const [billComConfig, setBillComConfig] = useState<BillComConfig>({ configured: false });
  const [credentials, setCredentials] = useState({
    devKey: '',
    username: '',
    password: '',
    organizationId: '',
    environment: 'SANDBOX',
  });
  const [customerMappings, setCustomerMappings] = useState<CustomerMapping[]>([]);
  const [unmappedClients, setUnmappedClients] = useState<any[]>([]);
  const [billComCustomers, setBillComCustomers] = useState<any[]>([]);
  const [selectedMapping, setSelectedMapping] = useState({ clientId: '', billComCustomerId: '' });

  useEffect(() => {
    if (activeTab === 'review') loadBatches();
    if (activeTab === 'history') loadHistoryInvoices();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  // Set default date range (last 2 weeks)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 14);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Generate invoice batch
  const generateBatch = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await axiosInstance.post('/invoices/batches/generate', {
        startDate,
        endDate,
        notes: batchNotes,
      });
      setSuccess(`Invoice batch generated with ${response.data.data.invoices.length} invoices`);
      setBatchNotes('');
      setTimeout(() => setActiveTab('review'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate invoice batch');
    } finally {
      setLoading(false);
    }
  };

  // Load batches for review
  const loadBatches = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/invoices/batches?status=DRAFT');
      setBatches(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  // Load single batch details
  const loadBatchDetails = async (batchId: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/invoices/batches/${batchId}`);
      setSelectedBatch(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  // Approve invoice
  const approveInvoice = async (invoiceId: string) => {
    clearMessages();
    try {
      await axiosInstance.patch(`/invoices/invoices/${invoiceId}`, { status: 'APPROVED' });
      setSuccess('Invoice approved');
      if (selectedBatch) loadBatchDetails(selectedBatch.id);
      setTimeout(clearMessages, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve invoice');
    }
  };

  // Submit batch to Bill.com
  const submitBatch = async (batchId: string) => {
    if (!confirm('Submit approved invoices to Bill.com? This will send invoices to clients.')) return;

    clearMessages();
    setLoading(true);
    try {
      const response = await axiosInstance.post(`/invoices/batches/${batchId}/submit`);
      setSuccess(response.data.data.message);
      setSelectedBatch(null);
      loadBatches();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit invoices');
    } finally {
      setLoading(false);
    }
  };

  // Load invoice history
  const loadHistoryInvoices = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/invoices/invoices');
      setHistoryInvoices(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invoice history');
    } finally {
      setLoading(false);
    }
  };

  // Load settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const [configRes, mappingsRes, unmappedRes] = await Promise.all([
        axiosInstance.get('/billcom/status'),
        axiosInstance.get('/billcom/customer-mappings'),
        axiosInstance.get('/billcom/unmapped-clients'),
      ]);
      setBillComConfig(configRes.data.data);
      setCustomerMappings(mappingsRes.data.data);
      setUnmappedClients(unmappedRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save Bill.com credentials
  const saveCredentials = async () => {
    console.log('📤 Attempting to save credentials:', {
      hasDevKey: !!credentials.devKey,
      hasUsername: !!credentials.username,
      hasPassword: !!credentials.password,
      hasOrgId: !!credentials.organizationId,
      environment: credentials.environment,
    });
    
    clearMessages();
    setLoading(true);
    try {
      console.log('📤 Posting to /billcom/credentials...');
      const response = await axiosInstance.post('/billcom/credentials', credentials);
      console.log('✅ Response:', response.data);
      setSuccess('Credentials saved successfully');
      setCredentials({ devKey: '', username: '', password: '', organizationId: '', environment: 'SANDBOX' });
      loadSettings();
    } catch (err: any) {
      console.error('❌ Save credentials error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.error || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  // Test Bill.com connection
  const testConnection = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await axiosInstance.post('/billcom/test-connection');
      if (response.data.success) {
        setSuccess(`Connected successfully! Environment: ${response.data.data.environment}`);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  // Sync customers from Bill.com
  const syncCustomers = async () => {
    console.log('🔄 Syncing customers from Bill.com...');
    clearMessages();
    setLoading(true);
    try {
      const response = await axiosInstance.post('/billcom/sync-customers');
      console.log('✅ Customers synced:', response.data);
      setBillComCustomers(response.data.data);
      setSuccess(`${response.data.message} - Retrieved ${response.data.data.length} customers`);
    } catch (err: any) {
      console.error('❌ Sync customers error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to sync customers');
    } finally {
      setLoading(false);
    }
  };

  // Save customer mapping
  const saveMapping = async () => {
    if (!selectedMapping.clientId || !selectedMapping.billComCustomerId) {
      setError('Please select both client and Bill.com customer');
      return;
    }

    clearMessages();
    try {
      const customer = billComCustomers.find(c => c.id === selectedMapping.billComCustomerId);
      await axiosInstance.post('/billcom/customer-mappings', {
        clientId: selectedMapping.clientId,
        billComCustomerId: selectedMapping.billComCustomerId,
        billComCustomerName: customer?.name,
      });
      setSuccess('Customer mapping saved');
      setSelectedMapping({ clientId: '', billComCustomerId: '' });
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save mapping');
    }
  };

  // Delete customer mapping
  const deleteMapping = async (clientId: string) => {
    if (!confirm('Delete this customer mapping?')) return;

    clearMessages();
    try {
      await axiosInstance.delete(`/billcom/customer-mappings/${clientId}`);
      setSuccess('Mapping deleted');
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete mapping');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'generate' ? 'border-primary text-primary font-semibold' : 'border-transparent'}`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'review' ? 'border-primary text-primary font-semibold' : 'border-transparent'}`}
        >
          Review
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'history' ? 'border-primary text-primary font-semibold' : 'border-transparent'}`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'settings' ? 'border-primary text-primary font-semibold' : 'border-transparent'}`}
        >
          Settings
        </button>
      </div>

      {/* Messages */}
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

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Generate Invoice Batch</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Add notes about this invoice batch..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <button
                onClick={generateBatch}
                disabled={loading || !startDate || !endDate}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Invoice Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {!selectedBatch ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Pending Invoice Batches</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : batches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending batches</p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="border p-4 rounded hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{batch.invoices.length} invoices</p>
                          {batch.notes && <p className="text-sm text-gray-500 mt-1">{batch.notes}</p>}
                        </div>
                        <button
                          onClick={() => loadBatchDetails(batch.id)}
                          className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-blue-700"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-primary hover:underline"
                >
                  ← Back to batches
                </button>
                <button
                  onClick={() => submitBatch(selectedBatch.id)}
                  disabled={loading || !selectedBatch.invoices.some(i => i.status === 'APPROVED')}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit to Bill.com
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Batch: {new Date(selectedBatch.startDate).toLocaleDateString()} - {new Date(selectedBatch.endDate).toLocaleDateString()}
                </h2>
                <div className="space-y-3">
                  {selectedBatch.invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded">
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{invoice.client.name}</p>
                            <p className="text-sm text-gray-600">{invoice.totalHours} hours</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                            {invoice.status === 'DRAFT' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveInvoice(invoice.id);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedInvoice === invoice.id && (
                        <div className="border-t p-4 bg-gray-50">
                          <h4 className="font-medium mb-2">Line Items:</h4>
                          <div className="space-y-2">
                            {invoice.lineItems.map((item) => (
                              <div key={item.id} className="text-sm flex justify-between">
                                <span>{item.description}</span>
                                <span className="font-medium">{item.hours} hrs</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Invoice History</h2>
            <input
              type="text"
              placeholder="Filter by client..."
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            />
          </div>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Client</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Hours</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Invoice #</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyInvoices
                    .filter(inv => !historyFilter || inv.client.name.toLowerCase().includes(historyFilter.toLowerCase()))
                    .map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {invoice.submittedAt ? new Date(invoice.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{invoice.client.name}</td>
                        <td className="px-4 py-3 text-sm">{invoice.totalHours}</td>
                        <td className="px-4 py-3 text-sm">
                          {invoice.totalAmount ? `$${invoice.totalAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{invoice.invoiceNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Bill.com Configuration */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Bill.com Configuration</h2>
            {billComConfig.configured && (
              <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded">
                <p className="text-sm text-emerald-300">
                  ✓ Connected to {billComConfig.environment} environment
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Developer Key</label>
                  <input
                    type="password"
                    value={credentials.devKey}
                    onChange={(e) => setCredentials({ ...credentials, devKey: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Organization ID</label>
                  <input
                    type="text"
                    value={credentials.organizationId}
                    onChange={(e) => setCredentials({ ...credentials, organizationId: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Environment</label>
                <select
                  value={credentials.environment}
                  onChange={(e) => setCredentials({ ...credentials, environment: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="SANDBOX">Sandbox</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveCredentials}
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Save Credentials
                </button>
                <button
                  onClick={testConnection}
                  disabled={loading || !billComConfig.configured}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
                >
                  Test Connection
                </button>
              </div>
            </div>
          </div>

          {/* Customer Mappings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Customer Mappings</h2>
              <button
                onClick={syncCustomers}
                disabled={loading || !billComConfig.configured}
                className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                Sync Customers
              </button>
            </div>

            {unmappedClients.length > 0 && billComCustomers.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium mb-2">Map Client to Bill.com Customer:</p>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={selectedMapping.clientId}
                    onChange={(e) => setSelectedMapping({ ...selectedMapping, clientId: e.target.value })}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="">Select Client...</option>
                    {unmappedClients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMapping.billComCustomerId}
                    onChange={(e) => setSelectedMapping({ ...selectedMapping, billComCustomerId: e.target.value })}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="">Select Bill.com Customer...</option>
                    {billComCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={saveMapping}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {customerMappings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No customer mappings yet</p>
              ) : (
                customerMappings.map((mapping) => (
                  <div key={mapping.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{mapping.client.name}</p>
                      <p className="text-sm text-gray-600">→ {mapping.billComCustomerName}</p>
                    </div>
                    <button
                      onClick={() => deleteMapping(mapping.clientId)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;
