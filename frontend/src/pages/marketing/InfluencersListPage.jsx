import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Search, Filter, Instagram, Youtube, 
  MoreHorizontal, Users, Sparkles, ChevronUp, ChevronDown, Download, User, AtSign, DollarSign, Building, X,
  TrendingUp, Heart, Target, Eye, Send, Trash2, Edit, ExternalLink, BadgeCheck, Loader2, GitCompare, Wand2, Link2, MessageSquare,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { ExportButton } from '../../lib/exportUtils';
import LinkToCampaign from '../../lib/LinkToCampaign';

const InfluencersListPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');
  const [filterScore, setFilterScore] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterAddedBy, setFilterAddedBy] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [filtersMeta, setFiltersMeta] = useState({ creators: [], cities: [] });
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState('basic');
  const [fetching, setFetching] = useState({ instagram: false, youtube: false });
  const [statusCounts, setStatusCounts] = useState({
    identified: 0, contacted: 0, interested: 0, negotiation: 0, confirmed: 0, completed: 0
  });
  
  // Bulk delete state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Compare & Discovery state
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showAiDiscovery, setShowAiDiscovery] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  
  // Metrics refresh state
  const [refreshingMetrics, setRefreshingMetrics] = useState(null);
  
  // Verification state
  const [verified, setVerified] = useState({ instagram: false, youtube: false });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(25); // Items per page
  
  // Auto-fetch debounce refs
  const instagramDebounceRef = useRef(null);
  const youtubeDebounceRef = useRef(null);
  
  // Check if any filters are active
  const hasActiveFilters = filterPlatform !== 'all' || filterStatus !== 'all' || filterTier !== 'all' || 
    filterIndustry !== 'all' || filterCampaign !== 'all' || filterEngagement !== 'all' || 
    filterScore !== 'all' || filterCity !== 'all' || filterAddedBy !== 'all' || searchQuery;
  
  const clearAllFilters = () => {
    setFilterPlatform('all');
    setFilterStatus('all');
    setFilterTier('all');
    setFilterIndustry('all');
    setFilterCampaign('all');
    setFilterEngagement('all');
    setFilterScore('all');
    setFilterCity('all');
    setFilterAddedBy('all');
    setSearchQuery('');
  };
  
  const [newInfluencer, setNewInfluencer] = useState({
    name: '', gender: 'not_specified', city: '', industry: 'fashion', tier: 'micro',
    audience_focus: 'unisex', email: '', phone: '', bio: '', style_tags: '',
    instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
    followers: '', engagement_rate: '', avg_likes: '', avg_comments: '',
    youtube_subscribers: '', youtube_total_views: '', youtube_videos_count: '', youtube_avg_views: '',
    manager_name: '', manager_email: '', manager_phone: '', agency: '',
    turnaround_days: '', payment_terms: 'not_specified', exclusivity_terms: '',
    accepts_barter: false, notes: '',
    deliverables: [
      { id: '1', name: 'Static Post', description: 'Feed image post', price: '' },
      { id: '2', name: 'Reel / Short', description: '15-60 sec video', price: '' },
      { id: '3', name: 'Story', description: '24hr story post', price: '' },
      { id: '4', name: 'YouTube Video', description: 'Dedicated/integrated video', price: '' }
    ]
  });
  
  const [newDeliverable, setNewDeliverable] = useState({ name: '', description: '', price: '' });

  const fetchInfluencers = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await api.get('/marketing/v2/contacts/paginated', {
        params: { 
          contact_type: 'influencer', 
          page: page,
          page_size: pageSize,
          ...(filterCity !== 'all' && { city: filterCity }),
          ...(filterAddedBy !== 'all' && { added_by: filterAddedBy })
        }
      });
      const data = response.data.contacts || [];
      setInfluencers(data);
      
      // Update pagination info
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total || 0);
      setCurrentPage(response.data.page || 1);
      
      // Update filters metadata
      if (response.data.filters_meta) {
        setFiltersMeta(response.data.filters_meta);
      }
      
      const counts = { identified: 0, contacted: 0, interested: 0, negotiation: 0, confirmed: 0, completed: 0 };
      data.forEach(inf => {
        const status = inf.status?.toLowerCase() || 'identified';
        if (counts[status] !== undefined) counts[status]++;
        else counts.identified++;
      });
      setStatusCounts(counts);
    } catch (error) {
      toast.error('Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [api, filterCity, filterAddedBy, currentPage, pageSize]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchInfluencers(1); // Reset to page 1 when filters change
    fetchCampaigns();
  }, [filterCity, filterAddedBy]);
  
  // Page change handler
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchInfluencers(newPage);
      // Scroll to top of list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFetchSocial = async (platform) => {
    const handle = platform === 'instagram' ? newInfluencer.instagram_handle : newInfluencer.youtube_handle;
    if (!handle) {
      toast.error(`Please enter ${platform} handle first`);
      return;
    }
    
    setFetching(prev => ({ ...prev, [platform]: true }));
    toast.info(`Fetching ${platform} data...`);
    
    try {
      // Use the new influencer analytics endpoints
      const endpoint = platform === 'instagram' 
        ? `/marketing/v2/influencer-analytics/instagram/${encodeURIComponent(handle.replace('@', ''))}`
        : `/marketing/v2/influencer-analytics/youtube/${encodeURIComponent(handle.replace('@', ''))}`;
      
      const response = await api.get(endpoint);
      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || `Failed to fetch ${platform} data`);
        setVerified(prev => ({ ...prev, [platform]: false }));
        return;
      }
      
      // Mark as verified since we got real data
      setVerified(prev => ({ ...prev, [platform]: true }));
      
      if (platform === 'instagram') {
        const metrics = data.metrics || {};
        setNewInfluencer(prev => ({
          ...prev,
          followers: metrics.followers?.toString() || prev.followers,
          engagement_rate: metrics.engagement_rate?.toString() || prev.engagement_rate,
          avg_likes: metrics.avg_likes?.toString() || prev.avg_likes,
          avg_comments: metrics.avg_comments?.toString() || prev.avg_comments,
          bio: data.bio || prev.bio,
          name: data.name || prev.name,
          tier: data.tier || prev.tier,
          instagram_profile_pic: data.profile_picture || prev.instagram_profile_pic
        }));
        toast.success(`Instagram verified! ${metrics.followers?.toLocaleString()} followers`);
      } else {
        const metrics = data.metrics || {};
        setNewInfluencer(prev => ({
          ...prev,
          followers: metrics.subscribers?.toString() || prev.followers,
          name: data.name || prev.name,
          tier: data.tier || prev.tier,
          youtube_channel_id: data.channel_id || prev.youtube_channel_id,
          youtube_profile_pic: data.profile_picture || prev.youtube_profile_pic
        }));
        toast.success(`YouTube verified! ${metrics.subscribers?.toLocaleString()} subscribers`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to fetch data';
      toast.error(errorMsg);
      setVerified(prev => ({ ...prev, [platform]: false }));
    } finally {
      setFetching(prev => ({ ...prev, [platform]: false }));
    }
  };
  
  // Auto-fetch when handle changes (with debounce)
  const handleInstagramHandleChange = (value) => {
    setNewInfluencer(prev => ({ ...prev, instagram_handle: value }));
    setVerified(prev => ({ ...prev, instagram: false }));
    
    // Clear previous timeout
    if (instagramDebounceRef.current) {
      clearTimeout(instagramDebounceRef.current);
    }
    
    // Auto-fetch after 1.5 seconds of no typing
    if (value && value.length >= 3) {
      instagramDebounceRef.current = setTimeout(async () => {
        // Fetch directly with the value since state might not be updated
        setFetching(prev => ({ ...prev, instagram: true }));
        try {
          const endpoint = `/marketing/v2/influencer-analytics/instagram/${encodeURIComponent(value.replace('@', ''))}`;
          const response = await api.get(endpoint);
          const data = response.data;
          
          if (data.success) {
            const metrics = data.metrics || {};
            setVerified(prev => ({ ...prev, instagram: true }));
            setNewInfluencer(prev => ({
              ...prev,
              followers: metrics.followers?.toString() || prev.followers,
              engagement_rate: metrics.engagement_rate?.toString() || prev.engagement_rate,
              avg_likes: metrics.avg_likes?.toString() || prev.avg_likes,
              avg_comments: metrics.avg_comments?.toString() || prev.avg_comments,
              bio: data.bio || prev.bio,
              name: data.name || prev.name,
              tier: data.tier || prev.tier,
              instagram_profile_pic: data.profile_picture || prev.instagram_profile_pic
            }));
            toast.success(`Instagram verified! ${metrics.followers?.toLocaleString()} followers`);
          } else {
            // Show error for unsuccessful fetch
            toast.error(data.error || 'Instagram account not found or not a Business/Creator account');
          }
        } catch (error) {
          toast.error('Failed to verify Instagram handle');
          console.log('Auto-fetch failed:', error);
        } finally {
          setFetching(prev => ({ ...prev, instagram: false }));
        }
      }, 1500);
    }
  };
  
  const handleYoutubeHandleChange = (value) => {
    setNewInfluencer(prev => ({ ...prev, youtube_handle: value }));
    setVerified(prev => ({ ...prev, youtube: false }));
    
    // Clear previous timeout
    if (youtubeDebounceRef.current) {
      clearTimeout(youtubeDebounceRef.current);
    }
    
    // Auto-fetch after 1.5 seconds of no typing
    if (value && value.length >= 3) {
      youtubeDebounceRef.current = setTimeout(async () => {
        setFetching(prev => ({ ...prev, youtube: true }));
        try {
          const endpoint = `/marketing/v2/influencer-analytics/youtube/${encodeURIComponent(value.replace('@', ''))}`;
          const response = await api.get(endpoint);
          const data = response.data;
          
          if (data.success) {
            const metrics = data.metrics || {};
            setVerified(prev => ({ ...prev, youtube: true }));
            setNewInfluencer(prev => ({
              ...prev,
              name: prev.name || data.name,  // Don't overwrite if Instagram already set name
              tier: data.tier || prev.tier,
              youtube_channel_id: data.channel_id || prev.youtube_channel_id,
              youtube_profile_pic: data.profile_picture || prev.youtube_profile_pic,
              youtube_subscribers: metrics.subscribers?.toString() || prev.youtube_subscribers,
              youtube_total_views: metrics.total_views?.toString() || prev.youtube_total_views,
              youtube_videos_count: metrics.videos?.toString() || prev.youtube_videos_count,
            }));
            toast.success(`YouTube verified! ${metrics.subscribers?.toLocaleString()} subscribers`);
          } else {
            toast.error(data.error || 'YouTube channel not found');
          }
        } catch (error) {
          toast.error('Failed to verify YouTube handle');
          console.log('Auto-fetch failed:', error);
        } finally {
          setFetching(prev => ({ ...prev, youtube: false }));
        }
      }, 1500);
    }
  };

  const handleFetchAll = async () => {
    if (newInfluencer.instagram_handle) await handleFetchSocial('instagram');
    if (newInfluencer.youtube_handle) await handleFetchSocial('youtube');
  };

  const addDeliverable = () => {
    if (!newDeliverable.name) {
      toast.error('Deliverable name is required');
      return;
    }
    setNewInfluencer(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        { id: Date.now().toString(), ...newDeliverable }
      ]
    }));
    setNewDeliverable({ name: '', description: '', price: '' });
  };

  const removeDeliverable = (id) => {
    setNewInfluencer(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== id)
    }));
  };

  const updateDeliverablePrice = (id, price) => {
    setNewInfluencer(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => 
        d.id === id ? { ...d, price } : d
      )
    }));
  };

  const handleAddInfluencer = async () => {
    if (!newInfluencer.name) {
      toast.error('Name is required');
      return;
    }
    try {
      // Clean up the data - convert empty strings to null for optional fields
      const cleanData = {
        name: newInfluencer.name,
        contact_type: 'influencer',
        bio: newInfluencer.bio || null,
        instagram_handle: newInfluencer.instagram_handle || null,
        youtube_handle: newInfluencer.youtube_handle || null,
        twitter_handle: newInfluencer.twitter_handle || null,
        email: newInfluencer.email || null,
        phone: newInfluencer.phone || null,
        city: newInfluencer.city || null,
        country: newInfluencer.country || 'India',
        industry: newInfluencer.industry || 'fashion',
        primary_platform: newInfluencer.primary_platform || 'instagram',
        content_type: Array.isArray(newInfluencer.content_type) ? newInfluencer.content_type : [],
        style_tags: newInfluencer.style_tags ? (typeof newInfluencer.style_tags === 'string' ? newInfluencer.style_tags.split(',').map(t => t.trim()).filter(t => t) : newInfluencer.style_tags) : [],
        languages: newInfluencer.languages || ['English', 'Hindi'],
        tier: newInfluencer.tier || 'micro',
        followers: parseInt(newInfluencer.followers) || 0,
        engagement_rate: parseFloat(newInfluencer.engagement_rate) || 0,
        youtube_subscribers: parseInt(newInfluencer.youtube_subscribers) || null,
        youtube_total_views: parseInt(newInfluencer.youtube_total_views) || null,
        youtube_videos_count: parseInt(newInfluencer.youtube_videos_count) || null,
        youtube_avg_views: parseInt(newInfluencer.youtube_avg_views) || null,
        rate_per_post: newInfluencer.rate_per_post ? parseFloat(newInfluencer.rate_per_post) : null,
        rate_per_reel: newInfluencer.rate_per_reel ? parseFloat(newInfluencer.rate_per_reel) : null,
        notes: newInfluencer.notes || null,
      };
      
      await api.post('/marketing/v2/contacts', cleanData);
      toast.success('Influencer added');
      setShowAddModal(false);
      setNewInfluencer({
        name: '', gender: 'not_specified', city: '', industry: 'fashion', tier: 'micro',
        audience_focus: 'unisex', email: '', phone: '', bio: '', style_tags: '',
        instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
        followers: '', engagement_rate: '', avg_likes: '', avg_comments: '',
        youtube_subscribers: '', youtube_total_views: '', youtube_videos_count: '', youtube_avg_views: '',
        rate_per_post: '', rate_per_reel: '', rate_per_story: '', rate_per_youtube: '',
        manager_name: '', manager_email: '', manager_phone: '', agency: '',
        turnaround_days: '', payment_terms: 'not_specified', exclusivity_terms: '',
        accepts_barter: false, notes: ''
      });
      setAddModalTab('basic');
      setVerified({ instagram: false, youtube: false });
      fetchInfluencers();
    } catch (error) {
      console.error('Add influencer error:', error);
      toast.error('Failed to add influencer');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/marketing/v2/contacts/${id}`, { status: newStatus });
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteInfluencer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/marketing/v2/contacts/${id}`);
      toast.success('Influencer deleted');
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to delete influencer');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const response = await api.post('/marketing/v2/contacts/bulk-delete', { ids: selectedIds });
      toast.success(`Deleted ${response.data.deleted_count} influencers`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      fetchInfluencers();
    } catch (error) {
      toast.error('Failed to delete influencers');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRefreshMetrics = async (influencer) => {
    if (!influencer.instagram_handle && !influencer.youtube_handle) {
      toast.error('No social handles to fetch metrics from');
      return;
    }
    
    setRefreshingMetrics(influencer.id);
    toast.info(`Fetching metrics for ${influencer.name}...`);
    
    try {
      const response = await api.post(`/marketing/v2/contacts/${influencer.id}/fetch-metrics`);
      
      if (response.data.success) {
        const results = response.data.results;
        const igSuccess = results?.instagram?.success;
        const ytSuccess = results?.youtube?.success;
        
        let message = 'Metrics updated: ';
        if (igSuccess) {
          message += `Instagram (${results.instagram.metrics.followers?.toLocaleString()} followers) `;
        }
        if (ytSuccess) {
          message += `YouTube (${results.youtube.metrics.subscribers?.toLocaleString()} subs)`;
        }
        
        toast.success(message);
        fetchInfluencers(); // Refresh the list
      } else {
        toast.error('Failed to fetch metrics');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to fetch metrics';
      toast.error(errorMsg);
    } finally {
      setRefreshingMetrics(null);
    }
  };

  const handleRefreshAll = async () => {
    toast.info('Refreshing influencer data...');
    await fetchInfluencers();
    toast.success('Data refreshed');
  };

  // Compare Functions
  const toggleCompareSelection = (id) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id));
    } else {
      if (compareIds.length >= 5) {
        toast.warning('Maximum 5 influencers can be compared at once');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const handleCompare = async () => {
    if (compareIds.length < 2) {
      toast.error('Select at least 2 influencers to compare');
      return;
    }
    
    setCompareLoading(true);
    setShowCompareDialog(true);
    
    try {
      const response = await api.post('/marketing/v2/influencers/compare', {
        influencer_ids: compareIds
      });
      setCompareData(response.data);
    } catch (error) {
      toast.error('Failed to compare influencers');
      console.error(error);
    } finally {
      setCompareLoading(false);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareIds([]);
    setCompareData(null);
  };

  // AI Discovery Functions
  const handleAiDiscovery = async () => {
    if (!aiQuery.trim()) {
      toast.error('Please describe what you\'re looking for');
      return;
    }
    
    setAiLoading(true);
    try {
      const response = await api.post('/marketing/v2/influencers/ai-discover', {
        query: aiQuery,
        limit: 10
      });
      setAiResults(response.data.recommendations || []);
      if (response.data.recommendations?.length === 0) {
        toast.info('No matching influencers found. Try a different description.');
      } else {
        toast.success(`Found ${response.data.recommendations.length} recommendations`);
      }
    } catch (error) {
      toast.error('AI Discovery failed. Please try again.');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getTierBadge = (followers) => {
    if (followers >= 1000000) return { label: 'Mega', color: 'bg-amber-100 text-amber-700' };
    if (followers >= 500000) return { label: 'Celebrity', color: 'bg-purple-100 text-purple-700' };
    if (followers >= 100000) return { label: 'Macro', color: 'bg-green-100 text-green-700' };
    if (followers >= 10000) return { label: 'Micro', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Nano', color: 'bg-gray-100 text-gray-700' };
  };

  const getPlatformBadge = (platform) => {
    if (platform === 'youtube') return { label: 'Youtube', color: 'bg-red-100 text-red-600', icon: Youtube };
    return { label: 'Instagram', color: 'bg-pink-100 text-pink-600', icon: Instagram };
  };

  const getStatusColor = (status) => {
    const colors = {
      identified: 'bg-gray-100 text-gray-700',
      contacted: 'bg-blue-100 text-blue-700',
      interested: 'bg-green-100 text-green-700',
      negotiation: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-purple-100 text-purple-700'
    };
    return colors[status?.toLowerCase()] || colors.identified;
  };

  const filteredInfluencers = influencers.filter(inf => {
    // Search filter
    const matchesSearch = !searchQuery || 
      inf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.instagram_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.youtube_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Platform filter
    const matchesPlatform = filterPlatform === 'all' || inf.primary_platform === filterPlatform;
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || (inf.status?.toLowerCase() || 'identified') === filterStatus;
    
    // Tier filter
    const matchesTier = filterTier === 'all' || inf.tier === filterTier;
    
    // Industry filter
    const matchesIndustry = filterIndustry === 'all' || inf.industry?.toLowerCase() === filterIndustry;
    
    // Campaign filter
    const matchesCampaign = filterCampaign === 'all' || 
      (filterCampaign === 'unassigned' ? !inf.campaign_id : inf.campaign_id === filterCampaign);
    
    // Engagement filter
    let matchesEngagement = true;
    if (filterEngagement !== 'all') {
      const rate = inf.engagement_rate || 0;
      if (filterEngagement === 'high') matchesEngagement = rate > 5;
      else if (filterEngagement === 'medium') matchesEngagement = rate >= 2 && rate <= 5;
      else if (filterEngagement === 'low') matchesEngagement = rate < 2;
    }
    
    // Score filter
    let matchesScore = true;
    if (filterScore !== 'all') {
      const score = inf.score || 0;
      if (filterScore === 'excellent') matchesScore = score >= 80;
      else if (filterScore === 'good') matchesScore = score >= 60 && score < 80;
      else if (filterScore === 'average') matchesScore = score >= 40 && score < 60;
      else if (filterScore === 'below') matchesScore = score < 40;
    }
    
    // City filter (done server-side via API, but also filter client-side for consistency)
    const matchesCity = filterCity === 'all' || inf.city?.toLowerCase() === filterCity.toLowerCase();
    
    // Added by filter (done server-side via API, but also filter client-side for consistency)
    const matchesAddedBy = filterAddedBy === 'all' || inf.created_by === filterAddedBy;
    
    return matchesSearch && matchesPlatform && matchesStatus && matchesTier && 
           matchesIndustry && matchesCampaign && matchesEngagement && matchesScore &&
           matchesCity && matchesAddedBy;
  }).sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'score') return multiplier * ((a.score || 0) - (b.score || 0));
    if (sortBy === 'followers') return multiplier * ((a.followers || 0) - (b.followers || 0));
    if (sortBy === 'engagement') return multiplier * ((a.engagement_rate || 0) - (b.engagement_rate || 0));
    if (sortBy === 'name') {
      return multiplier * (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'industry') {
      return multiplier * (a.industry || '').localeCompare(b.industry || '');
    }
    if (sortBy === 'tier') {
      const tierOrder = { nano: 1, micro: 2, mid: 3, macro: 4, mega: 5, celebrity: 6 };
      return multiplier * ((tierOrder[a.tier] || 0) - (tierOrder[b.tier] || 0));
    }
    if (sortBy === 'status') {
      const statusOrder = { identified: 1, contacted: 2, interested: 3, negotiation: 4, confirmed: 5, completed: 6 };
      return multiplier * ((statusOrder[a.pipeline_status] || 0) - (statusOrder[b.pipeline_status] || 0));
    }
    if (sortBy === 'updated') {
      const dateA = new Date(a.updated_at || 0);
      const dateB = new Date(b.updated_at || 0);
      return multiplier * (dateA - dateB);
    }
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortOrder === 'desc' ? 
      <ChevronDown className="w-3 h-3 text-amber-600" /> : 
      <ChevronUp className="w-3 h-3 text-amber-600" />;
  };
  
  // Sortable column header component
  const SortableHeader = ({ field, children, className = "" }) => (
    <th 
      className={`text-left p-4 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors
        ${sortBy === field ? 'text-amber-700 bg-amber-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
        ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  );

  const modalTabs = [
    { id: 'basic', label: 'Basic', icon: User },
    { id: 'social', label: 'Social', icon: AtSign },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'manager', label: 'Manager', icon: Building },
    { id: 'rates', label: 'Rates', icon: DollarSign }
  ];

  return (
    <div className="p-8 space-y-6 bg-white min-h-screen" data-testid="influencers-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif italic text-gray-900">Influencers</h1>
        <div className="flex items-center gap-3">
          {/* Compare Mode Toggle */}
          {compareMode ? (
            <>
              <Badge className="bg-purple-100 text-purple-700 px-3 py-1">
                {compareIds.length} selected for comparison
              </Badge>
              <Button 
                onClick={handleCompare}
                disabled={compareIds.length < 2}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                data-testid="compare-btn"
              >
                <GitCompare className="w-4 h-4" /> Compare ({compareIds.length})
              </Button>
              <Button variant="outline" onClick={exitCompareMode}>
                <X className="w-4 h-4 mr-1" /> Exit Compare
              </Button>
            </>
          ) : (
            <>
              {selectedIds.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="gap-2"
                  data-testid="bulk-delete-btn"
                >
                  <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => setCompareMode(true)}
                className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                data-testid="enter-compare-mode-btn"
              >
                <GitCompare className="w-4 h-4" /> Compare
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAiDiscovery(!showAiDiscovery)}
                className={`gap-2 ${showAiDiscovery ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300' : ''}`}
                data-testid="ai-discovery-btn"
              >
                <Wand2 className="w-4 h-4" /> AI Discovery
              </Button>
              <Button variant="outline" onClick={handleRefreshAll} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              <ExportButton 
                data={influencers}
                filename="influencers-export"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'instagram_handle', label: 'Instagram' },
                  { key: 'youtube_handle', label: 'YouTube' },
                  { key: 'email', label: 'Email' },
                  { key: 'city', label: 'City' },
                  { key: 'status', label: 'Status' },
                  { key: 'tier', label: 'Tier' },
                  { key: 'score', label: 'Score' },
                  { key: 'instagram_followers', label: 'IG Followers' },
                  { key: 'instagram_engagement_rate', label: 'IG Engagement %' },
                  { key: 'youtube_subscribers', label: 'YT Subscribers' },
                ]}
              />
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogTrigger asChild>
                  <Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white gap-2">
                    <Plus className="w-4 h-4" /> Add Influencer
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif italic">Add Influencer</DialogTitle>
              </DialogHeader>
              
              {/* Quick Add Section */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Quick Add - Fetch from Social Media</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleFetchAll}
                    className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" /> Fetch All
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">Enter handles and click Fetch All, or fetch individually</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-pink-500" /> INSTAGRAM HANDLE
                      {verified.instagram && <BadgeCheck className="w-3 h-3 text-blue-500 ml-1" title="Verified" />}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="@nike or instagram.com/nike" 
                          value={newInfluencer.instagram_handle}
                          onChange={e => handleInstagramHandleChange(e.target.value)}
                          className={verified.instagram ? 'border-green-400 pr-8' : ''}
                        />
                        {fetching.instagram && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-pink-500" />
                        )}
                        {verified.instagram && !fetching.instagram && (
                          <BadgeCheck className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleFetchSocial('instagram')}
                        disabled={fetching.instagram}
                        className="bg-pink-500 hover:bg-pink-600 text-white px-4"
                      >
                        {fetching.instagram ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                    {verified.instagram && newInfluencer.followers && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Verified: {Number(newInfluencer.followers).toLocaleString()} followers
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-red-500" /> YOUTUBE HANDLE
                      {verified.youtube && <BadgeCheck className="w-3 h-3 text-blue-500 ml-1" title="Verified" />}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input 
                          placeholder="@mkbhd or channel URL" 
                          value={newInfluencer.youtube_handle}
                          onChange={e => handleYoutubeHandleChange(e.target.value)}
                          className={verified.youtube ? 'border-green-400 pr-8' : ''}
                        />
                        {fetching.youtube && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-red-500" />
                        )}
                        {verified.youtube && !fetching.youtube && (
                          <BadgeCheck className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleFetchSocial('youtube')}
                        disabled={fetching.youtube}
                        className="bg-red-500 hover:bg-red-600 text-white px-4"
                      >
                        {fetching.youtube ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </Button>
                    </div>
                    {verified.youtube && newInfluencer.followers && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Verified: {Number(newInfluencer.followers).toLocaleString()} subscribers
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
                {modalTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAddModalTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                        addModalTab === tab.id 
                          ? 'bg-gray-100 text-gray-900 font-medium' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-1">
                {/* Basic Tab */}
                {addModalTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">NAME *</Label>
                        <Input 
                          value={newInfluencer.name}
                          onChange={e => setNewInfluencer({...newInfluencer, name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER</Label>
                        <Select value={newInfluencer.gender} onValueChange={v => setNewInfluencer({...newInfluencer, gender: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_specified">Not specified</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">CITY *</Label>
                        <Select value={newInfluencer.city || 'mumbai'} onValueChange={v => setNewInfluencer({...newInfluencer, city: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mumbai">Mumbai</SelectItem>
                            <SelectItem value="delhi">Delhi</SelectItem>
                            <SelectItem value="bangalore">Bangalore</SelectItem>
                            <SelectItem value="hyderabad">Hyderabad</SelectItem>
                            <SelectItem value="chennai">Chennai</SelectItem>
                            <SelectItem value="kolkata">Kolkata</SelectItem>
                            <SelectItem value="pune">Pune</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">INDUSTRY</Label>
                        <Select value={newInfluencer.industry} onValueChange={v => setNewInfluencer({...newInfluencer, industry: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fashion">Fashion</SelectItem>
                            <SelectItem value="beauty">Beauty</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle</SelectItem>
                            <SelectItem value="tech">Tech</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="fitness">Fitness</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">TIER</Label>
                        <Select value={newInfluencer.tier} onValueChange={v => setNewInfluencer({...newInfluencer, tier: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nano">Nano</SelectItem>
                            <SelectItem value="micro">Micro</SelectItem>
                            <SelectItem value="macro">Macro</SelectItem>
                            <SelectItem value="mega">Mega</SelectItem>
                            <SelectItem value="celebrity">Celebrity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">AUDIENCE FOCUS</Label>
                        <Select value={newInfluencer.audience_focus} onValueChange={v => setNewInfluencer({...newInfluencer, audience_focus: v})}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unisex">Unisex</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">EMAIL</Label>
                        <Input 
                          type="email"
                          value={newInfluencer.email}
                          onChange={e => setNewInfluencer({...newInfluencer, email: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">PHONE</Label>
                        <Input 
                          value={newInfluencer.phone}
                          onChange={e => setNewInfluencer({...newInfluencer, phone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">BIO</Label>
                      <Textarea 
                        placeholder="Influencer bio..."
                        value={newInfluencer.bio}
                        onChange={e => setNewInfluencer({...newInfluencer, bio: e.target.value})}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">STYLE TAGS</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          placeholder="Add tag"
                          value={newInfluencer.style_tags}
                          onChange={e => setNewInfluencer({...newInfluencer, style_tags: e.target.value})}
                        />
                        <Button variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Tab */}
                {addModalTab === 'social' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">PRIMARY PLATFORM *</Label>
                      <Select value={newInfluencer.primary_platform} onValueChange={v => setNewInfluencer({...newInfluencer, primary_platform: v})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">📷 Instagram</SelectItem>
                          <SelectItem value="youtube">▶️ YouTube</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">The platform where this influencer has their main presence</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Instagram className="w-3 h-3 text-pink-500" /> INSTAGRAM
                          {newInfluencer.primary_platform === 'instagram' && (
                            <Badge className="bg-pink-100 text-pink-600 text-xs ml-1">PRIMARY</Badge>
                          )}
                        </Label>
                        <Input 
                          placeholder="@handle"
                          value={newInfluencer.instagram_handle}
                          onChange={e => setNewInfluencer({...newInfluencer, instagram_handle: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Youtube className="w-3 h-3 text-red-500" /> YOUTUBE
                          {newInfluencer.primary_platform === 'youtube' && (
                            <Badge className="bg-red-100 text-red-600 text-xs ml-1">PRIMARY</Badge>
                          )}
                        </Label>
                        <Input 
                          placeholder="@channel"
                          value={newInfluencer.youtube_handle}
                          onChange={e => setNewInfluencer({...newInfluencer, youtube_handle: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Instagram Metrics */}
                    {(verified.instagram || newInfluencer.instagram_handle) && (
                      <div className="border border-pink-200 bg-pink-50/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="font-medium text-sm text-pink-700">Instagram Metrics</span>
                          {verified.instagram && <BadgeCheck className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">FOLLOWERS</Label>
                            <Input 
                              type="number"
                              placeholder="50000"
                              value={newInfluencer.followers}
                              onChange={e => setNewInfluencer({...newInfluencer, followers: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">ENGAGEMENT %</Label>
                            <Input 
                              type="number"
                              step="0.1"
                              placeholder="4.5"
                              value={newInfluencer.engagement_rate}
                              onChange={e => setNewInfluencer({...newInfluencer, engagement_rate: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                            <Input 
                              type="number"
                              placeholder="2500"
                              value={newInfluencer.avg_likes}
                              onChange={e => setNewInfluencer({...newInfluencer, avg_likes: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AVG COMMENTS</Label>
                            <Input 
                              type="number"
                              placeholder="100"
                              value={newInfluencer.avg_comments}
                              onChange={e => setNewInfluencer({...newInfluencer, avg_comments: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* YouTube Metrics */}
                    {(verified.youtube || newInfluencer.youtube_handle) && (
                      <div className="border border-red-200 bg-red-50/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Youtube className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-sm text-red-700">YouTube Metrics</span>
                          {verified.youtube && <BadgeCheck className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">SUBSCRIBERS</Label>
                            <Input 
                              type="number"
                              placeholder="100000"
                              value={newInfluencer.youtube_subscribers}
                              onChange={e => setNewInfluencer({...newInfluencer, youtube_subscribers: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">TOTAL VIEWS</Label>
                            <Input 
                              type="number"
                              placeholder="5000000"
                              value={newInfluencer.youtube_total_views}
                              onChange={e => setNewInfluencer({...newInfluencer, youtube_total_views: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">VIDEOS</Label>
                            <Input 
                              type="number"
                              placeholder="150"
                              value={newInfluencer.youtube_videos_count}
                              onChange={e => setNewInfluencer({...newInfluencer, youtube_videos_count: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AVG VIEWS/VIDEO</Label>
                            <Input 
                              type="number"
                              placeholder="35000"
                              value={newInfluencer.youtube_avg_views}
                              onChange={e => setNewInfluencer({...newInfluencer, youtube_avg_views: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Show default metrics if no platform selected */}
                    {!verified.instagram && !verified.youtube && !newInfluencer.instagram_handle && !newInfluencer.youtube_handle && (
                      <div className="text-center py-6 text-gray-500">
                        <p className="text-sm">Enter Instagram or YouTube handle above to fetch metrics</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Audience Tab */}
                {addModalTab === 'audience' && (
                  <div className="space-y-6">
                    {/* Instagram Audience */}
                    <div className="border border-pink-200 bg-pink-50/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <span className="font-medium text-gray-900">Instagram Audience</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AGE DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
                              <button key={age} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {age}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Male', 'Female', 'Other'].map(gender => (
                              <button key={gender} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {gender}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">TOP CITIES</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Other Indian', 'International'].map(city => (
                              <button key={city} className={`px-3 py-1 border rounded text-sm hover:bg-gray-100 flex items-center gap-1 ${city === 'Other Indian' ? 'border-pink-400 text-pink-600' : 'border-gray-300'}`}>
                                <Plus className="w-3 h-3" /> {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* YouTube Audience */}
                    <div className="border border-red-200 bg-red-50/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-gray-900">YouTube Audience</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">AGE DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['13-17', '18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
                              <button key={`yt-${age}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {age}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER DISTRIBUTION</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Male', 'Female', 'Other'].map(gender => (
                              <button key={`yt-${gender}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {gender}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-gray-500">TOP CITIES</Label>
                            <span className="text-xs text-gray-400">Total: 0%</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Other Indian', 'International'].map(city => (
                              <button key={`yt-${city}`} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manager Tab */}
                {addModalTab === 'manager' && (
                  <div className="space-y-6">
                    <p className="text-gray-600">Contact details for influencer's manager or talent agency (if applicable).</p>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER / AGENT NAME</Label>
                      <Input 
                        placeholder="John Doe"
                        value={newInfluencer.manager_name}
                        onChange={e => setNewInfluencer({...newInfluencer, manager_name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER EMAIL</Label>
                        <Input 
                          type="email"
                          placeholder="manager@agency.com"
                          value={newInfluencer.manager_email}
                          onChange={e => setNewInfluencer({...newInfluencer, manager_email: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-gray-500">MANAGER PHONE</Label>
                        <Input 
                          placeholder="+91 98765 43210"
                          value={newInfluencer.manager_phone}
                          onChange={e => setNewInfluencer({...newInfluencer, manager_phone: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-4">Commercial Terms</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">TURNAROUND (DAYS)</Label>
                          <Input 
                            type="number"
                            placeholder="7"
                            value={newInfluencer.turnaround_days}
                            onChange={e => setNewInfluencer({...newInfluencer, turnaround_days: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT TERMS</Label>
                          <Select 
                            value={newInfluencer.payment_terms || 'not_specified'} 
                            onValueChange={v => setNewInfluencer({...newInfluencer, payment_terms: v})}
                          >
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_specified">Not specified</SelectItem>
                              <SelectItem value="advance">100% Advance</SelectItem>
                              <SelectItem value="50_50">50% Advance, 50% After</SelectItem>
                              <SelectItem value="after_delivery">After Delivery</SelectItem>
                              <SelectItem value="net_30">Net 30</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Label className="text-xs uppercase tracking-wider text-gray-500">EXCLUSIVITY TERMS</Label>
                        <Textarea 
                          placeholder="e.g., No competing brand posts for 30 days"
                          value={newInfluencer.exclusivity_terms}
                          onChange={e => setNewInfluencer({...newInfluencer, exclusivity_terms: e.target.value})}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rates Tab */}
                {addModalTab === 'rates' && (
                  <div className="space-y-6">
                    {/* Existing Deliverables */}
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">SERVICE DELIVERABLES</Label>
                      <div className="space-y-3">
                        {newInfluencer.deliverables.map((deliverable) => (
                          <div key={deliverable.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{deliverable.name}</div>
                              <div className="text-xs text-gray-500">{deliverable.description}</div>
                            </div>
                            <div className="w-32">
                              <Input 
                                type="number"
                                placeholder="₹ Price"
                                value={deliverable.price}
                                onChange={e => updateDeliverablePrice(deliverable.id, e.target.value)}
                              />
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeDeliverable(deliverable.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add New Deliverable */}
                    <div className="border-t border-gray-200 pt-4">
                      <Label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">ADD CUSTOM DELIVERABLE</Label>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">Name</Label>
                          <Input 
                            placeholder="e.g., Brand Integration"
                            value={newDeliverable.name}
                            onChange={e => setNewDeliverable({...newDeliverable, name: e.target.value})}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">Description</Label>
                          <Input 
                            placeholder="e.g., Mention in video"
                            value={newDeliverable.description}
                            onChange={e => setNewDeliverable({...newDeliverable, description: e.target.value})}
                          />
                        </div>
                        <div className="w-28">
                          <Label className="text-xs text-gray-500">Price (₹)</Label>
                          <Input 
                            type="number"
                            placeholder="10000"
                            value={newDeliverable.price}
                            onChange={e => setNewDeliverable({...newDeliverable, price: e.target.value})}
                          />
                        </div>
                        <Button 
                          onClick={addDeliverable}
                          className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 py-3 border-y border-gray-100">
                      <input 
                        type="checkbox"
                        checked={newInfluencer.accepts_barter || false}
                        onChange={e => setNewInfluencer({...newInfluencer, accepts_barter: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label className="mb-0">Accepts Barter</Label>
                    </div>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">NOTES</Label>
                      <Textarea 
                        placeholder="e.g., Preferred payment method, special requirements..."
                        value={newInfluencer.notes}
                        onChange={e => setNewInfluencer({...newInfluencer, notes: e.target.value})}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleAddInfluencer} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                  Add Influencer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}
        </div>
      </div>

      {/* AI Discovery Panel */}
      {showAiDiscovery && (
        <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI-Powered Discovery</h3>
              <Badge className="bg-purple-100 text-purple-700 text-xs">GPT-4o</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Describe the type of influencer you're looking for, and AI will find the best matches from your database.
            </p>
            <div className="flex gap-3">
              <Input 
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g., Fashion influencers with high engagement for a luxury brand campaign..."
                className="flex-1 bg-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAiDiscovery()}
                data-testid="ai-query-input"
              />
              <Button 
                onClick={handleAiDiscovery}
                disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                data-testid="ai-search-btn"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Find Matches
              </Button>
            </div>
            
            {/* AI Results */}
            {aiResults.length > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm font-medium text-gray-700 mb-2">AI Recommendations ({aiResults.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {aiResults.map((rec, idx) => (
                    <div 
                      key={idx}
                      className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 cursor-pointer transition-all hover:shadow-md"
                      onClick={() => {
                        const found = influencers.find(i => 
                          i.name.toLowerCase().includes(rec.name?.toLowerCase()) ||
                          rec.name?.toLowerCase().includes(i.name.toLowerCase())
                        );
                        if (found) navigate(`/marketing/influencer/${found.id}`);
                      }}
                    >
                      <p className="font-medium text-sm text-gray-900 truncate">{rec.name}</p>
                      <p className="text-xs text-purple-600 mt-1">{rec.reason?.slice(0, 50)}...</p>
                      {rec.score && (
                        <Badge className="mt-2 bg-purple-100 text-purple-700 text-xs">
                          Match: {rec.score}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-600 uppercase tracking-wider">Total Influencers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount || influencers.length}</p>
                <p className="text-xs text-gray-500 mt-1">In database</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">Total Reach</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNumber(influencers.reduce((sum, inf) => sum + (inf.followers || 0), 0))}
                </p>
                <p className="text-xs text-gray-500 mt-1">Combined followers</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Avg Engagement</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {influencers.length > 0 
                    ? (influencers.reduce((sum, inf) => sum + (inf.engagement_rate || 0), 0) / influencers.length).toFixed(1) 
                    : '0.0'}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all influencers</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Active Now</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {statusCounts.confirmed + statusCounts.negotiation}
                </p>
                <p className="text-xs text-gray-500 mt-1">In negotiation or confirmed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, handle, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
              data-testid="influencer-search-input"
            />
          </div>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className={`w-36 bg-white ${filterPlatform !== 'all' ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} data-testid="filter-platform">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="instagram">
                <span className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500" /> Instagram</span>
              </SelectItem>
              <SelectItem value="youtube">
                <span className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> YouTube</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`w-36 bg-white ${filterStatus !== 'all' ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="agreed">Agreed</SelectItem>
              <SelectItem value="delivering">Delivering</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className={`w-36 bg-white ${filterTier !== 'all' ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} data-testid="filter-tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="nano">Nano (1K-10K)</SelectItem>
              <SelectItem value="micro">Micro (10K-100K)</SelectItem>
              <SelectItem value="mid">Mid (100K-500K)</SelectItem>
              <SelectItem value="macro">Macro (500K-1M)</SelectItem>
              <SelectItem value="mega">Mega (1M+)</SelectItem>
              <SelectItem value="celebrity">Celebrity (10M+)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger className={`w-36 bg-white ${filterIndustry !== 'all' ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} data-testid="filter-industry">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-amber-50 border-amber-300 text-amber-700' : ''}
            data-testid="more-filters-btn"
          >
            <Filter className="w-4 h-4 mr-1" /> 
            More
            {(filterCampaign !== 'all' || filterEngagement !== 'all' || filterScore !== 'all' || filterCity !== 'all' || filterAddedBy !== 'all') && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-[10px]">
                {[filterCampaign, filterEngagement, filterScore, filterCity, filterAddedBy].filter(f => f !== 'all').length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
              data-testid="clear-filters-btn"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Advanced Filters Row */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEngagement} onValueChange={setFilterEngagement}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Engagement Rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagement</SelectItem>
                <SelectItem value="high">High (&gt;5%)</SelectItem>
                <SelectItem value="medium">Medium (2-5%)</SelectItem>
                <SelectItem value="low">Low (&lt;2%)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterScore} onValueChange={setFilterScore}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Score Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="excellent">Excellent (80+)</SelectItem>
                <SelectItem value="good">Good (60-80)</SelectItem>
                <SelectItem value="average">Average (40-60)</SelectItem>
                <SelectItem value="below">Below Average (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-44 bg-white" data-testid="filter-city">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filtersMeta.cities?.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAddedBy} onValueChange={setFilterAddedBy}>
              <SelectTrigger className="w-44 bg-white" data-testid="filter-added-by">
                <SelectValue placeholder="Added by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {filtersMeta.creators?.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
              >
                <X className="w-4 h-4 mr-1" /> Clear All Filters
              </Button>
            )}
          </div>
        )}
        
        {/* Active Filters Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 px-1">
            {filterPlatform !== 'all' && (
              <Badge variant="secondary" className="bg-pink-100 text-pink-700 gap-1">
                Platform: {filterPlatform}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterPlatform('all')} />
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
                Status: {filterStatus}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </Badge>
            )}
            {filterTier !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 gap-1">
                Tier: {filterTier}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterTier('all')} />
              </Badge>
            )}
            {filterIndustry !== 'all' && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                Industry: {filterIndustry}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterIndustry('all')} />
              </Badge>
            )}
            {filterCampaign !== 'all' && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1">
                Campaign: {filterCampaign === 'unassigned' ? 'Unassigned' : campaigns.find(c => c.id === filterCampaign)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCampaign('all')} />
              </Badge>
            )}
            {filterCity !== 'all' && (
              <Badge variant="secondary" className="bg-teal-100 text-teal-700 gap-1">
                City: {filterCity}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCity('all')} />
              </Badge>
            )}
            {filterAddedBy !== 'all' && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 gap-1">
                Added by: {filtersMeta.creators?.find(u => u.id === filterAddedBy)?.name || filterAddedBy}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterAddedBy('all')} />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 gap-1">
                Search: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Count & Sort */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-gray-600">
          Showing <span className="font-medium text-gray-900">{filteredInfluencers.length}</span> of {totalCount > 0 ? totalCount : influencers.length} influencers
          {totalCount > pageSize && <span className="text-blue-600 ml-2">(page {currentPage} of {totalPages})</span>}
          {hasActiveFilters && <span className="text-amber-600 ml-2">(filtered)</span>}
        </span>
        <div className="flex items-center gap-2 text-gray-600">
          <span className="text-xs uppercase tracking-wide">Sort:</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { field: 'score', label: 'Score' },
              { field: 'followers', label: 'Followers' },
              { field: 'engagement', label: 'Eng %' },
              { field: 'name', label: 'Name' },
              { field: 'updated', label: 'Updated' }
            ].map(({ field, label }) => (
              <button 
                key={field}
                onClick={() => toggleSort(field)} 
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  sortBy === field 
                    ? 'bg-white text-amber-700 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`sort-${field}`}
              >
                {label}
                {sortBy === field && (
                  <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Influencers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="w-12 p-4">
                <Checkbox 
                  checked={selectedIds.length === filteredInfluencers.length && filteredInfluencers.length > 0}
                  onCheckedChange={(checked) => {
                    setSelectedIds(checked ? filteredInfluencers.map(i => i.id) : []);
                  }}
                />
              </th>
              <SortableHeader field="name">Influencer</SortableHeader>
              <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Platform
              </th>
              <SortableHeader field="followers">Followers</SortableHeader>
              <SortableHeader field="engagement">Engagement</SortableHeader>
              <SortableHeader field="industry">Industry</SortableHeader>
              <SortableHeader field="tier">Tier</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Campaign
              </th>
              <SortableHeader field="score">Score</SortableHeader>
              <SortableHeader field="updated">Updated</SortableHeader>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={12} className="p-12 text-center text-gray-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#c4a35a]" />
                  <p className="font-medium">Loading influencers...</p>
                </td>
              </tr>
            ) : filteredInfluencers.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No influencers found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new influencer</p>
                </td>
              </tr>
            ) : (
              filteredInfluencers.map(inf => {
                const platform = getPlatformBadge(inf.primary_platform);
                const tier = getTierBadge(inf.followers);
                const PlatformIcon = platform.icon;
                
                return (
                  <tr 
                    key={inf.id} 
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/marketing/influencer/${inf.id}`)}
                  >
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      {compareMode ? (
                        <Checkbox 
                          checked={compareIds.includes(inf.id)}
                          onCheckedChange={() => toggleCompareSelection(inf.id)}
                          className={compareIds.includes(inf.id) ? 'border-purple-500 data-[state=checked]:bg-purple-600' : ''}
                        />
                      ) : (
                        <Checkbox 
                          checked={selectedIds.includes(inf.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(prev => 
                              checked ? [...prev, inf.id] : prev.filter(id => id !== inf.id)
                            );
                          }}
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${inf.primary_platform === 'youtube' ? 'bg-gradient-to-br from-red-100 to-red-50 ring-1 ring-red-200' : 'bg-gradient-to-br from-pink-100 to-purple-100 ring-1 ring-pink-200'}`}>
                          <PlatformIcon className={`w-5 h-5 ${inf.primary_platform === 'youtube' ? 'text-red-600' : 'text-pink-600'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-[#c4a35a] transition-colors flex items-center gap-1">
                            {inf.name}
                            {(inf.instagram_verified || inf.youtube_verified) && (
                              <BadgeCheck className="w-4 h-4 text-blue-500" title="Verified Profile" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            {(inf.instagram_handle || inf.youtube_handle) ? (
                              <a 
                                href={inf.instagram_handle 
                                  ? `https://instagram.com/${inf.instagram_handle.replace('@', '')}` 
                                  : `https://youtube.com/@${inf.youtube_handle.replace('@', '')}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                @{inf.instagram_handle || inf.youtube_handle}
                              </a>
                            ) : (
                              <span>@unknown</span>
                            )}
                            <span className="text-gray-400">•</span>
                            <span>{inf.city || 'Unknown'}</span>
                            {inf.metrics_fetched_at && (
                              <span className="text-xs text-green-500 ml-1" title={`Last updated: ${new Date(inf.metrics_fetched_at).toLocaleDateString()}`}>
                                (Live)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge className={`${platform.color} font-medium border-0`}>{platform.label}</Badge>
                        <a
                          href={inf.instagram_handle 
                            ? `https://instagram.com/${inf.instagram_handle.replace('@', '')}` 
                            : inf.youtube_handle 
                              ? `https://youtube.com/@${inf.youtube_handle.replace('@', '')}` 
                              : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!inf.instagram_handle && !inf.youtube_handle) {
                              e.preventDefault();
                            }
                          }}
                          className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                            !inf.instagram_handle && !inf.youtube_handle ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'
                          }`}
                          title={inf.instagram_handle ? `Open @${inf.instagram_handle} on Instagram` : inf.youtube_handle ? `Open @${inf.youtube_handle} on YouTube` : 'No social profile'}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 font-semibold">{formatNumber(inf.followers)}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-medium ${(inf.engagement_rate || 0) >= 3 ? 'text-green-600' : (inf.engagement_rate || 0) >= 1.5 ? 'text-amber-600' : 'text-gray-600'}`}>
                        {inf.engagement_rate?.toFixed(1) || '0.0'}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-700 capitalize">{inf.industry || '-'}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={`${tier.color} font-medium border-0`}>{tier.label}</Badge>
                    </td>
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      <Select 
                        value={inf.status || 'identified'} 
                        onValueChange={(v) => handleStatusChange(inf.id, v)}
                      >
                        <SelectTrigger className={`w-28 h-8 text-xs font-medium ${getStatusColor(inf.status)} border-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="identified">Identified</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      {inf.campaign_id ? (
                        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-xs">
                          {campaigns.find(c => c.id === inf.campaign_id)?.name || 'Campaign'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`w-11 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        (inf.score || 50) >= 70 ? 'bg-green-100 text-green-700' : 
                        (inf.score || 50) >= 50 ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {inf.score || 50}
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {formatDate(inf.updated_at)}
                    </td>
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-[#c4a35a] hover:bg-[#b08d4a] text-white rounded-full">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => navigate(`/marketing/influencer/${inf.id}`)}
                            className="cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => navigate(`/marketing/influencer/${inf.id}?edit=true`)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRefreshMetrics(inf)}
                            className="cursor-pointer"
                            disabled={refreshingMetrics === inf.id}
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshingMetrics === inf.id ? 'animate-spin' : ''}`} /> 
                            {refreshingMetrics === inf.id ? 'Fetching...' : 'Refresh Metrics'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (inf.instagram_handle) {
                                window.open(`https://instagram.com/${inf.instagram_handle.replace('@', '')}`, '_blank');
                              } else if (inf.youtube_handle) {
                                window.open(`https://youtube.com/@${inf.youtube_handle.replace('@', '')}`, '_blank');
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> View Social Profile
                          </DropdownMenuItem>
                          {inf.phone && (
                            <DropdownMenuItem 
                              onClick={() => {
                                const phone = inf.phone.replace(/[^0-9]/g, '');
                                const message = encodeURIComponent(`Hi ${inf.name || ''},\n\nI'm reaching out regarding a potential collaboration opportunity.\n\n`);
                                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                              }}
                              className="cursor-pointer text-green-600"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" /> Open WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => e.preventDefault()}
                            className="cursor-pointer p-0"
                          >
                            <div className="w-full">
                              <LinkToCampaign 
                                entityType="influencer"
                                entityId={inf.id}
                                entityName={inf.name}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-2 py-1.5 h-auto font-normal"
                              />
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInfluencer(inf.id, inf.name)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t bg-gray-50 rounded-b-xl" data-testid="pagination-controls">
          {/* Results Info */}
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> influencers
          </div>
          
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0"
              data-testid="pagination-first"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            
            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0"
              data-testid="pagination-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const showPages = 5;
                let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                let endPage = Math.min(totalPages, startPage + showPages - 1);
                
                if (endPage - startPage + 1 < showPages) {
                  startPage = Math.max(1, endPage - showPages + 1);
                }
                
                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant={currentPage === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      className={`h-8 w-8 p-0 ${currentPage === 1 ? 'bg-[#c4a35a] text-white' : ''}`}
                    >
                      1
                    </Button>
                  );
                  if (startPage > 2) {
                    pages.push(<span key="dots1" className="px-1 text-gray-400">...</span>);
                  }
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(i)}
                      disabled={loading}
                      className={`h-8 w-8 p-0 ${currentPage === i ? 'bg-[#c4a35a] text-white hover:bg-[#b39349]' : ''}`}
                    >
                      {i}
                    </Button>
                  );
                }
                
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(<span key="dots2" className="px-1 text-gray-400">...</span>);
                  }
                  pages.push(
                    <Button
                      key={totalPages}
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className={`h-8 w-8 p-0 ${currentPage === totalPages ? 'bg-[#c4a35a] text-white' : ''}`}
                    >
                      {totalPages}
                    </Button>
                  );
                }
                
                return pages;
              })()}
            </div>
            
            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0"
              data-testid="pagination-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0"
              data-testid="pagination-last"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Page Size Info */}
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Bulk Delete
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedIds.length}</strong> influencer{selectedIds.length > 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-red-500 mt-2">This action cannot be undone. All related communications and deals will also be deleted.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              data-testid="confirm-bulk-delete-btn"
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Influencer${selectedIds.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-purple-600" />
              Influencer Comparison
              <Badge className="bg-purple-100 text-purple-700">{compareIds.length} influencers</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {compareLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-600 mb-3" />
              <p className="text-gray-500">Analyzing influencers...</p>
            </div>
          ) : compareData?.influencers ? (
            <div className="space-y-6">
              {/* Influencer Cards Row */}
              <div className={`grid gap-4 ${compareData.influencers.length === 2 ? 'grid-cols-2' : compareData.influencers.length === 3 ? 'grid-cols-3' : compareData.influencers.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                {compareData.influencers.map((inf, idx) => {
                  const isWinner = compareData.winner_by_metric?.followers === inf.id;
                  return (
                    <Card key={inf.id} className={`relative ${isWinner ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}>
                      {isWinner && (
                        <Badge className="absolute -top-2 -right-2 bg-amber-500 text-white">
                          Top Reach
                        </Badge>
                      )}
                      <CardContent className="p-4 text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${inf.primary_platform === 'youtube' ? 'bg-red-100' : 'bg-pink-100'}`}>
                          {inf.primary_platform === 'youtube' ? 
                            <Youtube className="w-8 h-8 text-red-600" /> : 
                            <Instagram className="w-8 h-8 text-pink-600" />
                          }
                        </div>
                        <h4 className="font-semibold text-gray-900">{inf.name}</h4>
                        <p className="text-xs text-gray-500">@{inf.instagram_handle || inf.youtube_handle}</p>
                        <Badge className="mt-2" variant="outline">{inf.tier || 'Unknown'}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Metrics Comparison Table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Metric</th>
                      {compareData.influencers.map(inf => (
                        <th key={inf.id} className="text-center p-4 font-semibold text-gray-700">{inf.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Followers</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className={`p-4 text-center font-semibold ${compareData.winner_by_metric?.followers === inf.id ? 'text-amber-600 bg-amber-50' : ''}`}>
                          {formatNumber(inf.followers)}
                          {compareData.winner_by_metric?.followers === inf.id && <span className="ml-1">🏆</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Engagement Rate</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className={`p-4 text-center font-semibold ${compareData.winner_by_metric?.engagement === inf.id ? 'text-green-600 bg-green-50' : ''}`}>
                          {inf.engagement_rate?.toFixed(2)}%
                          {compareData.winner_by_metric?.engagement === inf.id && <span className="ml-1">🏆</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Score</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className={`p-4 text-center font-semibold ${compareData.winner_by_metric?.score === inf.id ? 'text-purple-600 bg-purple-50' : ''}`}>
                          {inf.score || '-'}
                          {compareData.winner_by_metric?.score === inf.id && <span className="ml-1">🏆</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Industry</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className="p-4 text-center capitalize">{inf.industry || '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Location</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className="p-4 text-center">{inf.city || '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-600">Pipeline Status</td>
                      {compareData.influencers.map(inf => (
                        <td key={inf.id} className="p-4 text-center capitalize">{inf.pipeline_status || 'identified'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Comparison Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Best Reach:</span>
                    <p className="font-semibold text-amber-600">
                      {compareData.influencers.find(i => i.id === compareData.winner_by_metric?.followers)?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Best Engagement:</span>
                    <p className="font-semibold text-green-600">
                      {compareData.influencers.find(i => i.id === compareData.winner_by_metric?.engagement)?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Highest Score:</span>
                    <p className="font-semibold text-purple-600">
                      {compareData.influencers.find(i => i.id === compareData.winner_by_metric?.score)?.name || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select influencers to compare</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowCompareDialog(false);
              exitCompareMode();
            }}>
              Close
            </Button>
            <Button 
              onClick={() => navigate('/marketing/discovery')}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Search className="w-4 h-4" /> Advanced Discovery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencersListPage;
