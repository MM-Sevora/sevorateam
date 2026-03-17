/**
 * Custom hook for managing Influencer Detail page data and operations
 * Extracts state management and API calls from the main component
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';

export const useInfluencerDetail = (influencerId) => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Related data
  const [communications, setCommunications] = useState([]);
  const [deals, setDeals] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  
  // Finance/Payments
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({ total_paid: 0, total_pending: 0 });
  
  // Growth Chart
  const [growthChartData, setGrowthChartData] = useState(null);
  const [growthChartLoading, setGrowthChartLoading] = useState(false);

  // Default form state
  const initialForm = {
    name: '', bio: '', email: '', phone: '', city: '', state: '',
    instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
    followers: 0, engagement_rate: 0, avg_likes: 0, avg_comments: 0,
    youtube_subscribers: 0, youtube_avg_views: 0, youtube_avg_likes: 0, youtube_total_videos: 0,
    industry: 'fashion', tier: 'micro', gender: 'not_specified', audience_focus: 'unisex', 
    content_types: '', accepts_barter: false, style_tags: '', past_collaborations: '', 
    languages: '', portfolio_url: '', notes: '', status: 'identified', campaign_id: '',
    deliverables: []
  };
  
  const [form, setForm] = useState(initialForm);
  const [assignedCampaign, setAssignedCampaign] = useState('');

  // Fetch influencer data
  const fetchInfluencer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/v2/contacts/${influencerId}`);
      const data = response.data;
      
      // Default deliverables if none exist
      const defaultDeliverables = [
        { id: '1', name: 'Static Post', description: 'Feed image post', price: data.rate_per_post || '' },
        { id: '2', name: 'Reel / Short', description: '15-60 sec video', price: data.rate_per_reel || '' },
        { id: '3', name: 'Story', description: '24hr story post', price: data.rate_per_story || '' },
        { id: '4', name: 'YouTube Video', description: 'Dedicated/integrated video', price: data.rate_per_youtube || '' }
      ];
      
      setForm({
        ...initialForm,
        name: data.name || '',
        bio: data.bio || '',
        email: data.email || '',
        phone: data.phone || '',
        city: data.city || '',
        state: data.state || '',
        instagram_handle: data.instagram_handle || '',
        youtube_handle: data.youtube_handle || '',
        primary_platform: data.primary_platform || 'instagram',
        followers: data.followers || 0,
        engagement_rate: data.engagement_rate || 0,
        avg_likes: data.avg_likes || 0,
        avg_comments: data.avg_comments || 0,
        youtube_subscribers: data.youtube_subscribers || 0,
        youtube_avg_views: data.youtube_avg_views || 0,
        youtube_avg_likes: data.youtube_avg_likes || 0,
        youtube_total_videos: data.youtube_total_videos || data.youtube_video_count || 0,
        industry: data.industry || 'fashion',
        tier: data.tier || 'micro',
        gender: data.gender || 'not_specified',
        audience_focus: data.audience_focus || 'unisex',
        content_types: data.content_types || '',
        accepts_barter: data.accepts_barter || false,
        style_tags: data.style_tags || '',
        past_collaborations: data.past_collaborations || '',
        languages: data.languages || '',
        portfolio_url: data.portfolio_url || '',
        notes: data.notes || '',
        status: data.status || 'identified',
        score: data.score || 50,
        social_synced_at: data.social_synced_at,
        campaign_id: data.campaign_id || '',
        deliverables: data.deliverables || defaultDeliverables
      });
      setAssignedCampaign(data.campaign_id || '');
      setOriginalData(data);
    } catch (error) {
      toast.error('Failed to load influencer');
      navigate('/marketing/influencers');
    } finally {
      setLoading(false);
    }
  }, [api, influencerId, navigate]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  }, [api]);

  // Fetch communications history
  const fetchCommunications = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/communications`);
      setCommunications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    }
  }, [api, influencerId]);

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/deals`);
      setDeals(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    }
  }, [api, influencerId]);

  // Fetch gifts
  const fetchGifts = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/gifts`);
      setGifts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch gifts:', error);
    }
  }, [api, influencerId]);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/activity`);
      setActivities(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  }, [api, influencerId]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        api.get(`/marketing/v2/contacts/${influencerId}/payments`),
        api.get(`/marketing/v2/contacts/${influencerId}/payment-summary`)
      ]);
      setPayments(paymentsRes.data || []);
      setPaymentSummary(summaryRes.data || { total_paid: 0, total_pending: 0 });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  }, [api, influencerId]);

  // Fetch growth chart data
  const fetchGrowthChart = useCallback(async (platform = 'instagram', days = 30) => {
    setGrowthChartLoading(true);
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencerId}/growth-chart`, {
        params: { platform, days }
      });
      setGrowthChartData(response.data);
    } catch (error) {
      console.error('Failed to fetch growth chart:', error);
    } finally {
      setGrowthChartLoading(false);
    }
  }, [api, influencerId]);

  // Save influencer
  const saveInfluencer = async () => {
    setSaving(true);
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, form);
      toast.success('Influencer saved successfully');
      setHasChanges(false);
      setOriginalData({ ...originalData, ...form });
      setIsEditMode(false);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save influencer');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete influencer
  const deleteInfluencer = async () => {
    try {
      await api.delete(`/marketing/v2/contacts/${influencerId}`);
      toast.success('Influencer deleted');
      navigate('/marketing/influencers');
      return true;
    } catch (error) {
      toast.error('Failed to delete influencer');
      return false;
    }
  };

  // Sync social data
  const syncSocialData = async () => {
    try {
      await api.post(`/marketing/v2/contacts/${influencerId}/sync`);
      toast.success('Social data synced');
      await fetchInfluencer();
      return true;
    } catch (error) {
      toast.error('Failed to sync social data');
      return false;
    }
  };

  // Create payment
  const createPayment = async (paymentData) => {
    try {
      await api.post(`/marketing/v2/contacts/${influencerId}/payments`, paymentData);
      toast.success('Payment request created');
      await fetchPayments();
      return true;
    } catch (error) {
      toast.error('Failed to create payment request');
      return false;
    }
  };

  // Send outreach
  const sendOutreach = async (channel, outreachData) => {
    try {
      await api.post(`/marketing/v2/contacts/${influencerId}/outreach`, {
        channel,
        ...outreachData
      });
      toast.success('Outreach sent successfully');
      await fetchCommunications();
      return true;
    } catch (error) {
      toast.error('Failed to send outreach');
      return false;
    }
  };

  // Assign to campaign
  const assignToCampaign = async (campaignId) => {
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, { campaign_id: campaignId || null });
      setAssignedCampaign(campaignId);
      toast.success(campaignId ? 'Assigned to campaign' : 'Removed from campaign');
      return true;
    } catch (error) {
      toast.error('Failed to update campaign assignment');
      return false;
    }
  };

  // Deliverables management
  const addDeliverable = (deliverable) => {
    const newDeliverable = {
      id: Date.now().toString(),
      ...deliverable
    };
    setForm(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable]
    }));
    setHasChanges(true);
  };

  const removeDeliverable = (id) => {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== id)
    }));
    setHasChanges(true);
  };

  const updateDeliverable = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => 
        d.id === id ? { ...d, [field]: value } : d
      )
    }));
    setHasChanges(true);
  };

  // Track form changes
  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Reset form
  const resetForm = () => {
    if (originalData) {
      fetchInfluencer();
    }
    setHasChanges(false);
    setIsEditMode(false);
  };

  // Initial load
  useEffect(() => {
    fetchInfluencer();
    fetchCampaigns();
  }, [fetchInfluencer, fetchCampaigns]);

  // Load related data when tab changes
  const loadTabData = useCallback(async (tab) => {
    switch (tab) {
      case 'communications':
        await fetchCommunications();
        break;
      case 'deals':
        await fetchDeals();
        break;
      case 'gifts':
        await fetchGifts();
        break;
      case 'activity':
        await fetchActivities();
        break;
      case 'payments':
        await fetchPayments();
        break;
      case 'analytics':
        await fetchGrowthChart();
        break;
      default:
        break;
    }
  }, [fetchCommunications, fetchDeals, fetchGifts, fetchActivities, fetchPayments, fetchGrowthChart]);

  return {
    // State
    loading,
    saving,
    hasChanges,
    originalData,
    isEditMode,
    setIsEditMode,
    form,
    updateForm,
    resetForm,
    
    // Related data
    communications,
    deals,
    gifts,
    activities,
    campaigns,
    payments,
    paymentSummary,
    assignedCampaign,
    
    // Growth chart
    growthChartData,
    growthChartLoading,
    fetchGrowthChart,
    
    // Actions
    fetchInfluencer,
    saveInfluencer,
    deleteInfluencer,
    syncSocialData,
    createPayment,
    sendOutreach,
    assignToCampaign,
    loadTabData,
    
    // Deliverables
    addDeliverable,
    removeDeliverable,
    updateDeliverable,
  };
};

export default useInfluencerDetail;
