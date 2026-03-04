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
    compare: (influencer_ids) => axios.post(`${API}/influencers/compare`, { influencer_ids }),
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
    autoDiscover: (data) => axios.post(`${API}/ai/auto-discover`, data),
    importDiscovered: (data) => axios.post(`${API}/ai/import-discovered`, data),
    // SSE endpoint for streaming discovery
    autoDiscoverStream: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return `${API}/ai/auto-discover-stream?${queryString}`;
    },
};

// Social API Verification
export const socialApi = {
    configure: (data) => axios.post(`${API}/social/configure`, data),
    verifyProfile: (platform, handle) => axios.post(`${API}/social/verify`, { platform, handle }),
    verifyInfluencer: (influencerId) => axios.post(`${API}/social/verify-influencer/${influencerId}`),
};

// Scheduled Discovery API
export const scheduledApi = {
    getSearches: () => axios.get(`${API}/scheduled/searches`),
    getSearch: (id) => axios.get(`${API}/scheduled/searches/${id}`),
    createSearch: (data) => axios.post(`${API}/scheduled/searches`, data),
    updateSearch: (id, data) => axios.put(`${API}/scheduled/searches/${id}`, data),
    deleteSearch: (id) => axios.delete(`${API}/scheduled/searches/${id}`),
    runNow: (id) => axios.post(`${API}/scheduled/searches/${id}/run`),
    getResults: (params) => axios.get(`${API}/scheduled/results`, { params }),
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
