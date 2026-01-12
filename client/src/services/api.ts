import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
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
  loginEmployee: (email: string, name: string) =>
    api.post('/auth/login/employee', { email, name }),
  loginAdminTest: (email: string) =>
    api.post('/auth/login/admin-test', { email }),
  getAdminAuthUrl: () => api.get('/auth/login/admin'),
  handleCallback: (code: string) => api.post('/auth/callback', { code }),
};

// Time Entries
export const timeEntriesAPI = {
  getAll: () => api.get('/time-entries'),
  getOne: (id: string) => api.get(`/time-entries/${id}`),
  create: (data: { date: string; hoursWorked: number; description: string }) =>
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

export default api;
