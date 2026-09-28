import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let token = localStorage.getItem('nagar_admin_token') || null;

export const setAuthToken = (newToken) => {
  token = newToken;
  if (newToken) {
    localStorage.setItem('nagar_admin_token', newToken);
  } else {
    localStorage.removeItem('nagar_admin_token');
  }
};

api.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto login admin if no token
export const ensureAdminAuth = async () => {
  if (token) return token;
  try {
    const res = await api.post('/auth/login', {
      email: 'admin@nagardrishti.gov.in',
      password: 'Admin@123',
    });
    setAuthToken(res.data.access_token);
    return res.data.access_token;
  } catch (err) {
    console.warn('Auto admin login failed:', err);
    return null;
  }
};

export const fetchOverview = async () => {
  const res = await api.get('/analytics/overview');
  return res.data;
};

export const fetchComplaints = async (filters = {}) => {
  const params = { page_size: 100, ...filters };
  const res = await api.get('/complaints', { params });
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && Array.isArray(res.data.items)) {
    return res.data.items;
  }
  return [];
};

export const fetchComplaintById = async (id) => {
  const res = await api.get(`/complaints/${id}`);
  return res.data;
};

export const fetchComplaintHistory = async (id) => {
  try {
    const res = await api.get(`/complaints/${id}/history`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const updateComplaintStatus = async (id, status, comment = '', assignedOfficerId = null, severity = null, departmentId = null) => {
  await ensureAdminAuth();
  const payload = { status, comment };
  if (assignedOfficerId) payload.assigned_officer_id = assignedOfficerId;
  if (severity) payload.severity = severity;
  if (departmentId) payload.department_id = departmentId;
  
  const res = await api.patch(`/complaints/${id}/status`, payload);
  return res.data;
};

export const fetchHeatmap = async () => {
  const res = await api.get('/analytics/heatmap');
  return Array.isArray(res.data) ? res.data : [];
};

export const fetchDepartments = async () => {
  try {
    const res = await api.get('/departments');
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  } catch {
    return [
      { id: 1, name: 'Roads & Infrastructure', code: 'ROADS', contact_email: 'roads@nagardrishti.gov.in' },
      { id: 2, name: 'Solid Waste Management', code: 'SAN', contact_email: 'waste@nagardrishti.gov.in' },
      { id: 3, name: 'Water Supply & Sewerage', code: 'WATER', contact_email: 'water@nagardrishti.gov.in' },
      { id: 4, name: 'Electrical & Streetlights', code: 'ELEC', contact_email: 'elec@nagardrishti.gov.in' },
      { id: 5, name: 'Anti-Encroachment', code: 'ENC', contact_email: 'encroach@nagardrishti.gov.in' },
    ];
  }
};

export const fetchOfficers = async () => {
  try {
    await ensureAdminAuth();
    const res = await api.get('/users', { params: { role: 'officer' } });
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  } catch {
    return [
      { id: 2, full_name: 'Rajesh Patil (Roads AE)', email: 'officer.roads@nagardrishti.gov.in', role: 'officer', department_id: 1 },
      { id: 3, full_name: 'Sunita Deshmukh (Sanitation Inspector)', email: 'officer.waste@nagardrishti.gov.in', role: 'officer', department_id: 2 },
    ];
  }
};

export const fetchCategoryBreakdown = async () => {
  try {
    const res = await api.get('/analytics/by-category');
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const fetchDepartmentBreakdown = async () => {
  try {
    const res = await api.get('/analytics/by-department');
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const fetchTrends = async (days = 14) => {
  try {
    const res = await api.get('/analytics/trends', { params: { days } });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

