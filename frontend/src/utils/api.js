import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000' // 'https://felicity-event-management-paru.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.normalizedMessage) return error.normalizedMessage;
  if (error?.message) return error.message;
  return fallback;
};

api.interceptors.response.use(
  response => response, 
  error => {
    const normalizedError = error ?? new Error('Request failed');
    const message = getErrorMessage(normalizedError);

    // if (status === 401) window.location.href = '/login'; 
    // if (status === 403) window.location.href = '/unauthorized';

    if (typeof normalizedError === 'object' && normalizedError !== null) {
      normalizedError.normalizedMessage = message;
    }

    return Promise.reject(normalizedError);
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

export const deleteOrganizerDraftEvent = async (eventId) => {
  const response = await api.delete(`/organizerEvents/${eventId}/draft`);
  return response.data;
};

export const getOrganizerEventDetail = async (eventId) => {
  const response = await api.get(`/organizerEvents/${eventId}`);
  return response.data;
};

export const getOrganizerEventFeedback = async (eventId, rating = null) => {
  const params = rating ? { rating } : {};
  const response = await api.get(`/organizerEvents/${eventId}/feedback`, { params });
  return response.data;
};

export const updateOrganizerEvent = async (eventId, payload) => {
  const response = await api.patch(`/organizerEvents/${eventId}/edit`, payload);
  return response.data;
};

export const changeOrganizerEventStatus = async (eventId, status) => {
  const response = await api.patch(`/organizerEvents/${eventId}/status`, { status });
  return response.data;
};

export const closeOrganizerEventRegistration = async (eventId) => {
  const response = await api.patch(`/organizerEvents/${eventId}/registration/close`);
  return response.data;
};

export const getForumMessages = async (eventId) => {
  const response = await api.get(`/forums/${eventId}/messages`);
  return response.data;
};

export const createForumMessage = async (eventId, payload) => {
  const response = await api.post(`/forums/${eventId}/messages`, payload);
  return response.data;
};

export const toggleForumReaction = async (messageId, emoji) => {
  const response = await api.patch(`/forums/messages/${messageId}/reaction`, { emoji });
  return response.data;
};

export const toggleForumPin = async (messageId, isPinned) => {
  const response = await api.patch(`/forums/messages/${messageId}/pin`, { isPinned });
  return response.data;
};

export const deleteForumMessage = async (messageId) => {
  const response = await api.delete(`/forums/messages/${messageId}`);
  return response.data;
};

export const getAttendanceOverview = async (eventId) => {
  const response = await api.get(`/organizerEvents/${eventId}/attendance`);
  return response.data;
};

export const scanAttendanceTicket = async (eventId, ticketId) => {
  const response = await api.post(`/organizerEvents/${eventId}/attendance/scan`, { ticketId });
  return response.data;
};

export const manualMarkAttendance = async (eventId, registrationId, note = '') => {
  const response = await api.post(`/organizerEvents/${eventId}/attendance/manual`, { registrationId, note });
  return response.data;
};

export const getEventOrders = async (eventId) => {
  const response = await api.get(`/organizerEvents/${eventId}/orders`);
  return response.data;
};

export const getOrderProof = async (orderId) => {
  const response = await api.get(`/organizerEvents/orders/${orderId}/proof`);
  return response.data; // { paymentProofUrl }
};

export const approveOrder = async (orderId) => {
  const response = await api.patch(`/organizerEvents/orders/${orderId}/approve`);
  return response.data;
};

export const rejectOrder = async (orderId) => {
  const response = await api.patch(`/organizerEvents/orders/${orderId}/reject`);
  return response.data;
};

export const getOrganizerProfile = async () => {
  const response = await api.get('/organizerProfile');
  return response.data;
};

export const createOrganizerPasswordResetRequest = async (reason) => {
  const response = await api.post('/organizerProfile/password-reset-request', { reason });
  return response.data;
};

export const listOrganizerPasswordResetRequests = async () => {
  const response = await api.get('/organizerProfile/password-reset-requests');
  return response.data;
};

export const updateOrganizerProfile = async (payload) => {
  const response = await api.put('/organizerProfile', payload);
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

export const adminListPasswordResetRequests = async () => {
  const response = await api.get('/admin/password-reset-requests');
  return response.data;
};

export const adminApprovePasswordResetRequest = async (id, comment = '') => {
  const response = await api.patch(`/admin/password-reset-requests/${id}/approve`, { comment });
  return response.data;
};

export const adminRejectPasswordResetRequest = async (id, comment = '') => {
  const response = await api.patch(`/admin/password-reset-requests/${id}/reject`, { comment });
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
