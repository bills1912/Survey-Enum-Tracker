import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Respondent, LocationTracking, Message, FAQ, DashboardStats } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User APIs
export const userAPI = {
  getUsers: async () => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
  getEnumerators: async () => {
    const response = await api.get<User[]>('/users/enumerators');
    return response.data;
  },
};

// Respondent APIs
export const respondentAPI = {
  getRespondents: async () => {
    const response = await api.get<Respondent[]>('/respondents');
    return response.data;
  },
  getRespondent: async (id: string) => {
    const response = await api.get<Respondent>(`/respondents/${id}`);
    return response.data;
  },
  createRespondent: async (data: Partial<Respondent>) => {
    const response = await api.post<Respondent>('/respondents', data);
    return response.data;
  },
  updateRespondent: async (id: string, data: Partial<Respondent>) => {
    const response = await api.put<Respondent>(`/respondents/${id}`, data);
    return response.data;
  },
};

// Location APIs
export const locationAPI = {
  createLocation: async (data: LocationTracking) => {
    const response = await api.post('/locations', data);
    return response.data;
  },
  createLocationsBatch: async (locations: LocationTracking[]) => {
    const response = await api.post('/locations/batch', { locations });
    return response.data;
  },
  getLocations: async (userId?: string) => {
    const response = await api.get<LocationTracking[]>('/locations', {
      params: userId ? { user_id: userId } : {},
    });
    return response.data;
  },
  getLatestLocations: async () => {
    const response = await api.get<LocationTracking[]>('/locations/latest');
    return response.data;
  },
};

// Message APIs
export const messageAPI = {
  createMessage: async (data: Partial<Message>) => {
    const response = await api.post<Message>('/messages', data);
    return response.data;
  },
  createMessagesBatch: async (messages: Message[]) => {
    const response = await api.post('/messages/batch', { messages });
    return response.data;
  },
  getMessages: async (messageType?: string) => {
    const response = await api.get<Message[]>('/messages', {
      params: messageType ? { message_type: messageType } : {},
    });
    return response.data;
  },
  respondToMessage: async (id: string, response: string) => {
    const result = await api.put<Message>(`/messages/${id}/respond`, { response });
    return result.data;
  },
};

// FAQ APIs
export const faqAPI = {
  getFAQs: async () => {
    const response = await api.get<FAQ[]>('/faqs');
    return response.data;
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
};

export default api;
