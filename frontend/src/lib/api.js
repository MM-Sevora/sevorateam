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
    getInfluencer: (id) => api.get(`/marketing/influencers/${id}`),
    createInfluencer: (data) => api.post('/marketing/influencers', data),
    updateInfluencer: (id, data) => api.put(`/marketing/influencers/${id}`, data),
    deleteInfluencer: (id) => api.delete(`/marketing/influencers/${id}`),
    
    // Campaigns
    getCampaigns: (params) => api.get('/marketing/campaigns', { params }),
    createCampaign: (data) => api.post('/marketing/campaigns', data),
    
    // Outreach
    getOutreach: (params) => api.get('/marketing/outreach', { params }),
    createOutreach: (data) => api.post('/marketing/outreach', data),
    
    // Negotiations
    getNegotiations: (params) => api.get('/marketing/negotiations', { params }),
    createNegotiation: (data) => api.post('/marketing/negotiations', data),
    
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
    
    // QR Codes
    getQRCodes: () => api.get('/sales/qrcodes'),
    createQRCode: (data) => api.post('/sales/qrcodes', data),
    
    // Pipeline
    getPipeline: () => api.get('/sales/pipeline'),
    
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
    
    // Autopilot
    getAutopilotSettings: () => api.get('/social/autopilot/settings'),
    updateAutopilotSettings: (data) => api.put('/social/autopilot/settings', data),
    
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
