import axios from 'axios';
import { CONFIG } from '../constants/config';
import { Complaint, User, AIClassificationResult, NearbyComplaintItem } from '../types';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAuthToken(res.data.access_token);
    return res.data;
  },

  register: async (payload: { email: string; password: string; full_name: string; phone_number?: string }) => {
    const res = await api.post('/auth/register', payload);
    setAuthToken(res.data.access_token);
    return res.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const complaintService = {
  create: async (formData: FormData): Promise<Complaint> => {
    const res = await api.post('/complaints', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  createJson: async (data: any): Promise<Complaint> => {
    const res = await api.post('/complaints/json', data);
    return res.data;
  },

  getMyComplaints: async (): Promise<Complaint[]> => {
    const res = await api.get('/complaints/my');
    return res.data;
  },

  getById: async (id: number): Promise<Complaint> => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  },

  getNearby: async (lat: number, lng: number, radiusMeters: number = 1000): Promise<NearbyComplaintItem[]> => {
    const res = await api.get('/complaints/nearby', {
      params: { lat, lng, radius: radiusMeters },
    });
    return res.data;
  },
};

export const aiService = {
  classify: async (imageUri: string): Promise<AIClassificationResult> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const res = await api.post('/ai/classify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

export default api;
