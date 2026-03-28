import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, Calendar, DollarSign, Users, FileText,
  Megaphone, Image, Building2, TrendingUp, Clock, CheckCircle,
  AlertTriangle, Target, ExternalLink, Eye, Edit, Plus, BarChart3,
  Share2, ThumbsUp, ThumbsDown, Star, Trash2, Link, Unlink, Search, Rocket, MessageSquare,
  ListTodo, User
} from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  paused: { label: 'Paused', color: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
};

const CAMPAIGN_TYPE_CONFIG = {
  influencer: { label: 'Influencer', icon: Users, tabs: ['tasks', 'content', 'ads', 'assets', 'influencers', 'budget'] },
  ugc: { label: 'UGC', icon: Users, tabs: ['tasks', 'ugc', 'content', 'assets', 'budget'] },
  paid_ads: { label: 'Paid Ads', icon: Megaphone, tabs: ['tasks', 'ads', 'content', 'assets', 'budget'] },
  content_production: { label: 'Content Production', icon: FileText, tabs: ['tasks', 'content', 'assets', 'budget'] },
  pr_media: { label: 'PR/Media', icon: Building2, tabs: ['tasks', 'publications', 'content', 'assets', 'budget'] },
  pr: { label: 'PR', icon: Building2, tabs: ['tasks', 'content', 'assets', 'publications', 'budget'] },
  product_launch: { label: 'Product Launch', icon: Rocket, tabs: ['tasks', 'content', 'ads', 'assets', 'influencers', 'publications', 'budget'] },
  brand_awareness: { label: 'Brand Awareness', icon: Target, tabs: ['tasks', 'content', 'ads', 'assets', 'influencers', 'budget'] },
  seasonal: { label: 'Seasonal', icon: Calendar, tabs: ['tasks', 'content', 'ads', 'assets', 'influencers', 'budget'] },
  mixed: { label: 'Mixed', icon: Target, tabs: ['tasks', 'content', 'ads', 'assets', 'influencers', 'publications', 'budget'] },
  digital: { label: 'Digital', icon: Megaphone, tabs: ['tasks', 'content', 'ads', 'assets', 'budget'] },
};

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function CampaignDetailsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Related data
  const [contentProjects, setContentProjects] = useState([]);
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [assets, setAssets] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [publications, setPublications] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    status: 'pending'
  });
  const [savingTask, setSavingTask] = useState(false);
  
  // Edit campaign modal
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [editCampaignData, setEditCampaignData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'planning',
    campaign_type: 'mixed'
  });
  const [savingCampaign, setSavingCampaign] = useState(false);
  
  // UGC state
  const [showUgcModal, setShowUgcModal] = useState(false);
  const [ugcForm, setUgcForm] = useState({
    creator_name: '',
    creator_handle: '',
    platform: 'instagram',
    content_url: '',
    content_type: 'post',
    notes: ''
  });

  // Linking modals state
  const [showLinkAdModal, setShowLinkAdModal] = useState(false);
  const [showLinkContentModal, setShowLinkContentModal] = useState(false);
  const [showLinkPublicationModal, setShowLinkPublicationModal] = useState(false);
  const [showAddInfluencerModal, setShowAddInfluencerModal] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  
  // Available items to link
  const [availableAds, setAvailableAds] = useState([]);
  const [availableContentProjects, setAvailableContentProjects] = useState([]);
  const [availablePublications, setAvailablePublications] = useState([]);
  const [availableInfluencers, setAvailableInfluencers] = useState([]);
  const [loadingLinkItems, setLoadingLinkItems] = useState(false);
  const [addingInfluencer, setAddingInfluencer] = useState(false);
  
  // Influencer selection with deliverable & fee
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [influencerDeliverables, setInfluencerDeliverables] = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [agreedFee, setAgreedFee] = useState('');
  
  // Edit influencer state
  const [showEditInfluencerModal, setShowEditInfluencerModal] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState(null);
  const [editInfluencerData, setEditInfluencerData] = useState({
    deliverable_id: '',
    deliverable_name: '',
    agreed_fee: '',
    status: 'assigned'
  });

  const fetchCampaignData = useCallback(async () => {
    if (!campaignId) return;
    
    setLoading(true);
    try {
      let campaignData = null;
      
      // Try regular campaigns endpoint first
      try {
        const campaignRes = await api.get(`/marketing/campaigns/${campaignId}`);
        if (campaignRes.data) {
          campaignData = campaignRes.data;
          campaignData.campaign_source = 'influencer';
        }
      } catch (e) {
        // Ignore and try next endpoint
      }
      
      // Try PR campaigns endpoint if not found
      if (!campaignData) {
        try {
          const prRes = await api.get(`/marketing/v2/pr/campaigns/${campaignId}`);
          if (prRes.data) {
            campaignData = prRes.data;
            campaignData.type = 'pr';
            campaignData.campaign_source = 'pr';
          }
        } catch (e) {
          // Ignore
        }
      }
      
      if (!campaignData) {
        toast.error('Campaign not found');
        navigate('/marketing/campaigns');
        return;
      }
      
      setCampaign(campaignData);

      // Fetch related content projects
      try {
        const contentRes = await api.get(`/marketing/v3/content/projects?campaign_id=${campaignId}&limit=50`);
        if (contentRes.data) {
          setContentProjects(contentRes.data);
        }
      } catch (e) {}

      // Fetch related ad campaigns
      try {
        const adsRes = await api.get(`/marketing/v3/ads/campaigns?marketing_campaign_id=${campaignId}`);
        if (adsRes.data) {
          setAdCampaigns(adsRes.data);
        }
      } catch (e) {}

      // Fetch influencer deals for this campaign
      try {
        const influencerRes = await api.get(`/marketing/v2/campaigns/${campaignId}/influencers`);
        if (influencerRes.data) {
          setInfluencers(influencerRes.data || []);
        }
      } catch (e) {
        // Fallback to deals endpoint
        try {
          const dealsRes = await api.get(`/marketing/v2/deals?campaign_id=${campaignId}&limit=50`);
          if (dealsRes.data) {
            const dealsData = dealsRes.data;
            setInfluencers(dealsData.deals || dealsData || []);
          }
        } catch (e2) {}
      }

      // Fetch PR publication pitches for PR campaigns
      try {
        const pitchesRes = await api.get(`/marketing/publications/pitches?campaign_id=${campaignId}&limit=50`);
        if (pitchesRes.data) {
          setPublications(pitchesRes.data.pitches || pitchesRes.data || []);
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  }, [campaignId, navigate, api]);

  // Fetch tasks for this campaign
  const fetchTasks = useCallback(async () => {
    if (!campaignId) return;
    setTasksLoading(true);
    try {
      const res = await api.get(`/tasks?source_module=marketing&source_entity_id=${campaignId}`);
      setTasks(res.data?.tasks || []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setTasksLoading(false);
    }
  }, [campaignId, api]);

  // Fetch users for task assignment
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/workos/users');
      const data = res.data?.users || res.data || [];
      setUsers(data.filter(u => u.status === 'active'));
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  }, [api]);

  useEffect(() => {
    fetchCampaignData();
    fetchTasks();
    fetchUsers();
  }, [fetchCampaignData, fetchTasks, fetchUsers]);

  // Create task
  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setSavingTask(true);
    try {
      await api.post('/tasks', {
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: taskForm.assigned_to || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: taskForm.status,
        source_module: 'marketing',
        source_entity_type: 'campaign',
        source_entity_id: campaignId,
        related_url: `/marketing/campaigns/${campaignId}`
      });
      toast.success('Task created successfully');
      setShowCreateTaskModal(false);
      setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '', status: 'pending' });
      fetchTasks();
    } catch (e) {
      toast.error('Failed to create task');
    } finally {
      setSavingTask(false);
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Task updated');
      fetchTasks();
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (e) {
      toast.error('Failed to delete task');
    }
  };

  // UGC Handlers
  const handleAddUgcSubmission = async () => {
    try {
      await api.post(`/marketing/campaigns/${campaignId}/ugc-submission`, {
        ...ugcForm,
        status: 'pending'
      });
      toast.success('UGC submission added!');
      setShowUgcModal(false);
      setUgcForm({ creator_name: '', creator_handle: '', platform: 'instagram', content_url: '', content_type: 'post', notes: '' });
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to add UGC submission');
    }
  };

  const handleUpdateUgcStatus = async (submissionId, status) => {
    try {
      await api.put(`/marketing/campaigns/${campaignId}/ugc-submission/${submissionId}?status=${status}`);
      toast.success(`Submission ${status}!`);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to update submission');
    }
  };

  const handleDeleteUgcSubmission = async (submissionId) => {
    if (!window.confirm('Delete this UGC submission?')) return;
    try {
      await api.delete(`/marketing/campaigns/${campaignId}/ugc-submission/${submissionId}`);
      toast.success('Submission deleted');
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to delete submission');
    }
  };

  // =====================
  // LINKING HANDLERS
  // =====================

  const fetchAvailableAds = async () => {
    setLoadingLinkItems(true);
    try {
      const res = await api.get('/marketing/v3/ads/campaigns?limit=100');
      // Filter out already linked ads
      const linkedAdIds = (campaign?.linked_ads || []).map(a => a.ad_id);
      const available = (res.data || []).filter(ad => !linkedAdIds.includes(ad.id));
      setAvailableAds(available);
    } catch (e) {
      console.error('Failed to fetch ads:', e);
      setAvailableAds([]);
    } finally {
      setLoadingLinkItems(false);
    }
  };

  const fetchAvailableContentProjects = async () => {
    setLoadingLinkItems(true);
    try {
      const res = await api.get('/marketing/v3/content/projects?limit=100');
      // Filter out already linked projects
      const linkedProjectIds = (campaign?.linked_content_projects || []).map(p => p.project_id);
      const available = (res.data || []).filter(p => !linkedProjectIds.includes(p.id));
      setAvailableContentProjects(available);
    } catch (e) {
      console.error('Failed to fetch content projects:', e);
      setAvailableContentProjects([]);
    } finally {
      setLoadingLinkItems(false);
    }
  };

  const fetchAvailablePublications = async () => {
    setLoadingLinkItems(true);
    try {
      const res = await api.get('/marketing/v2/publications?limit=100');
      // Filter out already linked publications
      const linkedPubIds = (campaign?.linked_publications || []).map(p => p.publication_id);
      const available = (res.data || []).filter(p => !linkedPubIds.includes(p.id));
      setAvailablePublications(available);
    } catch (e) {
      console.error('Failed to fetch publications:', e);
      setAvailablePublications([]);
    } finally {
      setLoadingLinkItems(false);
    }
  };

  const handleLinkAd = async (ad) => {
    try {
      await api.post(`/marketing/campaigns/${campaignId}/link-ad?ad_id=${ad.id}&ad_name=${encodeURIComponent(ad.name)}&platform=${ad.platform || 'meta'}`);
      toast.success(`Linked "${ad.name}" to campaign`);
      setShowLinkAdModal(false);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to link ad campaign');
    }
  };

  const handleUnlinkAd = async (adId) => {
    if (!window.confirm('Unlink this ad campaign?')) return;
    try {
      await api.delete(`/marketing/campaigns/${campaignId}/unlink-ad/${adId}`);
      toast.success('Ad campaign unlinked');
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to unlink ad campaign');
    }
  };

  const handleLinkContentProject = async (project) => {
    try {
      await api.post(`/marketing/campaigns/${campaignId}/link-content-project?project_id=${project.id}&project_name=${encodeURIComponent(project.title || project.name)}&project_type=${project.content_type || 'original_production'}`);
      toast.success(`Linked "${project.title || project.name}" to campaign`);
      setShowLinkContentModal(false);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to link content project');
    }
  };

  const handleUnlinkContentProject = async (projectId) => {
    if (!window.confirm('Unlink this content project?')) return;
    try {
      await api.delete(`/marketing/campaigns/${campaignId}/unlink-content-project/${projectId}`);
      toast.success('Content project unlinked');
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to unlink content project');
    }
  };

  const handleLinkPublication = async (publication) => {
    try {
      await api.post(`/marketing/campaigns/${campaignId}/link-publication?publication_id=${publication.id}&publication_name=${encodeURIComponent(publication.name)}&coverage_type=${publication.type || 'feature'}`);
      toast.success(`Linked "${publication.name}" to campaign`);
      setShowLinkPublicationModal(false);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to link publication');
    }
  };

  const handleUnlinkPublication = async (publicationId) => {
    if (!window.confirm('Unlink this publication?')) return;
    try {
      await api.delete(`/marketing/campaigns/${campaignId}/unlink-publication/${publicationId}`);
      toast.success('Publication unlinked');
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to unlink publication');
    }
  };

  // Open linking modals with data fetch
  const openLinkAdModal = () => {
    fetchAvailableAds();
    setLinkSearchQuery('');
    setShowLinkAdModal(true);
  };

  const openLinkContentModal = () => {
    fetchAvailableContentProjects();
    setLinkSearchQuery('');
    setShowLinkContentModal(true);
  };

  const openLinkPublicationModal = () => {
    fetchAvailablePublications();
    setLinkSearchQuery('');
    setShowLinkPublicationModal(true);
  };

  // Influencer functions
  const fetchAvailableInfluencers = async () => {
    setLoadingLinkItems(true);
    try {
      const response = await api.get('/marketing/v2/contacts?contact_type=influencer');
      // Filter out already assigned influencers
      const assignedIds = new Set(influencers.map(i => i.id || i.influencer_id || i.contact_id));
      const availableList = (response.data || []).filter(inf => !assignedIds.has(inf.id));
      setAvailableInfluencers(availableList);
    } catch (error) {
      console.error('Failed to fetch influencers:', error);
      setAvailableInfluencers([]);
    } finally {
      setLoadingLinkItems(false);
    }
  };

  const openAddInfluencerModal = () => {
    fetchAvailableInfluencers();
    setLinkSearchQuery('');
    setSelectedInfluencer(null);
    setInfluencerDeliverables([]);
    setSelectedDeliverable(null);
    setAgreedFee('');
    setShowAddInfluencerModal(true);
  };

  // Select an influencer and fetch their deliverables
  const handleSelectInfluencer = async (influencer) => {
    setSelectedInfluencer(influencer);
    setSelectedDeliverable(null);
    setAgreedFee('');
    
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencer.id}/deliverables`);
      setInfluencerDeliverables(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliverables:', error);
      setInfluencerDeliverables([]);
    }
  };

  // Cancel influencer selection and go back to list
  const handleCancelInfluencerSelection = () => {
    setSelectedInfluencer(null);
    setInfluencerDeliverables([]);
    setSelectedDeliverable(null);
    setAgreedFee('');
  };

  // Confirm adding influencer with deliverable and fee
  const handleConfirmAddInfluencer = async () => {
    if (!selectedInfluencer) return;
    
    setAddingInfluencer(true);
    try {
      const payload = {
        deliverable_id: selectedDeliverable?.id || null,
        deliverable_name: selectedDeliverable?.name || null,
        agreed_fee: parseFloat(agreedFee) || selectedDeliverable?.rate || selectedDeliverable?.price || 0
      };
      
      await api.post(`/marketing/v2/campaigns/${campaignId}/influencers/${selectedInfluencer.id}`, payload);
      toast.success(`Added ${selectedInfluencer.name} to campaign`);
      
      // Reset and close
      setSelectedInfluencer(null);
      setInfluencerDeliverables([]);
      setSelectedDeliverable(null);
      setAgreedFee('');
      setShowAddInfluencerModal(false);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to add influencer');
    } finally {
      setAddingInfluencer(false);
    }
  };

  // Quick add without deliverable selection
  const handleQuickAddInfluencer = async (influencer) => {
    setAddingInfluencer(true);
    try {
      await api.post(`/marketing/v2/campaigns/${campaignId}/influencers/${influencer.id}`, {});
      toast.success(`Added ${influencer.name} to campaign`);
      fetchCampaignData();
      fetchAvailableInfluencers();
    } catch (error) {
      toast.error('Failed to add influencer');
    } finally {
      setAddingInfluencer(false);
    }
  };

  const handleRemoveInfluencer = async (influencerId) => {
    if (!window.confirm('Remove this influencer from the campaign?')) return;
    try {
      await api.delete(`/marketing/v2/campaigns/${campaignId}/influencers/${influencerId}`);
      toast.success('Influencer removed from campaign');
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to remove influencer');
    }
  };

  // Open edit modal for an influencer
  const handleOpenEditInfluencer = async (deal) => {
    setEditingInfluencer(deal);
    setEditInfluencerData({
      deliverable_id: deal.deliverable_id || '',
      deliverable_name: deal.deliverable_name || '',
      agreed_fee: deal.agreed_fee?.toString() || '',
      status: deal.status || 'assigned'
    });
    
    // Fetch deliverables for this influencer
    const infId = deal.influencer_id || deal.id;
    try {
      const response = await api.get(`/marketing/v2/contacts/${infId}/deliverables`);
      setInfluencerDeliverables(response.data || []);
    } catch (error) {
      setInfluencerDeliverables([]);
    }
    
    setShowEditInfluencerModal(true);
  };

  // Save edited influencer details
  const handleSaveEditInfluencer = async () => {
    if (!editingInfluencer) return;
    
    const infId = editingInfluencer.influencer_id || editingInfluencer.id;
    setAddingInfluencer(true);
    
    try {
      await api.put(`/marketing/v2/campaigns/${campaignId}/influencers/${infId}`, {
        deliverable_id: editInfluencerData.deliverable_id || null,
        deliverable_name: editInfluencerData.deliverable_name || null,
        agreed_fee: parseFloat(editInfluencerData.agreed_fee) || 0,
        status: editInfluencerData.status
      });
      
      toast.success('Influencer details updated');
      setShowEditInfluencerModal(false);
      setEditingInfluencer(null);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to update influencer');
    } finally {
      setAddingInfluencer(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Open edit campaign modal
  const handleOpenEditCampaign = () => {
    setEditCampaignData({
      name: campaign?.name || '',
      description: campaign?.description || '',
      start_date: campaign?.start_date?.split('T')[0] || '',
      end_date: campaign?.end_date?.split('T')[0] || '',
      budget: campaign?.budget?.toString() || '',
      status: campaign?.status || 'planning',
      campaign_type: campaign?.campaign_type || campaign?.type || 'mixed'
    });
    setShowEditCampaignModal(true);
  };

  // Save campaign changes
  const handleSaveCampaign = async () => {
    setSavingCampaign(true);
    try {
      await api.put(`/marketing/campaigns/${campaignId}`, {
        name: editCampaignData.name,
        description: editCampaignData.description,
        start_date: editCampaignData.start_date,
        end_date: editCampaignData.end_date,
        budget: parseFloat(editCampaignData.budget) || 0,
        status: editCampaignData.status,
        campaign_type: editCampaignData.campaign_type
      });
      toast.success('Campaign updated');
      setShowEditCampaignModal(false);
      fetchCampaignData();
    } catch (error) {
      toast.error('Failed to update campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  // Calculate total spent from influencers, ads, publications
  const calculateTotalSpent = () => {
    let total = 0;
    
    // Influencer costs
    influencers.forEach(inf => {
      total += parseFloat(inf.agreed_fee || inf.agreed_rate || inf.rate || 0);
    });
    
    // Ad campaign costs
    adCampaigns.forEach(ad => {
      total += parseFloat(ad.spend || ad.budget || 0);
    });
    
    // Publication costs
    publications.forEach(pub => {
      total += parseFloat(pub.cost || pub.fee || 0);
    });
    
    return total;
  };

  const totalSpent = calculateTotalSpent();
  const totalBudget = campaign?.budget || 0;
  const budgetUtilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center text-gray-500">
        Campaign not found
      </div>
    );
  }

  const campaignType = campaign.campaign_type || campaign.type || 'mixed';
  const typeConfig = CAMPAIGN_TYPE_CONFIG[campaignType] || CAMPAIGN_TYPE_CONFIG.mixed;
  
  // Dynamic tab visibility based on campaign type AND available data
  // Show tab if: campaign type supports it AND (has data OR is a core tab)
  const getVisibleTabs = () => {
    const typeTabs = typeConfig.tabs;
    const visibleTabs = [];
    
    // Tasks tab - always shown first if type supports it (core tab)
    if (typeTabs.includes('tasks')) {
      visibleTabs.push({ key: 'tasks', count: tasks.length, alwaysShow: true });
    }
    
    // Content tab - always shown if type supports it (core tab)
    if (typeTabs.includes('content')) {
      visibleTabs.push({ key: 'content', count: contentProjects.length, alwaysShow: true });
    }
    
    // UGC tab - only show if type is UGC
    if (typeTabs.includes('ugc')) {
      const ugcCount = campaign?.ugc_submissions?.length || 0;
      visibleTabs.push({ key: 'ugc', count: ugcCount, alwaysShow: true });
    }
    
    // Ads tab - only show if type supports AND has data (or is digital/mixed type)
    if (typeTabs.includes('ads')) {
      const showAds = adCampaigns.length > 0 || campaignType === 'digital' || campaignType === 'mixed' || campaignType === 'paid_ads';
      if (showAds) visibleTabs.push({ key: 'ads', count: adCampaigns.length, alwaysShow: false });
    }
    
    // Assets tab - always show if type supports (core tab)
    if (typeTabs.includes('assets')) {
      visibleTabs.push({ key: 'assets', count: assets.length, alwaysShow: true });
    }
    
    // Influencers tab - only show if type supports AND has data (or is influencer type)
    if (typeTabs.includes('influencers')) {
      const showInfluencers = influencers.length > 0 || campaignType === 'influencer' || campaignType === 'mixed';
      if (showInfluencers) visibleTabs.push({ key: 'influencers', count: influencers.length, alwaysShow: false });
    }
    
    // Publications tab - only show if type supports AND has data (or is PR type)
    if (typeTabs.includes('publications')) {
      const showPubs = publications.length > 0 || campaignType === 'pr' || campaignType === 'mixed' || campaignType === 'pr_media';
      if (showPubs) visibleTabs.push({ key: 'publications', count: publications.length, alwaysShow: false });
    }
    
    // Budget tab - always show if type supports (core tab)
    if (typeTabs.includes('budget')) {
      visibleTabs.push({ key: 'budget', count: null, alwaysShow: true });
    }
    
    return visibleTabs;
  };
  
  const visibleTabs = getVisibleTabs();
  const tabKeys = visibleTabs.map(t => t.key);
  
  // Auto-select first available tab if current tab is not visible
  const effectiveActiveTab = tabKeys.includes(activeTab) ? activeTab : (tabKeys[0] || 'content');

  // Budget calculations are done above in calculateTotalSpent()
  // totalSpent now includes all linked costs (influencers, ads, publications)

  return (
    <div className="p-6 space-y-6" data-testid="campaign-details-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/marketing/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={STATUS_CONFIG[campaign.status]?.color}>
                {STATUS_CONFIG[campaign.status]?.label || campaign.status}
              </Badge>
              <Badge variant="outline">{typeConfig.label} Campaign</Badge>
            </div>
            {campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaignData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleOpenEditCampaign}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Campaign
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium">
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-sm font-medium">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className="text-sm font-medium">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="text-sm font-medium">{budgetUtilization}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-xs text-gray-500">Content</p>
                <p className="text-sm font-medium">{contentProjects.length} Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xs text-gray-500">Influencers</p>
                <p className="text-sm font-medium">{influencers.length} Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {totalBudget > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Budget Utilization</span>
              <span className={`text-sm ${budgetUtilization > 90 ? 'text-red-500' : 'text-gray-500'}`}>
                {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
              </span>
            </div>
            <Progress 
              value={Math.min(budgetUtilization, 100)} 
              className={`h-3 ${budgetUtilization > 100 ? 'bg-red-100' : ''}`}
            />
            {budgetUtilization > 90 && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Budget is {budgetUtilization > 100 ? 'exceeded' : 'almost exhausted'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs - Only show relevant tabs based on campaign type and data */}
      <Tabs value={effectiveActiveTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabKeys.includes('tasks') && (
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Tasks ({tasks.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('ugc') && (
            <TabsTrigger value="ugc" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              UGC ({campaign?.ugc_submissions?.length || 0})
            </TabsTrigger>
          )}
          {tabKeys.includes('content') && (
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content ({contentProjects.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('ads') && (
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Ads ({adCampaigns.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('assets') && (
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Assets ({assets.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('influencers') && (
            <TabsTrigger value="influencers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Influencers ({influencers.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('publications') && (
            <TabsTrigger value="publications" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Publications ({publications.length})
            </TabsTrigger>
          )}
          {tabKeys.includes('budget') && (
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Campaign Tasks</CardTitle>
              <Button size="sm" onClick={() => setShowCreateTaskModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="text-center py-8 text-gray-500">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="mb-2">No tasks yet</p>
                  <p className="text-sm">Create tasks to manage campaign activities</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Task Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">{tasks.filter(t => t.status === 'pending').length}</p>
                      <p className="text-xs text-yellow-700">Pending</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in_progress').length}</p>
                      <p className="text-xs text-blue-700">In Progress</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</p>
                      <p className="text-xs text-green-700">Completed</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed').length}</p>
                      <p className="text-xs text-red-700">Overdue</p>
                    </div>
                  </div>
                  
                  {/* Task List */}
                  <div className="space-y-2">
                    {tasks.map(task => {
                      const assignee = users.find(u => u.id === task.assigned_to);
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                      return (
                        <div key={task.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                          <div className="flex items-center gap-4">
                            <Checkbox 
                              checked={task.status === 'completed'}
                              onCheckedChange={(checked) => handleUpdateTaskStatus(task.id, checked ? 'completed' : 'pending')}
                            />
                            <div>
                              <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {task.title}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                {assignee && (
                                  <>
                                    <User className="w-3 h-3" />
                                    <span>{assignee.name}</span>
                                    <span>•</span>
                                  </>
                                )}
                                {task.due_date && (
                                  <>
                                    <Calendar className="w-3 h-3" />
                                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                      {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                              {task.priority}
                            </Badge>
                            <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'outline' : 'secondary'}>
                              {task.status?.replace('_', ' ')}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UGC Tab */}
        <TabsContent value="ugc" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">UGC Submissions</CardTitle>
              <Button size="sm" onClick={() => setShowUgcModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Submission
              </Button>
            </CardHeader>
            <CardContent>
              {(!campaign?.ugc_submissions || campaign.ugc_submissions.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="mb-2">No UGC submissions yet</p>
                  <p className="text-sm">Add user-generated content from creators</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-600">{campaign.ugc_submissions.filter(s => s.status === 'pending').length}</p>
                      <p className="text-xs text-yellow-700">Pending</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{campaign.ugc_submissions.filter(s => s.status === 'approved').length}</p>
                      <p className="text-xs text-green-700">Approved</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{campaign.ugc_submissions.filter(s => s.status === 'featured').length}</p>
                      <p className="text-xs text-purple-700">Featured</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{campaign.ugc_submissions.filter(s => s.status === 'rejected').length}</p>
                      <p className="text-xs text-red-700">Rejected</p>
                    </div>
                  </div>
                  
                  {/* Submissions List */}
                  <div className="space-y-3">
                    {campaign.ugc_submissions.map(submission => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {submission.creator_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{submission.creator_name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <span>{submission.creator_handle || 'No handle'}</span>
                              <span>•</span>
                              <span className="capitalize">{submission.platform}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs capitalize">{submission.content_type}</Badge>
                            </div>
                            {submission.notes && <p className="text-sm text-gray-500 mt-1 italic">"{submission.notes}"</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            submission.status === 'featured' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {submission.status}
                          </Badge>
                          <a href={submission.content_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-4 h-4 mr-1" /> View
                            </Button>
                          </a>
                          <div className="flex items-center gap-1">
                            {submission.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => handleUpdateUgcStatus(submission.id, 'approved')}>
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleUpdateUgcStatus(submission.id, 'rejected')}>
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {submission.status === 'approved' && (
                              <Button size="sm" variant="ghost" className="text-purple-600 hover:bg-purple-50" onClick={() => handleUpdateUgcStatus(submission.id, 'featured')} title="Feature this content">
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-gray-500 hover:bg-gray-100" onClick={() => handleDeleteUgcSubmission(submission.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {/* Linked Content Projects Section */}
          {(campaign?.linked_content_projects?.length > 0) && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="w-4 h-4 text-green-600" />
                  Linked Content Projects ({campaign.linked_content_projects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaign.linked_content_projects.map(linked => (
                    <div key={linked.project_id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{linked.project_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{linked.project_type}</Badge>
                          <span className="text-xs text-gray-500">Linked {formatDate(linked.linked_at)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleUnlinkContentProject(linked.project_id)}>
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Content Projects</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openLinkContentModal}>
                  <Link className="w-4 h-4 mr-2" />
                  Link Existing
                </Button>
                <Button size="sm" onClick={() => navigate('/marketing/content')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contentProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No content projects linked to this campaign</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openLinkContentModal}>
                    <Link className="w-4 h-4 mr-2" />
                    Link Content Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {contentProjects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {project.content_category || project.content_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.medium || project.platform}
                          </Badge>
                          <Badge className={
                            project.status === 'published' ? 'bg-green-500' :
                            project.status === 'in_production' ? 'bg-blue-500' : 'bg-gray-500'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          {/* Linked Ads Section */}
          {(campaign?.linked_ads?.length > 0) && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="w-4 h-4 text-blue-600" />
                  Linked Ad Campaigns ({campaign.linked_ads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaign.linked_ads.map(linked => (
                    <div key={linked.ad_id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{linked.ad_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{linked.platform}</Badge>
                          <span className="text-xs text-gray-500">Linked {formatDate(linked.linked_at)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleUnlinkAd(linked.ad_id)}>
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Digital Ad Campaigns</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openLinkAdModal}>
                  <Link className="w-4 h-4 mr-2" />
                  Link Existing
                </Button>
                <Button size="sm" onClick={() => navigate('/marketing/ads')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {adCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No ad campaigns linked to this marketing campaign</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openLinkAdModal}>
                    <Link className="w-4 h-4 mr-2" />
                    Link Ad Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {adCampaigns.map(ad => (
                    <div key={ad.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{ad.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{ad.platform}</Badge>
                          <span className="text-sm text-gray-500">
                            Budget: {formatCurrency(ad.budget)}
                          </span>
                          <Badge className={ad.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {ad.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Creative Assets</CardTitle>
              <Button size="sm" onClick={() => navigate('/marketing/assets')}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Asset
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                No assets linked to this campaign yet
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencers Tab */}
        <TabsContent value="influencers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Influencer Deals</CardTitle>
              <Button size="sm" onClick={openAddInfluencerModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Influencer
              </Button>
            </CardHeader>
            <CardContent>
              {influencers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No influencers assigned to this campaign</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openAddInfluencerModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Influencer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {influencers.map(deal => (
                    <div key={deal.id || deal.influencer_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-lg">
                          {(deal.influencer_name || deal.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{deal.influencer_name || deal.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {(deal.instagram_handle || deal.influencer?.instagram_handle) && (
                              <span className="text-xs text-gray-500">@{deal.instagram_handle || deal.influencer?.instagram_handle}</span>
                            )}
                            {deal.followers && (
                              <>
                                <span className="text-xs text-gray-300">•</span>
                                <span className="text-xs text-gray-500">{formatNumber(deal.followers)} followers</span>
                              </>
                            )}
                          </div>
                          {/* Deliverable & Fee Row */}
                          <div className="flex items-center gap-2 mt-2">
                            {deal.deliverable_name && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {deal.deliverable_name}
                              </Badge>
                            )}
                            {(deal.agreed_fee || deal.agreed_rate || deal.rate) ? (
                              <Badge className="text-xs bg-green-100 text-green-700">
                                {formatCurrency(deal.agreed_fee || deal.agreed_rate || deal.rate)}
                              </Badge>
                            ) : null}
                            {deal.status && (
                              <Badge className={`text-xs ${
                                deal.status === 'contracted' ? 'bg-green-500 text-white' :
                                deal.status === 'assigned' ? 'bg-blue-500 text-white' :
                                deal.status === 'negotiating' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'
                              }`}>
                                {deal.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* WhatsApp button - only show if phone exists */}
                        {(deal.phone || deal.influencer?.phone) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              const phone = (deal.phone || deal.influencer?.phone || '').replace(/[^0-9]/g, '');
                              const message = encodeURIComponent(`Hi ${deal.influencer_name || deal.name || ''},\n\nRegarding our campaign collaboration...\n\n`);
                              window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                            }}
                            title="Open WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditInfluencer(deal);
                          }}
                          title="Edit fee & deliverable"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/marketing/influencer/${deal.id || deal.influencer_id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveInfluencer(deal.id || deal.influencer_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publications Tab */}
        <TabsContent value="publications" className="space-y-4">
          {/* Linked Publications Section */}
          {(campaign?.linked_publications?.length > 0) && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link className="w-4 h-4 text-purple-600" />
                  Linked Publications ({campaign.linked_publications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaign.linked_publications.map(linked => (
                    <div key={linked.publication_id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{linked.publication_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{linked.coverage_type}</Badge>
                          <span className="text-xs text-gray-500">Linked {formatDate(linked.linked_at)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleUnlinkPublication(linked.publication_id)}>
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">PR Pitches & Publications</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openLinkPublicationModal}>
                  <Link className="w-4 h-4 mr-2" />
                  Link Publication
                </Button>
                <Button size="sm" onClick={() => navigate('/marketing/publications/pipeline')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Pitch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {publications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No PR pitches linked to this campaign</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openLinkPublicationModal}>
                    <Link className="w-4 h-4 mr-2" />
                    Link Publication
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {publications.map(pitch => (
                    <div key={pitch.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{pitch.subject}</p>
                        <p className="text-sm text-gray-500">{pitch.publication_name}</p>
                      </div>
                      <Badge>{pitch.stage}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-500">Spent</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBudget - totalSpent)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Spending by Category</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Influencer Fees ({influencers.length} deals)</span>
                      <span className="text-sm font-medium text-amber-600">
                        {formatCurrency(influencers.reduce((sum, inf) => sum + parseFloat(inf.agreed_fee || inf.agreed_rate || 0), 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ad Spend ({adCampaigns.length} campaigns)</span>
                      <span className="text-sm font-medium text-blue-600">
                        {formatCurrency(adCampaigns.reduce((sum, ad) => sum + parseFloat(ad.spend || ad.budget || 0), 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Publication Costs ({publications.length} pitches)</span>
                      <span className="text-sm font-medium text-purple-600">
                        {formatCurrency(publications.reduce((sum, pub) => sum + parseFloat(pub.cost || pub.fee || 0), 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 mt-2">
                      <span className="font-medium">Total Linked Spend</span>
                      <span className="font-medium text-orange-600">{formatCurrency(totalSpent)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button variant="outline" onClick={() => navigate('/marketing/budget-management')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Go to Budget Management
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* UGC Submission Modal */}
      <Dialog open={showUgcModal} onOpenChange={setShowUgcModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add UGC Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Creator Name *</Label>
              <Input 
                value={ugcForm.creator_name}
                onChange={e => setUgcForm(prev => ({ ...prev, creator_name: e.target.value }))}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Creator Handle</Label>
              <Input 
                value={ugcForm.creator_handle}
                onChange={e => setUgcForm(prev => ({ ...prev, creator_handle: e.target.value }))}
                placeholder="@johndoe"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Platform</Label>
                <Select value={ugcForm.platform} onValueChange={v => setUgcForm(prev => ({ ...prev, platform: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Content Type</Label>
                <Select value={ugcForm.content_type} onValueChange={v => setUgcForm(prev => ({ ...prev, content_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Content URL *</Label>
              <Input 
                value={ugcForm.content_url}
                onChange={e => setUgcForm(prev => ({ ...prev, content_url: e.target.value }))}
                placeholder="https://instagram.com/p/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Notes</Label>
              <Textarea 
                value={ugcForm.notes}
                onChange={e => setUgcForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes about this submission..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowUgcModal(false)}>Cancel</Button>
              <Button 
                onClick={handleAddUgcSubmission}
                disabled={!ugcForm.creator_name || !ugcForm.content_url}
              >
                Add Submission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Ad Campaign Modal */}
      <Dialog open={showLinkAdModal} onOpenChange={setShowLinkAdModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-blue-600" />
              Link Ad Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search ad campaigns..."
                value={linkSearchQuery}
                onChange={e => setLinkSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingLinkItems ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Loading ad campaigns...</p>
                </div>
              ) : availableAds.filter(ad => 
                  !linkSearchQuery || 
                  ad.name?.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Megaphone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No ad campaigns available to link</p>
                </div>
              ) : (
                availableAds
                  .filter(ad => !linkSearchQuery || ad.name?.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                  .map(ad => (
                    <div key={ad.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 cursor-pointer" onClick={() => handleLinkAd(ad)}>
                      <div>
                        <p className="font-medium">{ad.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{ad.platform}</Badge>
                          <span className="text-sm text-gray-500">Budget: {formatCurrency(ad.budget)}</span>
                          <Badge className={ad.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>{ad.status}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        <Link className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Content Project Modal */}
      <Dialog open={showLinkContentModal} onOpenChange={setShowLinkContentModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-green-600" />
              Link Content Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search content projects..."
                value={linkSearchQuery}
                onChange={e => setLinkSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingLinkItems ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Loading content projects...</p>
                </div>
              ) : availableContentProjects.filter(p => 
                  !linkSearchQuery || 
                  (p.title || p.name)?.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No content projects available to link</p>
                </div>
              ) : (
                availableContentProjects
                  .filter(p => !linkSearchQuery || (p.title || p.name)?.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                  .map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-green-50 cursor-pointer" onClick={() => handleLinkContentProject(project)}>
                      <div>
                        <p className="font-medium">{project.title || project.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{project.content_type || project.content_category}</Badge>
                          <Badge variant="outline" className="text-xs">{project.platform || project.medium}</Badge>
                          <Badge className={
                            project.status === 'published' ? 'bg-green-500' :
                            project.status === 'in_production' ? 'bg-blue-500' : 'bg-gray-500'
                          }>{project.status}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-green-600">
                        <Link className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Publication Modal */}
      <Dialog open={showLinkPublicationModal} onOpenChange={setShowLinkPublicationModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-600" />
              Link Publication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search publications..."
                value={linkSearchQuery}
                onChange={e => setLinkSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingLinkItems ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Loading publications...</p>
                </div>
              ) : availablePublications.filter(p => 
                  !linkSearchQuery || 
                  p.name?.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No publications available to link</p>
                </div>
              ) : (
                availablePublications
                  .filter(p => !linkSearchQuery || p.name?.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                  .map(publication => (
                    <div key={publication.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-purple-50 cursor-pointer" onClick={() => handleLinkPublication(publication)}>
                      <div>
                        <p className="font-medium">{publication.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{publication.type || 'feature'}</Badge>
                          {publication.website && (
                            <a href={publication.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                              {publication.website}
                            </a>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-purple-600">
                        <Link className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Influencer Modal */}
      <Dialog open={showAddInfluencerModal} onOpenChange={(open) => {
        setShowAddInfluencerModal(open);
        if (!open) handleCancelInfluencerSelection();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              {selectedInfluencer ? `Add ${selectedInfluencer.name} to Campaign` : 'Add Influencer to Campaign'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Step 2: Deliverable & Fee Selection */}
            {selectedInfluencer ? (
              <div className="space-y-4">
                {/* Selected Influencer Info */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-lg">
                    {selectedInfluencer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedInfluencer.name}</div>
                    <div className="text-sm text-gray-600">
                      {selectedInfluencer.instagram_handle || selectedInfluencer.youtube_handle} • {formatNumber(selectedInfluencer.followers)} followers
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCancelInfluencerSelection}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                </div>

                {/* Deliverable Selection */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                    SELECT DELIVERABLE / RATE CARD
                  </Label>
                  {influencerDeliverables.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                      No rate cards configured for this influencer. You can still add with a custom fee.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {influencerDeliverables.map(d => (
                        <div 
                          key={d.id}
                          onClick={() => {
                            setSelectedDeliverable(d);
                            setAgreedFee(d.rate?.toString() || d.price?.toString() || '');
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedDeliverable?.id === d.id 
                              ? 'border-amber-500 bg-amber-50' 
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{d.name}</div>
                              {d.description && <div className="text-sm text-gray-500">{d.description}</div>}
                            </div>
                            <div className="text-lg font-bold text-amber-700">
                              {formatCurrency(d.rate || d.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fee Input */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                    AGREED FEE (₹)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter agreed fee amount"
                    value={agreedFee}
                    onChange={e => setAgreedFee(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the final negotiated fee for this campaign
                  </p>
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleCancelInfluencerSelection}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmAddInfluencer}
                    disabled={addingInfluencer}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {addingInfluencer ? 'Adding...' : 'Add to Campaign'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 1: Influencer Selection */
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search influencers..."
                    value={linkSearchQuery}
                    onChange={e => setLinkSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {loadingLinkItems ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Loading influencers...</p>
                    </div>
                  ) : availableInfluencers.filter(inf => 
                      !linkSearchQuery || 
                      inf.name?.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                      inf.instagram_handle?.toLowerCase().includes(linkSearchQuery.toLowerCase())
                    ).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No influencers available to add</p>
                      <p className="text-sm mt-1">All influencers are already assigned to this campaign</p>
                    </div>
                  ) : (
                    availableInfluencers
                      .filter(inf => !linkSearchQuery || inf.name?.toLowerCase().includes(linkSearchQuery.toLowerCase()) || inf.instagram_handle?.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                      .map(influencer => (
                        <div 
                          key={influencer.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-amber-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                              {influencer.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{influencer.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {influencer.instagram_handle && (
                                  <span className="text-xs text-gray-500">@{influencer.instagram_handle}</span>
                                )}
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{formatNumber(influencer.followers)} followers</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSelectInfluencer(influencer)}
                              disabled={addingInfluencer}
                            >
                              Select
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleQuickAddInfluencer(influencer)}
                              disabled={addingInfluencer}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Influencer Modal */}
      <Dialog open={showEditInfluencerModal} onOpenChange={setShowEditInfluencerModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" />
              Edit Influencer Deal
            </DialogTitle>
          </DialogHeader>
          
          {editingInfluencer && (
            <div className="space-y-4 py-4">
              {/* Influencer Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                  {(editingInfluencer.influencer_name || editingInfluencer.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{editingInfluencer.influencer_name || editingInfluencer.name}</div>
                  <div className="text-sm text-gray-500">
                    @{editingInfluencer.instagram_handle || 'unknown'} • {formatNumber(editingInfluencer.followers)} followers
                  </div>
                </div>
              </div>

              {/* Deliverable Selection */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                  DELIVERABLE / RATE CARD
                </Label>
                {influencerDeliverables.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
                    No rate cards configured for this influencer.
                  </p>
                ) : (
                  <Select 
                    value={editInfluencerData.deliverable_id || 'none'} 
                    onValueChange={(v) => {
                      if (v === 'none') {
                        setEditInfluencerData({...editInfluencerData, deliverable_id: '', deliverable_name: ''});
                      } else {
                        const del = influencerDeliverables.find(d => d.id === v);
                        setEditInfluencerData({
                          ...editInfluencerData, 
                          deliverable_id: v, 
                          deliverable_name: del?.name || '',
                          agreed_fee: del?.rate?.toString() || del?.price?.toString() || editInfluencerData.agreed_fee
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select deliverable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No deliverable selected</SelectItem>
                      {influencerDeliverables.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} - {formatCurrency(d.rate || d.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Agreed Fee */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                  AGREED FEE (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter agreed fee"
                  value={editInfluencerData.agreed_fee}
                  onChange={e => setEditInfluencerData({...editInfluencerData, agreed_fee: e.target.value})}
                  className="text-lg"
                />
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                  STATUS
                </Label>
                <Select 
                  value={editInfluencerData.status} 
                  onValueChange={(v) => setEditInfluencerData({...editInfluencerData, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="contracted">Contracted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditInfluencerModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditInfluencer}
                  disabled={addingInfluencer}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {addingInfluencer ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={showEditCampaignModal} onOpenChange={setShowEditCampaignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Campaign
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                CAMPAIGN NAME
              </Label>
              <Input
                value={editCampaignData.name}
                onChange={e => setEditCampaignData({...editCampaignData, name: e.target.value})}
                placeholder="Campaign name"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                DESCRIPTION
              </Label>
              <Textarea
                value={editCampaignData.description}
                onChange={e => setEditCampaignData({...editCampaignData, description: e.target.value})}
                placeholder="Campaign description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                  START DATE
                </Label>
                <Input
                  type="date"
                  value={editCampaignData.start_date}
                  onChange={e => setEditCampaignData({...editCampaignData, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                  END DATE
                </Label>
                <Input
                  type="date"
                  value={editCampaignData.end_date}
                  onChange={e => setEditCampaignData({...editCampaignData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                BUDGET (₹)
              </Label>
              <Input
                type="number"
                value={editCampaignData.budget}
                onChange={e => setEditCampaignData({...editCampaignData, budget: e.target.value})}
                placeholder="Total budget"
              />
              {totalSpent > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Current spent: {formatCurrency(totalSpent)} ({budgetUtilization}% utilized)
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                STATUS
              </Label>
              <Select 
                value={editCampaignData.status} 
                onValueChange={(v) => setEditCampaignData({...editCampaignData, status: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                CAMPAIGN TYPE
              </Label>
              <Select 
                value={editCampaignData.campaign_type} 
                onValueChange={(v) => setEditCampaignData({...editCampaignData, campaign_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer">Influencer Marketing</SelectItem>
                  <SelectItem value="ugc">UGC (User Generated Content)</SelectItem>
                  <SelectItem value="paid_ads">Paid Advertising</SelectItem>
                  <SelectItem value="content_production">Content Production</SelectItem>
                  <SelectItem value="pr_media">PR & Media</SelectItem>
                  <SelectItem value="product_launch">Product Launch</SelectItem>
                  <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                  <SelectItem value="seasonal">Seasonal Campaign</SelectItem>
                  <SelectItem value="mixed">Mixed / Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Cost Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Influencer Costs:</span>
                  <span className="font-medium">
                    {formatCurrency(influencers.reduce((sum, inf) => sum + parseFloat(inf.agreed_fee || inf.agreed_rate || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ad Spend:</span>
                  <span className="font-medium">
                    {formatCurrency(adCampaigns.reduce((sum, ad) => sum + parseFloat(ad.spend || ad.budget || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Publication Costs:</span>
                  <span className="font-medium">
                    {formatCurrency(publications.reduce((sum, pub) => sum + parseFloat(pub.cost || pub.fee || 0), 0))}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total Spent:</span>
                  <span className="text-orange-600">{formatCurrency(totalSpent)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEditCampaignModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCampaign}
                disabled={savingCampaign}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingCampaign ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={showCreateTaskModal} onOpenChange={setShowCreateTaskModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Create Campaign Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                placeholder="Enter task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Task description..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To</Label>
                <Select
                  value={taskForm.assigned_to}
                  onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateTaskModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={savingTask}>
                {savingTask ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
