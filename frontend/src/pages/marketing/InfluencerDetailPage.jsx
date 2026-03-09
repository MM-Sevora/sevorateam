import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions, CanDelete, CanEdit } from '../../context/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, X, Save, CheckCircle, MapPin, 
  Instagram, Youtube, Download, Users, TrendingUp, Heart, Star,
  Globe, Image, Film, Clock, DollarSign, Sparkles, Plus, Trash2,
  Send, Mail, MessageSquare, Target, Calendar, Phone, User,
  BarChart3, Package, History, Edit3, ExternalLink, Building2, Briefcase
} from 'lucide-react';

const InfluencerDetailPage = () => {
  const { influencerId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [newDeliverable, setNewDeliverable] = useState({ name: '', description: '', price: '' });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // History data
  const [communications, setCommunications] = useState([]);
  const [deals, setDeals] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // Finance/Payments data
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({ total_paid: 0, total_pending: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '', description: '', payment_type: 'influencer_fee', 
    deliverables: [], due_date: '', invoice_number: ''
  });
  const [creatingPayment, setCreatingPayment] = useState(false);
  
  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [assignedCampaign, setAssignedCampaign] = useState('');
  
  // Outreach Modal
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState('email');
  const [outreachForm, setOutreachForm] = useState({
    subject: '',
    message: '',
    template: 'custom'
  });
  const [sendingOutreach, setSendingOutreach] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '', bio: '', email: '', phone: '', city: '', state: '',
    instagram_handle: '', youtube_handle: '', primary_platform: 'instagram',
    followers: 0, engagement_rate: 0, avg_likes: 0, avg_comments: 0,
    youtube_subscribers: 0, youtube_avg_views: 0, youtube_avg_likes: 0, youtube_total_videos: 0,
    industry: 'fashion', tier: 'micro', gender: 'not_specified', audience_focus: 'unisex', content_types: '',
    accepts_barter: false, style_tags: '', past_collaborations: '', languages: '', portfolio_url: '', notes: '',
    status: 'identified', campaign_id: '',
    deliverables: []
  });

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

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get('/marketing/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.log('No campaigns found');
    }
  }, [api]);

  const fetchHistory = useCallback(async () => {
    try {
      // Fetch communications
      const commsRes = await api.get(`/marketing/v2/contacts/${influencerId}/communications`);
      setCommunications(commsRes.data || []);
    } catch (error) {
      console.log('No communications found');
    }
    
    try {
      // Fetch deals
      const dealsRes = await api.get(`/marketing/v2/contacts/${influencerId}/deals`);
      setDeals(dealsRes.data || []);
    } catch (error) {
      console.log('No deals found');
    }
    
    try {
      // Fetch gifts
      const giftsRes = await api.get(`/marketing/v2/gifting?contact_id=${influencerId}`);
      setGifts(giftsRes.data || []);
    } catch (error) {
      console.log('No gifts found');
    }
  }, [api, influencerId]);

  // Fetch payments for finance tab
  const fetchPayments = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/payments/summary/by-contact/${influencerId}`);
      setPayments(response.data.payments || []);
      setPaymentSummary({
        total_paid: response.data.total_paid || 0,
        total_pending: response.data.total_pending || 0
      });
    } catch (error) {
      console.log('No payments found');
    }
  }, [api, influencerId]);

  useEffect(() => {
    fetchInfluencer();
    fetchCampaigns();
    fetchHistory();
    fetchPayments();
  }, [fetchInfluencer, fetchCampaigns, fetchHistory, fetchPayments]);

  // Build activities when history data changes
  useEffect(() => {
    const allActivities = [];
    
    communications.forEach(c => allActivities.push({
      type: 'communication',
      icon: c.comm_type === 'whatsapp' ? 'whatsapp' : 'email',
      title: c.subject || 'Message sent',
      description: c.message?.substring(0, 100),
      date: c.sent_at || c.created_at,
      status: c.status
    }));
    
    deals.forEach(d => allActivities.push({
      type: 'deal',
      icon: 'deal',
      title: `Deal ${d.status || 'created'}`,
      description: `Quote: ₹${(d.initial_quote || d.quote_amount || 0).toLocaleString()}`,
      date: d.created_at,
      status: d.status
    }));
    
    gifts.forEach(g => allActivities.push({
      type: 'gift',
      icon: 'gift',
      title: g.product_name,
      description: `Status: ${g.status}`,
      date: g.sent_date || g.created_at,
      status: g.status
    }));
    
    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivities(allActivities);
  }, [communications, deals, gifts]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFetchSocial = async (platform) => {
    const handle = platform === 'instagram' ? form.instagram_handle : form.youtube_handle;
    if (!handle) {
      toast.error(`Please enter ${platform} handle first`);
      return;
    }
    
    toast.info(`Fetching ${platform} data...`);
    try {
      const response = await api.get(`/social-api/${platform}/${platform === 'instagram' ? 'profile' : 'channel'}/${handle}`);
      const data = response.data;
      
      if (platform === 'instagram') {
        setForm(prev => ({
          ...prev,
          followers: data.followers || prev.followers,
          engagement_rate: data.engagement_rate || prev.engagement_rate,
          avg_likes: data.avg_likes || prev.avg_likes,
          avg_comments: data.avg_comments || prev.avg_comments,
          bio: data.bio || prev.bio
        }));
      } else {
        setForm(prev => ({
          ...prev,
          youtube_subscribers: data.subscribers || prev.youtube_subscribers,
          youtube_avg_views: data.avg_views || prev.youtube_avg_views,
          youtube_total_videos: data.video_count || prev.youtube_total_videos
        }));
      }
      setHasChanges(true);
      toast.success(`${platform} data fetched!`);
    } catch (error) {
      toast.error(`Failed to fetch ${platform} data. API may not be configured.`);
    }
  };

  const handleRefreshData = async () => {
    toast.info('Refreshing all social data...');
    if (form.instagram_handle) await handleFetchSocial('instagram');
    if (form.youtube_handle) await handleFetchSocial('youtube');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, form);
      toast.success('Changes saved!');
      setHasChanges(false);
      setOriginalData({ ...originalData, ...form });
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCampaign = async (campaignId) => {
    try {
      await api.put(`/marketing/v2/contacts/${influencerId}`, { 
        name: form.name,
        campaign_id: campaignId 
      });
      setAssignedCampaign(campaignId);
      updateForm('campaign_id', campaignId);
      toast.success('Campaign assigned!');
    } catch (error) {
      toast.error('Failed to assign campaign');
    }
  };

  const handleSendOutreach = async () => {
    if (!outreachForm.message) {
      toast.error('Message is required');
      return;
    }
    
    setSendingOutreach(true);
    try {
      if (outreachChannel === 'email') {
        // Send actual email via Microsoft Graph
        const emailPayload = {
          contact_id: influencerId,
          subject: outreachForm.subject || `Collaboration Opportunity`,
          body: outreachForm.message.replace(/\n/g, '<br>'),
          template_id: outreachForm.template !== 'custom' ? outreachForm.template : null
        };
        
        const result = await api.post(`/marketing/v2/outreach/send-email`, null, { params: emailPayload });
        
        if (result.data.success) {
          toast.success('Email sent successfully via Outlook!');
        } else {
          // If Microsoft email fails, fall back to recording only
          if (result.data.error?.includes('configure your Outlook')) {
            toast.error('Please configure your Outlook email in settings to send emails');
            return;
          }
          // Record as communication anyway
          await api.post(`/marketing/v2/communications`, {
            contact_id: influencerId,
            comm_type: 'email',
            subject: outreachForm.subject,
            message: outreachForm.message,
            recipient_email: form.email,
            status: 'draft'
          });
          toast.info('Email saved as draft (Outlook not configured)');
        }
      } else if (outreachChannel === 'whatsapp') {
        // Send actual WhatsApp message via Twilio
        if (!form.phone) {
          toast.error('No phone number on file for this contact');
          return;
        }
        
        const whatsappResult = await api.post('/communication/whatsapp/send', {
          to: form.phone,
          message: outreachForm.message
        });
        
        if (whatsappResult.data.success) {
          toast.success('WhatsApp message sent successfully!');
          
          // Show automation notification if triggered
          if (whatsappResult.data.automation?.success) {
            toast.info(`✨ Auto-advanced "${whatsappResult.data.automation.contact_name}" to "${whatsappResult.data.automation.to_stage}" stage`, {
              duration: 4000
            });
          }
          
          // Also record the communication in history
          await api.post(`/marketing/v2/communications`, {
            contact_id: influencerId,
            comm_type: 'whatsapp',
            subject: outreachForm.subject || 'WhatsApp Message',
            message: outreachForm.message,
            recipient_phone: form.phone,
            status: 'sent',
            external_id: whatsappResult.data.message_sid
          });
        } else {
          // If WhatsApp fails (e.g., sandbox not configured)
          const errorMsg = whatsappResult.data.error || 'Failed to send WhatsApp message';
          if (errorMsg.includes('sandbox') || errorMsg.includes('21608')) {
            toast.error('Recipient needs to join Twilio WhatsApp sandbox first. Send "join kill-ranch" to +1 415 523 8886');
          } else {
            toast.error(errorMsg);
          }
          return;
        }
      }
      
      setShowOutreachModal(false);
      setOutreachForm({ subject: '', message: '', template: 'custom' });
      
      // Refresh history
      fetchHistory();
      
      // Update status if it's "identified"
      if (form.status === 'identified') {
        await api.put(`/marketing/v2/contacts/${influencerId}`, { status: 'contacted' });
        updateForm('status', 'contacted');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingOutreach(false);
    }
  };

  const applyTemplate = (templateType) => {
    const templates = {
      collaboration: {
        subject: `Collaboration Opportunity with ${form.name}`,
        message: `Hi ${form.name},\n\nWe've been following your amazing work on ${form.primary_platform === 'youtube' ? 'YouTube' : 'Instagram'} and love your unique style!\n\nWe'd love to explore a potential collaboration opportunity. We think your audience would be a perfect fit for our brand.\n\nWould you be interested in discussing this further?\n\nBest regards`
      },
      followup: {
        subject: `Following up - Collaboration Opportunity`,
        message: `Hi ${form.name},\n\nI wanted to follow up on my previous message about a potential collaboration.\n\nWe're very excited about the possibility of working together. Please let me know if you have any questions or would like to schedule a call.\n\nLooking forward to hearing from you!\n\nBest regards`
      },
      campaign: {
        subject: `Campaign Invitation`,
        message: `Hi ${form.name},\n\nWe're launching an exciting new campaign and would love for you to be part of it!\n\nBased on your content style and audience, we believe this would be a great fit. Here are the details:\n\n[Campaign details here]\n\nLet us know if you're interested!\n\nBest regards`
      }
    };
    
    if (templates[templateType]) {
      setOutreachForm(prev => ({
        ...prev,
        ...templates[templateType],
        template: templateType
      }));
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('Discard unsaved changes?')) {
        fetchInfluencer();
        setHasChanges(false);
      }
    } else {
      navigate('/marketing/influencers');
    }
  };

  // Deliverable helper functions
  const addDeliverable = () => {
    if (!newDeliverable.name) {
      toast.error('Deliverable name is required');
      return;
    }
    const priceNum = parseFloat(newDeliverable.price) || 0;
    const newItem = {
      id: Date.now().toString(),
      name: newDeliverable.name,
      description: newDeliverable.description || '',
      price: priceNum,
      rate: priceNum  // Also store as rate for API compatibility
    };
    setForm(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newItem]
    }));
    setNewDeliverable({ name: '', description: '', price: '' });
    setHasChanges(true);
    toast.success('Deliverable added - click Save to persist changes');
  };

  const removeDeliverable = (id) => {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== id)
    }));
    setHasChanges(true);
  };

  const updateDeliverablePrice = (id, price) => {
    const priceNum = parseFloat(price) || 0;
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => 
        d.id === id ? { ...d, price: priceNum, rate: priceNum } : d
      )
    }));
    setHasChanges(true);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Payment handlers
  const handleCreatePayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setCreatingPayment(true);
    try {
      const campaignData = campaigns.find(c => c.id === assignedCampaign);
      await api.post('/marketing/payments', {
        contact_id: influencerId,
        campaign_id: assignedCampaign || null,
        campaign_name: campaignData?.name || null,
        amount: parseFloat(newPayment.amount),
        description: newPayment.description,
        payment_type: newPayment.payment_type,
        deliverables: newPayment.deliverables,
        due_date: newPayment.due_date,
        invoice_number: newPayment.invoice_number
      });
      toast.success('Payment created!');
      setShowPaymentModal(false);
      setNewPayment({ amount: '', description: '', payment_type: 'influencer_fee', deliverables: [], due_date: '', invoice_number: '' });
      fetchPayments();
    } catch (error) {
      toast.error('Failed to create payment');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId, newStatus) => {
    try {
      await api.put(`/marketing/payments/${paymentId}`, { status: newStatus });
      toast.success(`Payment ${newStatus}`);
      fetchPayments();
    } catch (error) {
      toast.error('Failed to update payment');
    }
  };

  const getTierBadge = () => {
    const followers = form.followers || 0;
    if (followers >= 1000000) return { label: 'Mega • 1M+', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (followers >= 100000) return { label: 'Macro • 100K-1M', color: 'bg-green-100 text-green-700 border-green-200' };
    if (followers >= 10000) return { label: 'Micro • 10K-100K', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'Nano • <10K', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const tier = getTierBadge();
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Core Metrics' },
    { id: 'rates', label: 'Deliverables & Rates' },
    { id: 'finance', label: 'Finance & Payments' },
    { id: 'history', label: 'History' }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="influencer-detail-page">
      {/* Header - Matching Publication Style */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/influencers')} className="h-10 w-10 p-0" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Influencer Profile</p>
            {isEditMode && (
              <Badge className="bg-amber-100 text-amber-700 text-xs animate-pulse">
                Editing Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">{form.name || 'New Influencer'}</h1>
            <Badge className={`${tier.color} border font-normal`}>{tier.label}</Badge>
            <Badge className={form.status === 'confirmed' ? 'bg-green-100 text-green-700' : form.status === 'negotiation' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
              {form.status?.charAt(0).toUpperCase() + form.status?.slice(1)}
            </Badge>
          </div>
          <div className="text-sm text-gray-500 mt-1">@{form.instagram_handle || form.youtube_handle || 'handle'}</div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowOutreachModal(true)}
            data-testid="send-outreach-btn"
          >
            <Send className="w-4 h-4 mr-2" /> Outreach
          </Button>
          {form.email && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/marketing/email?compose=true&to=${encodeURIComponent(form.email)}&subject=${encodeURIComponent(`Collaboration Opportunity - ${form.name || 'Influencer'}`)}`)}
              data-testid="quick-email-btn"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Mail className="w-4 h-4 mr-2" /> Quick Email
            </Button>
          )}
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {isEditMode ? (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  if (hasChanges) {
                    // Reset to original data
                    if (originalData) {
                      setForm(prev => ({ ...prev, ...originalData }));
                      setHasChanges(false);
                    }
                  }
                }}
                className="border-gray-300"
                data-testid="cancel-edit-btn"
              >
                <X className="w-4 h-4 mr-2" /> {hasChanges ? 'Discard' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saving}
                className={hasChanges 
                  ? "bg-[#c4a35a] hover:bg-[#b39349] text-white" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }
                data-testid="save-changes-btn"
              >
                <Save className="w-4 h-4 mr-2" /> 
                {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
              </Button>
            </>
          ) : (
            <Button 
              variant="outline"
              onClick={() => setIsEditMode(true)}
              data-testid="edit-mode-btn"
              className="border-[#c4a35a] text-[#c4a35a] hover:bg-[#c4a35a]/10"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Matching Publication Style */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(form.followers)}</div>
                <div className="text-xs text-gray-500 uppercase">Followers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{form.engagement_rate?.toFixed(1) || 0}%</div>
                <div className="text-xs text-gray-500 uppercase">Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(form.avg_likes)}</div>
                <div className="text-xs text-gray-500 uppercase">Avg Likes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{assignedCampaign ? '1' : '0'}</div>
                <div className="text-xs text-gray-500 uppercase">Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(paymentSummary.total_paid)}</div>
                <div className="text-xs text-gray-500 uppercase">Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(paymentSummary.total_pending)}</div>
                <div className="text-xs text-gray-500 uppercase">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Matching Publication Style */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <User className="w-4 h-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <BarChart3 className="w-4 h-4 mr-2" />Core Metrics
          </TabsTrigger>
          <TabsTrigger value="rates" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <Package className="w-4 h-4 mr-2" />Deliverables & Rates
          </TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <DollarSign className="w-4 h-4 mr-2" />Finance ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
            <History className="w-4 h-4 mr-2" />History ({activities.length})
          </TabsTrigger>
        </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Profile & Contact */}
          <div className="col-span-2 space-y-6">
            {/* Profile Card */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-4xl font-serif text-amber-700">
                        {form.name?.charAt(0).toUpperCase() || 'I'}
                      </div>
                      {form.status === 'confirmed' && (
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Profile Details */}
                  <div className="flex-1 space-y-4">
                    {isEditMode ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">NAME</Label>
                          <Input 
                            value={form.name} 
                            onChange={e => updateForm('name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-gray-500">BIO</Label>
                          <Textarea 
                            value={form.bio} 
                            onChange={e => updateForm('bio', e.target.value)}
                            placeholder="Influencer bio..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{form.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-gray-900 text-white capitalize">{form.industry}</Badge>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-500">{form.city || 'Location not set'}{form.state ? `, ${form.state}` : ''}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {form.bio || <span className="text-gray-400 italic">No bio added yet</span>}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Social Card */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Contact & Social
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Contact</h4>
                    {isEditMode ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">Email</Label>
                          <Input 
                            placeholder="email@example.com" 
                            value={form.email} 
                            onChange={e => updateForm('email', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Phone</Label>
                          <Input 
                            placeholder="+91 98765 43210" 
                            value={form.phone} 
                            onChange={e => updateForm('phone', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-500">City</Label>
                            <Input 
                              placeholder="City" 
                              value={form.city} 
                              onChange={e => updateForm('city', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">State</Label>
                            <Input 
                              placeholder="State" 
                              value={form.state} 
                              onChange={e => updateForm('state', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className={form.email ? 'text-gray-700' : 'text-gray-400 italic'}>
                            {form.email || 'No email'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className={form.phone ? 'text-gray-700' : 'text-gray-400 italic'}>
                            {form.phone || 'No phone'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className={form.city ? 'text-gray-700' : 'text-gray-400 italic'}>
                            {form.city ? `${form.city}${form.state ? `, ${form.state}` : ''}` : 'No location'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Profiles */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Social Profiles</h4>
                    {isEditMode ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Instagram className="w-3 h-3 text-pink-500" /> Instagram
                          </Label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              placeholder="@handle" 
                              value={form.instagram_handle} 
                              onChange={e => updateForm('instagram_handle', e.target.value)}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleFetchSocial('instagram')}
                              className="bg-pink-500 hover:bg-pink-600 text-white"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 flex items-center gap-1">
                            <Youtube className="w-3 h-3 text-red-500" /> YouTube
                          </Label>
                          <div className="flex gap-2 mt-1">
                            <Input 
                              placeholder="@channel" 
                              value={form.youtube_handle} 
                              onChange={e => updateForm('youtube_handle', e.target.value)}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleFetchSocial('youtube')}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                              <Instagram className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">@{form.instagram_handle || 'Not connected'}</div>
                              <div className="text-xs text-gray-500">{formatNumber(form.followers)} followers</div>
                            </div>
                          </div>
                          {form.instagram_handle && (
                            <a 
                              href={`https://instagram.com/${form.instagram_handle.replace('@', '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-pink-500"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                              <Youtube className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">@{form.youtube_handle || 'Not connected'}</div>
                              <div className="text-xs text-gray-500">{formatNumber(form.youtube_subscribers)} subscribers</div>
                            </div>
                          </div>
                          {form.youtube_handle && (
                            <a 
                              href={`https://youtube.com/@${form.youtube_handle.replace('@', '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-red-500"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classification Card */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isEditMode ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">INDUSTRY</Label>
                      <Select value={form.industry} onValueChange={v => updateForm('industry', v)}>
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
                      <Select value={form.tier} onValueChange={v => updateForm('tier', v)}>
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
                      <Label className="text-xs uppercase tracking-wider text-gray-500">GENDER</Label>
                      <Select value={form.gender} onValueChange={v => updateForm('gender', v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_specified">Not specified</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-binary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">AUDIENCE</Label>
                      <Select value={form.audience_focus} onValueChange={v => updateForm('audience_focus', v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unisex">Unisex</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase">Industry</div>
                      <div className="font-medium capitalize text-gray-900">{form.industry}</div>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase">Tier</div>
                      <div className="font-medium capitalize text-gray-900">{form.tier}</div>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase">Gender</div>
                      <div className="font-medium capitalize text-gray-900">{form.gender?.replace('_', ' ') || 'Not specified'}</div>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase">Audience</div>
                      <div className="font-medium capitalize text-gray-900">{form.audience_focus}</div>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase">Content Types</div>
                      <div className="font-medium text-gray-900">{form.content_types || 'Not specified'}</div>
                    </div>
                  </div>
                )}
                {isEditMode && (
                  <div className="mt-4">
                    <Label className="text-xs uppercase tracking-wider text-gray-500">CONTENT TYPES</Label>
                    <Input 
                      placeholder="reels, posts, stories" 
                      value={form.content_types} 
                      onChange={e => updateForm('content_types', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pipeline, Campaign & Performance */}
          <div className="space-y-6">
            {/* Pipeline Card - Status Only */}
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
              <CardHeader className="pb-3 border-b border-amber-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-600" /> Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Status */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-600">STATUS</Label>
                  <Select value={form.status} onValueChange={v => updateForm('status', v)}>
                    <SelectTrigger className="mt-2 bg-white" data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identified">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400" /> Identified
                        </span>
                      </SelectItem>
                      <SelectItem value="contacted">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" /> Contacted
                        </span>
                      </SelectItem>
                      <SelectItem value="interested">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400" /> Interested
                        </span>
                      </SelectItem>
                      <SelectItem value="negotiation">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Negotiation
                        </span>
                      </SelectItem>
                      <SelectItem value="confirmed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmed
                        </span>
                      </SelectItem>
                      <SelectItem value="completed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500" /> Completed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-amber-100">
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setShowOutreachModal(true)}
                  >
                    <Send className="w-4 h-4 mr-2" /> Send Outreach
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Card - Separate */}
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardHeader className="pb-3 border-b border-blue-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" /> Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-600">ASSIGNED CAMPAIGN</Label>
                  <Select value={assignedCampaign || 'none'} onValueChange={(val) => handleAssignCampaign(val === 'none' ? '' : val)}>
                    <SelectTrigger className="mt-2 bg-white" data-testid="campaign-select">
                      <SelectValue placeholder="Assign to campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map(campaign => (
                        <SelectItem key={campaign.id || campaign._id} value={campaign.id || campaign._id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {assignedCampaign && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-600 font-medium">Currently assigned to:</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">
                      {campaigns.find(c => (c.id || c._id) === assignedCampaign)?.name || 'Unknown Campaign'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics - Both Platforms */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Instagram Metrics */}
                <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                      <Instagram className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Instagram</span>
                    {form.primary_platform === 'instagram' && (
                      <Badge className="bg-pink-100 text-pink-600 text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.followers)}</div>
                      <div className="text-xs text-gray-500">Followers</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{form.engagement_rate?.toFixed(1) || '0.0'}%</div>
                      <div className="text-xs text-gray-500">Engagement</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.avg_likes)}</div>
                      <div className="text-xs text-gray-500">Avg Likes</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.avg_comments)}</div>
                      <div className="text-xs text-gray-500">Avg Comments</div>
                    </div>
                  </div>
                </div>

                {/* YouTube Metrics */}
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <Youtube className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">YouTube</span>
                    {form.primary_platform === 'youtube' && (
                      <Badge className="bg-red-100 text-red-600 text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.youtube_subscribers)}</div>
                      <div className="text-xs text-gray-500">Subscribers</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.youtube_avg_views)}</div>
                      <div className="text-xs text-gray-500">Avg Views</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{formatNumber(form.youtube_avg_likes)}</div>
                      <div className="text-xs text-gray-500">Avg Likes</div>
                    </div>
                    <div className="text-center p-2 bg-white/60 rounded">
                      <div className="text-sm font-bold text-gray-900">{form.youtube_total_videos || 0}</div>
                      <div className="text-xs text-gray-500">Videos</div>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-600">Influence Score</span>
                  </div>
                  <span className="text-lg font-bold text-amber-700">{form.score || 50}</span>
                </div>

                <div className="text-xs text-gray-400 text-center">
                  Last synced: {formatDate(form.social_synced_at) || 'Never'}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Paid</span>
                  <span className="font-bold text-green-700">{formatCurrency(paymentSummary.total_paid)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-bold text-amber-700">{formatCurrency(paymentSummary.total_pending)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Transactions</span>
                  <span className="font-bold text-gray-700">{payments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>

        {/* Core Metrics Tab */}
        <TabsContent value="metrics">
        <div className="space-y-6">
          {/* YouTube Metrics */}
          <Card className="bg-white border-l-4 border-l-red-300 border-gray-200">
            <CardHeader className="bg-red-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" /> YouTube Metrics
                {form.primary_platform === 'youtube' && (
                  <Badge className="bg-red-100 text-red-600 text-xs ml-2">Primary</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">SUBSCRIBERS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_subscribers || ''} 
                    onChange={e => updateForm('youtube_subscribers', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG VIEWS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_avg_views || ''} 
                    onChange={e => updateForm('youtube_avg_views', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                  <Input 
                    type="number"
                    value={form.youtube_avg_likes || ''} 
                    onChange={e => updateForm('youtube_avg_likes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">TOTAL VIDEOS</Label>
                  <Input 
                    type="number"
                    value={form.youtube_total_videos || ''} 
                    onChange={e => updateForm('youtube_total_videos', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram Metrics */}
          <Card className="bg-white border-l-4 border-l-pink-300 border-gray-200">
            <CardHeader className="bg-pink-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" /> Instagram Metrics
                {form.primary_platform === 'instagram' && (
                  <Badge className="bg-pink-100 text-pink-600 text-xs ml-2">Primary</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">FOLLOWERS</Label>
                  <Input 
                    type="number"
                    value={form.followers || ''} 
                    onChange={e => updateForm('followers', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">ENGAGEMENT %</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={form.engagement_rate || ''} 
                    onChange={e => updateForm('engagement_rate', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG LIKES</Label>
                  <Input 
                    type="number"
                    value={form.avg_likes || ''} 
                    onChange={e => updateForm('avg_likes', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">AVG COMMENTS</Label>
                  <Input 
                    type="number"
                    value={form.avg_comments || ''} 
                    onChange={e => updateForm('avg_comments', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audience Demographics */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" /> Audience Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 italic">No audience demographics data available</p>
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Deliverables & Rates Tab */}
        <TabsContent value="rates">
        <div className="grid grid-cols-2 gap-6">
          {/* Rate Card - Dynamic Deliverables */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" /> Service Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Deliverables */}
              {form.deliverables?.map((deliverable) => (
                <div key={deliverable.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{deliverable.name}</div>
                      <div className="text-xs text-gray-500">{deliverable.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-28">
                      <Input 
                        type="number"
                        placeholder="₹ Price"
                        value={deliverable.price || ''}
                        onChange={e => updateDeliverablePrice(deliverable.id, e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeDeliverable(deliverable.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add New Deliverable */}
              <CanEdit department="marketing" module="contacts">
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-3 block">ADD CUSTOM DELIVERABLE</Label>
                <div className="flex items-end gap-2">
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
                  <div className="w-24">
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
              </CanEdit>

              {/* Accepts Barter */}
              <div className="flex items-center justify-between p-3 border-t border-gray-100 mt-4 pt-4">
                <div>
                  <div className="font-medium text-gray-900">Accepts Barter</div>
                  <div className="text-xs text-gray-500">Product exchange collaborations</div>
                </div>
                <Switch 
                  checked={form.accepts_barter}
                  onCheckedChange={v => updateForm('accepts_barter', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Additional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">STYLE TAGS</Label>
                <Input 
                  placeholder="minimal, luxury, streetwear"
                  value={form.style_tags}
                  onChange={e => updateForm('style_tags', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PAST BRAND COLLABORATIONS</Label>
                <Textarea 
                  placeholder="Nike, Zara, H&M"
                  value={form.past_collaborations}
                  onChange={e => updateForm('past_collaborations', e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">LANGUAGES</Label>
                <Input 
                  placeholder="English, Hindi"
                  value={form.languages}
                  onChange={e => updateForm('languages', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">PORTFOLIO URL</Label>
                <Input 
                  placeholder="https://..."
                  value={form.portfolio_url}
                  onChange={e => updateForm('portfolio_url', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">NOTES</Label>
                <Textarea 
                  placeholder="Internal notes..."
                  value={form.notes}
                  onChange={e => updateForm('notes', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Finance & Payments Tab */}
        <TabsContent value="finance">
        <div className="grid grid-cols-3 gap-6">
          {/* Payment Summary & Actions */}
          <div className="col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(paymentSummary.total_paid)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-600">{formatCurrency(paymentSummary.total_pending)}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Pending</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Transactions</div>
                </CardContent>
              </Card>
            </div>

            {/* Payments List */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Payment History
                </CardTitle>
                <Button 
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                  data-testid="create-payment-btn"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Payment
                </Button>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No payment records yet</p>
                    <p className="text-gray-400 text-sm mt-1">Create a payment to track financial transactions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map(payment => (
                      <div key={payment.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50" data-testid={`payment-row-${payment.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              payment.status === 'completed' ? 'bg-green-100' :
                              payment.status === 'processing' ? 'bg-blue-100' :
                              payment.status === 'approved' ? 'bg-purple-100' :
                              'bg-amber-100'
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                payment.status === 'completed' ? 'text-green-600' :
                                payment.status === 'processing' ? 'text-blue-600' :
                                payment.status === 'approved' ? 'text-purple-600' :
                                'text-amber-600'
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                              <div className="text-sm text-gray-500 capitalize">{payment.payment_type?.replace('_', ' ')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              payment.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                              payment.status === 'approved' ? 'bg-purple-100 text-purple-700' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {payment.status}
                            </Badge>
                            <span className="text-xs text-gray-400">{formatDate(payment.created_at)}</span>
                          </div>
                        </div>
                        {payment.description && (
                          <p className="text-sm text-gray-600 mb-2">{payment.description}</p>
                        )}
                        {payment.campaign_name && (
                          <div className="text-xs text-gray-500 mb-2">
                            <Target className="w-3 h-3 inline mr-1" />
                            Campaign: {payment.campaign_name}
                          </div>
                        )}
                        {/* Payment Actions */}
                        {payment.status === 'pending' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                            <Button size="sm" variant="outline" onClick={() => handleUpdatePaymentStatus(payment.id, 'approved')} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdatePaymentStatus(payment.id, 'completed')} className="text-green-600 border-green-200 hover:bg-green-50">
                              Mark Paid
                            </Button>
                          </div>
                        )}
                        {payment.status === 'approved' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                            <Button size="sm" variant="outline" onClick={() => handleUpdatePaymentStatus(payment.id, 'processing')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              Start Processing
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdatePaymentStatus(payment.id, 'completed')} className="text-green-600 border-green-200 hover:bg-green-50">
                              Mark Paid
                            </Button>
                          </div>
                        )}
                        {payment.status === 'processing' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                            <Button size="sm" variant="outline" onClick={() => handleUpdatePaymentStatus(payment.id, 'completed')} className="text-green-600 border-green-200 hover:bg-green-50">
                              Mark Completed
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Campaign Budget & Quick Stats */}
          <div className="space-y-4">
            {/* Campaign Budget */}
            {assignedCampaign && campaigns.find(c => c.id === assignedCampaign) && (
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    Campaign Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const campaign = campaigns.find(c => c.id === assignedCampaign);
                    const budgetUsed = (campaign.spent / campaign.budget) * 100;
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{campaign.name}</div>
                          <Badge className="mt-1 capitalize">{campaign.status}</Badge>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Budget</span>
                            <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Spent</span>
                            <span className="font-medium text-amber-600">{formatCurrency(campaign.spent)}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-amber-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1 text-right">{Math.round(budgetUsed)}% used</div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Rate Card Summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rate Card Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {form.deliverables.slice(0, 4).map(d => (
                    <div key={d.id} className="flex justify-between text-sm">
                      <span className="text-gray-500">{d.name}</span>
                      <span className="font-medium">{d.price ? formatCurrency(parseFloat(d.price)) : '-'}</span>
                    </div>
                  ))}
                </div>
                {form.deliverables.length > 4 && (
                  <p className="text-xs text-gray-400 mt-2">+{form.deliverables.length - 4} more deliverables</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowPaymentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Payment
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('rates')}>
                  <DollarSign className="w-4 h-4 mr-2" /> Edit Rate Card
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
        <div className="grid grid-cols-3 gap-6">
          {/* Unified Activity Timeline */}
          <Card className="col-span-2 bg-white border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Activity Timeline
                </span>
                <Badge variant="outline">{activities.length} events</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No activity recorded yet</p>
                  <p className="text-gray-400 text-xs mt-1">Send an outreach message to get started</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {activities.map((activity, idx) => (
                      <div key={idx} className="relative flex gap-4 pl-10" data-testid={`activity-item-${idx}`}>
                        {/* Timeline Dot */}
                        <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                          activity.type === 'communication' ? 'bg-blue-500' :
                          activity.type === 'deal' ? 'bg-green-500' :
                          activity.type === 'gift' ? 'bg-purple-500' :
                          'bg-gray-400'
                        }`}>
                          {activity.type === 'communication' && (
                            activity.icon === 'whatsapp' ? 
                              <MessageSquare className="w-3 h-3 text-white" /> : 
                              <Mail className="w-3 h-3 text-white" />
                          )}
                          {activity.type === 'deal' && <DollarSign className="w-3 h-3 text-white" />}
                          {activity.type === 'gift' && <Sparkles className="w-3 h-3 text-white" />}
                        </div>
                        
                        {/* Activity Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs capitalize ${
                                activity.type === 'communication' ? 'border-blue-200 text-blue-600' :
                                activity.type === 'deal' ? 'border-green-200 text-green-600' :
                                'border-purple-200 text-purple-600'
                              }`}>
                                {activity.type}
                              </Badge>
                              {activity.status && (
                                <Badge className="text-xs bg-gray-100 text-gray-600">{activity.status}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">{formatDate(activity.date)}</span>
                          </div>
                          <div className="font-medium text-gray-900 text-sm">{activity.title}</div>
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Sidebar */}
          <div className="space-y-4">
            {/* Communications Summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    Communications
                  </span>
                  <Badge variant="outline">{communications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {communications.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No messages sent</p>
                ) : (
                  <div className="space-y-2">
                    {communications.slice(0, 3).map(comm => (
                      <div key={comm.id} className="p-2 border border-gray-100 rounded hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize text-xs">{comm.comm_type || 'email'}</Badge>
                          <span className="text-xs text-gray-400">{formatDate(comm.sent_at || comm.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{comm.subject || comm.message?.substring(0, 40)}</p>
                      </div>
                    ))}
                    {communications.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">+{communications.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deals Summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Deals
                  </span>
                  <Badge variant="outline">{deals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deals.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No deals yet</p>
                ) : (
                  <div className="space-y-2">
                    {deals.slice(0, 3).map(deal => (
                      <div key={deal.id} className="p-2 border border-gray-100 rounded hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Badge className={deal.status === 'agreed' ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-700 text-xs'}>{deal.status || 'pending'}</Badge>
                          <span className="text-xs font-medium">₹{(deal.initial_quote || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gifts Summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Gifts
                  </span>
                  <Badge variant="outline">{gifts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gifts.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No gifts sent</p>
                ) : (
                  <div className="space-y-2">
                    {gifts.slice(0, 3).map(gift => (
                      <div key={gift.id} className="p-2 border border-gray-100 rounded hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 truncate">{gift.product_name}</span>
                          <Badge className={
                            gift.status === 'posted' ? 'bg-green-100 text-green-700 text-xs' : 
                            gift.status === 'delivered' ? 'bg-blue-100 text-blue-700 text-xs' : 
                            'bg-gray-100 text-gray-700 text-xs'
                          }>{gift.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>
      </Tabs>

      {/* Send Outreach Modal */}
      <Dialog open={showOutreachModal} onOpenChange={setShowOutreachModal}>
        <DialogContent className="max-w-lg" data-testid="outreach-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Send Outreach to {form.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Send a collaboration message via email or WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Channel Selection */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">CHANNEL</Label>
              <div className="flex gap-2">
                <Button
                  variant={outreachChannel === 'email' ? 'default' : 'outline'}
                  className={outreachChannel === 'email' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => setOutreachChannel('email')}
                  data-testid="channel-email-btn"
                >
                  <Mail className="w-4 h-4 mr-2" /> Email
                </Button>
                <Button
                  variant={outreachChannel === 'whatsapp' ? 'default' : 'outline'}
                  className={outreachChannel === 'whatsapp' ? 'bg-green-500 hover:bg-green-600' : ''}
                  onClick={() => setOutreachChannel('whatsapp')}
                  data-testid="channel-whatsapp-btn"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {outreachChannel === 'email' 
                  ? `Will send to: ${form.email || 'No email on file'}` 
                  : `Will send to: ${form.phone || 'No phone on file'}`}
              </p>
              {outreachChannel === 'whatsapp' && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  <strong>Note:</strong> Recipient must first join Twilio sandbox by sending "join kill-ranch" to +1 415 523 8886 on WhatsApp.
                </div>
              )}
            </div>
            
            {/* Template Selection */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">TEMPLATE</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={outreachForm.template === 'collaboration' ? 'default' : 'outline'}
                  onClick={() => applyTemplate('collaboration')}
                  className="text-xs"
                  data-testid="template-collaboration-btn"
                >
                  Collaboration
                </Button>
                <Button
                  size="sm"
                  variant={outreachForm.template === 'followup' ? 'default' : 'outline'}
                  onClick={() => applyTemplate('followup')}
                  className="text-xs"
                  data-testid="template-followup-btn"
                >
                  Follow Up
                </Button>
                <Button
                  size="sm"
                  variant={outreachForm.template === 'campaign' ? 'default' : 'outline'}
                  onClick={() => applyTemplate('campaign')}
                  className="text-xs"
                  data-testid="template-campaign-btn"
                >
                  Campaign Invite
                </Button>
                <Button
                  size="sm"
                  variant={outreachForm.template === 'custom' ? 'default' : 'outline'}
                  onClick={() => setOutreachForm(prev => ({ ...prev, template: 'custom', subject: '', message: '' }))}
                  className="text-xs"
                  data-testid="template-custom-btn"
                >
                  Custom
                </Button>
              </div>
            </div>
            
            {/* Subject (Email only) */}
            {outreachChannel === 'email' && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">SUBJECT</Label>
                <Input
                  placeholder="Email subject line..."
                  value={outreachForm.subject}
                  onChange={e => setOutreachForm(prev => ({ ...prev, subject: e.target.value }))}
                  data-testid="outreach-subject-input"
                />
              </div>
            )}
            
            {/* Message */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">MESSAGE</Label>
              <Textarea
                placeholder="Type your message..."
                value={outreachForm.message}
                onChange={e => setOutreachForm(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                data-testid="outreach-message-input"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowOutreachModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendOutreach}
              disabled={sendingOutreach || !outreachForm.message || (outreachChannel === 'email' && !form.email) || (outreachChannel === 'whatsapp' && !form.phone)}
              className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
              data-testid="send-outreach-submit-btn"
            >
              {sendingOutreach ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send {outreachChannel === 'email' ? 'Email' : 'WhatsApp'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md" data-testid="create-payment-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Create Payment for {form.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Record a payment for this influencer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">AMOUNT (₹) *</Label>
              <Input 
                type="number"
                value={newPayment.amount}
                onChange={e => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="50000"
                className="mt-1"
                data-testid="payment-amount-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">PAYMENT TYPE</Label>
              <Select value={newPayment.payment_type} onValueChange={v => setNewPayment(prev => ({ ...prev, payment_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer_fee">Influencer Fee</SelectItem>
                  <SelectItem value="bonus">Performance Bonus</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="advance">Advance Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
              <Textarea 
                value={newPayment.description}
                onChange={e => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Payment for Instagram posts..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">INVOICE #</Label>
                <Input 
                  value={newPayment.invoice_number}
                  onChange={e => setNewPayment(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="INV-001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">DUE DATE</Label>
                <Input 
                  type="date"
                  value={newPayment.due_date}
                  onChange={e => setNewPayment(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            {assignedCampaign && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs text-amber-600 uppercase tracking-wider mb-1">Linked to Campaign</div>
                <div className="font-medium text-amber-800">{campaigns.find(c => c.id === assignedCampaign)?.name}</div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePayment}
              disabled={creatingPayment || !newPayment.amount}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="submit-payment-btn"
            >
              {creatingPayment ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencerDetailPage;
