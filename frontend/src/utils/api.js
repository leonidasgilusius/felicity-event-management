import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  response => response, 
  error => {
    const message = error.response?.data?.message || error.response?.data?.error || 'Something went wrong';
    const status = error.response?.status;

    // if (status === 401) window.location.href = '/login'; 
    // if (status === 403) window.location.href = '/unauthorized';

    return Promise.reject(message); 
  }
);


export const registerUser = async (userData) => {
  const response = await api.post('/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const loginAdmin = async (credentials) => {
  const response = await api.post('/admin-login', credentials);
  return response.data;
};

export const getParticipantDashboardData = async () => {
  const response = await api.get('/participantDashboard');
  return response.data;
};

export const getOrganizerDashboardData = async () => {
  const response = await api.get('/organizerEvents/dashboard');
  return response.data;
};

export const createOrganizerDraftEvent = async (eventData) => {
  const response = await api.post('/organizerEvents/draft', eventData);
  return response.data;
};

export const updateOrganizerEventFormSchema = async (eventId, formFields) => {
  const response = await api.patch(`/organizerEvents/${eventId}/form-schema`, { formFields });
  return response.data;
};

export const publishOrganizerEvent = async (eventId) => {
  const response = await api.patch(`/organizerEvents/${eventId}/publish`);
  return response.data;
};

export const adminListOrganizers = async () => {
  const response = await api.get('/admin/organizers');
  return response.data;
};

export const adminCreateOrganizer = async (payload) => {
  const response = await api.post('/admin/organizers', payload);
  return response.data;
};

export const adminToggleDisableOrganizer = async (id) => {
  const response = await api.patch(`/admin/organizers/${id}/disable`);
  return response.data;
};

export const adminArchiveOrganizer = async (id) => {
  const response = await api.patch(`/admin/organizers/${id}/archive`);
  return response.data;
};

export const adminDeleteOrganizer = async (id) => {
  const response = await api.delete(`/admin/organizers/${id}`);
  return response.data;
};


export default api;
