import axios, { AxiosError } from 'axios';
import { CONFIG, loadSavedApiBaseUrl, saveApiBaseUrl } from '../constants/config';
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

export const updateApiBaseUrl = async (newUrl: string): Promise<string> => {
  const formatted = await saveApiBaseUrl(newUrl);
  api.defaults.baseURL = formatted;
  return formatted;
};

export const getCurrentApiBaseUrl = (): string => {
  return (api.defaults.baseURL as string) || CONFIG.API_BASE_URL;
};

export const initApiClient = async (): Promise<string> => {
  const url = await loadSavedApiBaseUrl();
  api.defaults.baseURL = url;
  return url;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

const formatErrorMessage = (err: any): string => {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      // Server returned error status (4xx, 5xx)
      return err.response.data?.detail || err.response.data?.message || `Server returned error status ${err.response.status}`;
    } else if (err.request) {
      // Request made but no response received (Network error / unreachable host)
      const currentUrl = api.defaults.baseURL || CONFIG.API_BASE_URL;
      return `Network Error: Unable to reach backend server at ${currentUrl}. Please check host IP / server settings.`;
    }
  }
  return err.message || 'An unexpected error occurred.';
};

export const authService = {
  login: async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuthToken(res.data.access_token);
      return res.data;
    } catch (err: any) {
      throw new Error(formatErrorMessage(err));
    }
  },

  register: async (payload: { email: string; password: string; full_name: string; phone_number?: string }) => {
    try {
      const res = await api.post('/auth/register', payload);
      setAuthToken(res.data.access_token);
      return res.data;
    } catch (err: any) {
      throw new Error(formatErrorMessage(err));
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const res = await api.get('/auth/me');
      return res.data;
    } catch (err: any) {
      throw new Error(formatErrorMessage(err));
    }
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
