import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Attach JWT token to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('nv_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auth
export const login = (email, password) =>
  instance.post('/api/auth/login', { email, password }).then(r => r.data);

export const getMe = () =>
  instance.get('/api/auth/me').then(r => r.data);

export const getMyVotes = () =>
  instance.get('/api/auth/votes').then(r => r.data);

export const getMyReputationEvents = (page = 1, limit = 20) =>
  instance.get('/api/auth/reputation-events', { params: { page, limit } }).then(r => r.data);

// Demo Endpoints
export const demoDecay = (days = 5) =>
  instance.post('/api/auth/demo/decay', { days }).then(r => r.data);

export const demoReset = () =>
  instance.post('/api/auth/demo/reset').then(r => r.data);

export const demoVote = (outcome) =>
  instance.post('/api/auth/demo/vote', { outcome }).then(r => r.data);

export const seedDemoItems = () =>
  instance.post('/api/admin/seed-demo').then(r => r.data);

// News
export const getNews = (page = 1, status = '', section = '', q = '') =>
  instance.get('/api/news', { params: { page, status: status || undefined, section: section || undefined, q: q || undefined } }).then(r => r.data);

export const getNewsItem = (id) =>
  instance.get(`/api/news/${id}`).then(r => r.data);

export const submitNews = (data) =>
  instance.post('/api/news', data).then(r => r.data);

export const submitEvidence = (id, urls) =>
  instance.post(`/api/news/${id}/evidence`, { urls }).then(r => r.data);

// Votes
export const castVote = (itemId, direction, confidence) =>
  instance.post('/api/votes', { itemId, direction, confidence }).then(r => r.data);

export const getVotes = (itemId) =>
  instance.get(`/api/votes/${itemId}`).then(r => r.data);

// Admin
export const getAdminQueue = (page = 1) =>
  instance.get('/api/admin/queue', { params: { page } }).then(r => r.data);

export const getAdminUsers = (page = 1) =>
  instance.get('/api/admin/users', { params: { page } }).then(r => r.data);

export const getPendingUsers = () =>
  instance.get('/api/admin/pending-users').then(r => r.data);

export const verifyUser = (userId, note) =>
  instance.post(`/api/admin/verify-user/${userId}`, { note }).then(r => r.data);

export const rejectUser = (userId, reason) =>
  instance.post(`/api/admin/reject-user/${userId}`, { reason }).then(r => r.data);

export const manualClassify = (itemId, classification) =>
  instance.post(`/api/admin/classify/${itemId}`, { classification }).then(r => r.data);
