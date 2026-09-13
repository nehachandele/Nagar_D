import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchOverview = async () => {
  const res = await api.get('/analytics/overview');
  return res.data;
};

export const fetchComplaints = async (filters = {}) => {
  const res = await api.get('/complaints', { params: filters });
  return res.data;
};

export const fetchHeatmap = async () => {
  const res = await api.get('/analytics/heatmap');
  return res.data;
};

export const updateComplaintStatus = async (id, status, comment = '') => {
  const res = await api.patch(`/complaints/${id}/status`, { status, comment });
  return res.data;
};
