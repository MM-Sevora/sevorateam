import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Influencer API
export const influencerApi = {
    getAll: (params) => axios.get(`${API}/influencers`, { params }),
    getById: (id) => axios.get(`${API}/influencers/${id}`),
    create: (data) => axios.post(`${API}/influencers`, data),
    update: (id, data) => axios.put(`${API}/influencers/${id}`, data),
    delete: (id) => axios.delete(`${API}/influencers/${id}`),
};

// Campaign API
export const campaignApi = {
    getAll: (params) => axios.get(`${API}/campaigns`, { params }),
    getById: (id) => axios.get(`${API}/campaigns/${id}`),
    create: (data) => axios.post(`${API}/campaigns`, data),
    updateStatus: (id, status) => axios.put(`${API}/campaigns/${id}/status?status=${status}`),
    assignInfluencer: (id, data) => axios.post(`${API}/campaigns/${id}/assign`, data),
    updateContentStatus: (campaignId, influencerId, status) => 
        axios.put(`${API}/campaigns/${campaignId}/influencer/${influencerId}/content-status?content_status=${status}`),
};

// Outreach API
export const outreachApi = {
    getAll: (params) => axios.get(`${API}/outreach`, { params }),
    create: (data) => axios.post(`${API}/outreach`, data),
    updateResponse: (id, opened, replied) => 
        axios.put(`${API}/outreach/${id}/response?opened=${opened}&replied=${replied}`),
};

// Negotiation API
export const negotiationApi = {
    getAll: (params) => axios.get(`${API}/negotiations`, { params }),
    create: (data) => axios.post(`${API}/negotiations`, data),
    update: (id, data) => axios.put(`${API}/negotiations/${id}`, data),
};

// Analytics API
export const analyticsApi = {
    getDashboard: () => axios.get(`${API}/analytics/dashboard`),
    getCampaign: (id) => axios.get(`${API}/analytics/campaign/${id}`),
};

// AI API
export const aiApi = {
    matchInfluencers: (data) => axios.post(`${API}/ai/match-influencers`, data),
    generateCaption: (data) => axios.post(`${API}/ai/generate-caption`, data),
    getCampaignIdeas: (data) => axios.post(`${API}/ai/campaign-ideas`, data),
};

// Content Library API
export const contentApi = {
    getAll: (params) => axios.get(`${API}/content-library`, { params }),
    create: (data) => axios.post(`${API}/content-library`, null, { params: data }),
};

// Payments API
export const paymentsApi = {
    getAll: (params) => axios.get(`${API}/payments`, { params }),
    create: (data) => axios.post(`${API}/payments`, null, { params: data }),
    updateStatus: (id, status) => axios.put(`${API}/payments/${id}/status?status=${status}`),
};
