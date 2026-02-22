import api from "./api"

export const getBrowseEvents = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const response = await api.get('/browseEvents', { params: cleanParams });
  return response.data;
};

// ── Event detail + registration ───────────────────────────────────────────────
export const getEventDetail = async (id) => {
  const response = await api.get(`/participantEvents/${id}`);
  return response.data; // { event, alreadyRegistered }
};

export const registerForEvent = async (id, formResponses = []) => {
  const response = await api.post(`/participantEvents/${id}/register`, { formResponses });
  return response.data;
};

export const orderMerchandise = async (id, payload) => {
  const response = await api.post(`/participantEvents/${id}/order`, payload);
  return response.data;
};

export const unregisterFromEvent = async (id) => {
  const response = await api.delete(`/participantEvents/${id}/unregister`);
  return response.data;
};

export const submitEventFeedback = async (eventId, payload) => {
  const response = await api.post(`/participantEvents/${eventId}/feedback`, payload);
  return response.data;
};

export const uploadPaymentProof = async (eventId, payload) => {
  const response = await api.put(`/participantEvents/${eventId}/payment-proof`, payload);
  return response.data;
};

// ── Organisers ────────────────────────────────────────────────────────────────
export const listOrganizers = async () => {
  const response = await api.get('/participantOrganizers');
  return response.data; // { organizers: [...] }
};

export const getOrganizerDetail = async (id) => {
  const response = await api.get(`/participantOrganizers/${id}`);
  return response.data; // { organizer, upcoming, past }
};

export const toggleFollowOrganizer = async (id) => {
  const response = await api.post(`/participantOrganizers/${id}/follow`);
  return response.data; // { isFollowed: bool }
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const getParticipantProfile = async () => {
  const response = await api.get('/editParticipantProfile');
  return response.data; // { profile }
};

export const updateParticipantProfile = async (payload) => {
  const response = await api.put('/editParticipantProfile', payload);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/editParticipantProfile/change-password', { currentPassword, newPassword });
  return response.data;
};