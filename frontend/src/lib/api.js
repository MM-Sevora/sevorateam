import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
    baseURL: `${BACKEND_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('sevora_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('sevora_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth APIs
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    azureLogin: (azure_token) => api.post('/auth/azure', { azure_token }),
    getMe: () => api.get('/auth/me'),
    getConfig: () => api.get('/auth/config'),
};

// Marketing APIs
export const marketingAPI = {
    // Influencers
    getInfluencers: (params) => api.get('/marketing/influencers', { params }),
    getAll: (params) => api.get('/marketing/influencers', { params }),
    getInfluencer: (id) => api.get(`/marketing/influencers/${id}`),
    createInfluencer: (data) => api.post('/marketing/influencers', data),
    updateInfluencer: (id, data) => api.put(`/marketing/influencers/${id}`, data),
    deleteInfluencer: (id) => api.delete(`/marketing/influencers/${id}`),
    
    // Campaigns
    getCampaigns: (params) => api.get('/marketing/campaigns', { params }),
    getActiveCampaigns: () => api.get('/marketing/campaigns', { params: { status: 'active' } }),
    createCampaign: (data) => api.post('/marketing/campaigns', data),
    getCampaign: (id) => api.get(`/marketing/campaigns/${id}`),
    updateCampaign: (id, data) => api.put(`/marketing/campaigns/${id}`, data),
    addInfluencerToCampaign: (campaignId, data) => api.post(`/marketing/campaigns/${campaignId}/influencers`, data),
    updateInfluencerContent: (campaignId, influencerId, data) => 
        api.put(`/marketing/campaigns/${campaignId}/influencers/${influencerId}`, data),
    
    // Outreach
    getOutreach: (params) => api.get('/marketing/outreach', { params }),
    createOutreach: (data) => api.post('/marketing/outreach', data),
    updateOutreach: (id, data) => api.put(`/marketing/outreach/${id}`, data),
    bulkOutreach: (data) => api.post('/marketing/outreach/bulk', data),
    
    // Negotiations
    getNegotiations: (params) => api.get('/marketing/negotiations', { params }),
    createNegotiation: (data) => api.post('/marketing/negotiations', data),
    updateNegotiation: (id, data) => api.put(`/marketing/negotiations/${id}`, data),
    addCounterOffer: (id, data) => api.post(`/marketing/negotiations/${id}/counter`, data),
    
    // AI Tools
    discoverInfluencers: (data) => api.post('/marketing/ai/discover', data),
    analyzeInfluencer: (id) => api.get(`/marketing/ai/analyze/${id}`),
    getScheduled: (params) => api.get('/marketing/scheduled', { params }),
    
    // Analytics & Budget
    getAnalytics: (params) => api.get('/marketing/analytics', { params }),
    getPayments: (params) => api.get('/marketing/payments', { params }),
    createPayment: (data) => api.post('/marketing/payments', data),
    
    // Dashboard
    getDashboard: () => api.get('/marketing/dashboard'),
};

// Sales APIs
export const salesAPI = {
    // Leads
    getLeads: (params) => api.get('/sales/leads', { params }),
    getLead: (id) => api.get(`/sales/leads/${id}`),
    createLead: (data) => api.post('/sales/leads', data),
    updateLead: (id, data) => api.put(`/sales/leads/${id}`, data),
    deleteLead: (id) => api.delete(`/sales/leads/${id}`),
    
    // Customers
    getCustomers: (params) => api.get('/sales/customers', { params }),
    createCustomer: (data) => api.post('/sales/customers', data),
    updateCustomer: (id, data) => api.put(`/sales/customers/${id}`, data),
    deleteCustomer: (id) => api.delete(`/sales/customers/${id}`),
    
    // QR Codes
    getQRCodes: () => api.get('/sales/qrcodes'),
    createQRCode: (data) => api.post('/sales/qrcodes', data),
    
    // Pipeline
    getPipeline: () => api.get('/sales/pipeline'),
    
    // Partners
    getPartners: (params) => api.get('/sales/partners', { params }),
    createPartner: (data) => api.post('/sales/partners', data),
    updatePartner: (id, data) => api.put(`/sales/partners/${id}`, data),
    deletePartner: (id) => api.delete(`/sales/partners/${id}`),
    
    // Wedding Plans
    getWeddingPlans: (params) => api.get('/sales/wedding-plans', { params }),
    createWeddingPlan: (data) => api.post('/sales/wedding-plans', data),
    updateWeddingPlan: (id, data) => api.put(`/sales/wedding-plans/${id}`, data),
    
    // Users (for assignment)
    getUsers: () => api.get('/sales/users'),
    
    // Dashboard
    getDashboard: () => api.get('/sales/dashboard'),
};

// Social APIs
export const socialAPI = {
    // Content
    getContent: (params) => api.get('/social/content', { params }),
    createContent: (data) => api.post('/social/content', data),
    updateContent: (id, data) => api.put(`/social/content/${id}`, data),
    deleteContent: (id) => api.delete(`/social/content/${id}`),
    
    // Posts & Schedule
    getPosts: (params) => api.get('/social/posts', { params }),
    createPost: (data) => api.post('/social/posts', data),
    schedulePost: (data) => api.post('/social/posts/schedule', data),
    
    // AI Tools
    generateCaption: (data) => api.post('/social/ai/caption', data),
    generateImage: (data) => api.post('/social/ai/image', data),
    analyzeContent: (data) => api.post('/social/ai/analyze', data),
    
    // Autopilot
    getAutopilotSettings: () => api.get('/social/autopilot/settings'),
    updateAutopilotSettings: (data) => api.put('/social/autopilot/settings', data),
    
    // Content Library
    getLibrary: (params) => api.get('/social/library', { params }),
    uploadToLibrary: (data) => api.post('/social/library', data),
    
    // YouTube
    getYouTubeData: (params) => api.get('/social/youtube', { params }),
    
    // Analytics
    getAnalytics: (params) => api.get('/social/analytics', { params }),
    
    // Avatar
    getAvatar: () => api.get('/social/avatar'),
    updateAvatar: (data) => api.put('/social/avatar', data),
    
    // Dashboard
    getDashboard: () => api.get('/social/dashboard'),
};

// Admin APIs
export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    updateUserRole: (userId, role, department) => 
        api.put(`/admin/users/${userId}/role`, { role, department }),
};

// Unified Dashboard
export const dashboardAPI = {
    getUnified: () => api.get('/dashboard/unified'),
};
