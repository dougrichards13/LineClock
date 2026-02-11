import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  getAuthUrl: () => api.get('/auth/login'),
  handleCallback: (code: string) => api.post('/auth/callback', { code }),
  testEmployeeLogin: (email: string) => api.post('/auth/test-employee-login', { email }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: { name: string; avatarUrl?: string; hireDate?: string; billableRate?: number }) => 
    api.patch('/auth/profile', data),
  // Admin only
  getEntraUsers: () => api.get('/auth/entra/users'),
  updateUserRole: (userId: string, role: string) =>
    api.patch(`/auth/users/${userId}/role`, { role }),
  toggleUserHidden: (userId: string, isHidden: boolean) =>
    api.patch(`/auth/users/${userId}/hidden`, { isHidden }),
  preHideUser: (entraId: string, email: string, name: string, role?: string, isHidden?: boolean) =>
    api.post('/auth/users/pre-hide', { entraId, email, name, role, isHidden }),
  deleteUser: (userId: string) => api.delete(`/auth/users/${userId}`),
};

// Time Entries
export const timeEntriesAPI = {
  getAll: () => api.get('/time-entries'),
  getOne: (id: string) => api.get(`/time-entries/${id}`),
  create: (data: { date: string; hoursWorked: number; clientId: string; projectId: string; description?: string }) =>
    api.post('/time-entries', data),
  update: (id: string, data: any) => api.put(`/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
  getPending: () => api.get('/time-entries/admin/pending'),
  review: (id: string, status: string) =>
    api.patch(`/time-entries/${id}/review`, { status }),
};

// Vacations
export const vacationsAPI = {
  getAll: () => api.get('/vacations'),
  create: (data: { startDate: string; endDate: string; reason: string }) =>
    api.post('/vacations', data),
  getAllAdmin: () => api.get('/vacations/admin/all'),
  getPending: () => api.get('/vacations/admin/pending'),
  review: (id: string, status: string) =>
    api.patch(`/vacations/${id}/review`, { status }),
};

// Questions
export const questionsAPI = {
  getAll: () => api.get('/questions'),
  create: (question: string) => api.post('/questions', { question }),
  getAllAdmin: () => api.get('/questions/admin/all'),
  getOpen: () => api.get('/questions/admin/open'),
  answer: (id: string, answer: string) =>
    api.patch(`/questions/${id}/answer`, { answer }),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Clients
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (name: string) => api.post('/clients', { name }),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Projects
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getByClient: (clientId: string) => api.get(`/projects/client/${clientId}`),
  create: (name: string, clientId: string, billingRate?: number) =>
    api.post('/projects', { name, clientId, billingRate }),
  update: (id: string, data: { name?: string; isActive?: boolean; billingRate?: number }) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// User Assignments
export const assignmentsAPI = {
  getUsers: () => api.get('/assignments/users'),
  getUserAssignments: (userId: string) => api.get(`/assignments/user/${userId}`),
  assignClient: (userId: string, clientId: string) =>
    api.post('/assignments/assign-client', { userId, clientId }),
  removeClient: (userId: string, clientId: string) =>
    api.delete(`/assignments/assign-client/${userId}/${clientId}`),
  assignProject: (userId: string, projectId: string) =>
    api.post('/assignments/assign-project', { userId, projectId }),
  removeProject: (userId: string, projectId: string) =>
    api.delete(`/assignments/assign-project/${userId}/${projectId}`),
};

// Time Modification Requests
export const modificationRequestsAPI = {
  getAll: () => api.get('/modification-requests'),
  getPending: () => api.get('/modification-requests/pending'),
  create: (data: {
    weekStartDate: string;
    clientId: string;
    projectId: string;
    entries: Array<{ date: string; hours: number; description?: string }>;
    reason: string;
  }) => api.post('/modification-requests', data),
  review: (id: string, status: string, reviewNotes?: string) =>
    api.patch(`/modification-requests/${id}/review`, { status, reviewNotes }),
};

// Org Chart
export const orgChartAPI = {
  getOrgChart: () => api.get('/auth/users/org-chart'),
  updateReportsTo: (userId: string, reportsToId: string | null) =>
    api.patch(`/auth/users/${userId}/reports-to`, { reportsToId }),
};

export default api;
