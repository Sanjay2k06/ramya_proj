import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cti_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && window.location.pathname !== '/') {
        localStorage.removeItem('cti_auth_token');
        localStorage.removeItem('cti_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials: { username?: string; email?: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (data: { username: string; email: string; password: string; role?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary'),
  getTrends: () => api.get('/dashboard/trends'),
};

export const investigationService = {
  list: () => api.get('/investigations'),
  create: (data: {
    title: string;
    description?: string;
    objective?: string;
    use_gemini?: boolean;
    dataset_source?: string;
    pasted_cti?: string;
    records?: any[];
    auto_analyze?: boolean;
  }) => api.post('/investigations', data),
  getOverview: (id: string) => api.get(`/investigations/${id}`),
  update: (id: string, data: { title?: string; description?: string; objective?: string }) =>
    api.patch(`/investigations/${id}`, data),
  delete: (id: string) => api.delete(`/investigations/${id}`),
  analyze: (id: string, useGemini?: boolean) =>
    api.post(`/investigations/${id}/analyze`, { use_gemini: useGemini }),
  getStatus: (id: string) => api.get(`/investigations/${id}/status`),
  getClusters: (id: string) => api.get(`/investigations/${id}/clusters`),
  getRuns: (id: string) => api.get(`/investigations/${id}/runs`),
  compareRuns: (id: string, runA: string, runB: string) =>
    api.get(`/investigations/${id}/runs/compare`, { params: { run_a: runA, run_b: runB } }),
};

export const evidenceService = {
  list: (invId: string, params?: { search?: string; source?: string; threat_category?: string; classification?: string; page?: number; limit?: number }) =>
    api.get(`/investigations/${invId}/evidence`, { params }),
  create: (invId: string, data: { source_name: string; source_url?: string; source_type?: string; content: string; threat_category?: string; confidence_score?: number }) =>
    api.post(`/investigations/${invId}/evidence`, data),
  getDetail: (evId: string) => api.get(`/evidence/${evId}`),
};

export const analysisService = {
  getTimeline: (invId: string) => api.get(`/investigations/${invId}/timeline`),
  getGraph: (invId: string) => api.get(`/investigations/${invId}/graph`),
  getConflicts: (invId: string) => api.get(`/investigations/${invId}/conflicts`),
  updateConflictStatus: (conflictId: string, data: { review_status: string; analyst_notes?: string }) =>
    api.patch(`/investigations/conflicts/${conflictId}`, data),
  getRiskAssessment: (invId: string) => api.get(`/investigations/${invId}/risk`),
  getRecommendations: (invId: string) => api.get(`/investigations/${invId}/recommendations`),
  updateRecommendationStatus: (recId: string, status: string) =>
    api.patch(`/investigations/recommendations/${recId}`, { status }),
  getReasoning: (invId: string) => api.get(`/investigations/${invId}/reasoning`),
  getTimeToExploit: (invId: string) => api.get(`/investigations/${invId}/time-to-exploit`),
  getFindingReviews: (invId: string) => api.get(`/investigations/${invId}/findings/reviews`),
  submitFindingReview: (invId: string, findingId: string, data: { finding_topic?: string; review_status: string; justification: string }) =>
    api.post(`/investigations/${invId}/findings/${findingId}/review`, data),
};

export const reportService = {
  getReportData: (invId: string) => api.get(`/investigations/${invId}/reports`),
  getDownloadUrl: (invId: string, format: 'json' | 'csv' | 'html') =>
    `${API_BASE_URL}/reports/${invId}/download?format=${format}`,
};

export const evaluationService = {
  getBenchmark: () => api.get('/evaluation/benchmark'),
};

export const searchService = {
  search: (q: string, type?: string, limit?: number) =>
    api.get('/search', { params: { q, type, limit } }),
};

export const healthService = {
  getHealth: () => api.get('/health'),
  getSettings: () => api.get('/settings/status'),
};

