import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { 
  Mail, Send, Users, History, CheckCircle2, AlertCircle, 
  Plus, Loader2, FileText, Eye, BarChart3, Clock,
  ChevronRight, Building2, ExternalLink, Trash2, RefreshCw,
  Search, X, Package, Filter, Edit, Copy, Tag
} from 'lucide-react';

// Template type/category configuration
const TEMPLATE_CATEGORIES = {
  email: { label: 'Email', color: 'bg-blue-100 text-blue-700', icon: Mail },
  introduction: { label: 'Introduction', color: 'bg-green-100 text-green-700', icon: Users },
  follow_up: { label: 'Follow-up', color: 'bg-amber-100 text-amber-700', icon: RefreshCw },
  partnership: { label: 'Partnership', color: 'bg-purple-100 text-purple-700', icon: Building2 },
  sample_request: { label: 'Sample Request', color: 'bg-pink-100 text-pink-700', icon: Package },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700', icon: Send }
};

const EmailCampaignsPage = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [outreachLogs, setOutreachLogs] = useState([]);
  const [sourcingSettings, setSourcingSettings] = useState(null);
  
  // Modal states
  const [showSingleEmail, setShowSingleEmail] = useState(false);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showCampaignDetail, setShowCampaignDetail] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  // Form states
  const [singleEmailForm, setSingleEmailForm] = useState({
    to_email: '',
    to_name: '',
    subject: '',
    content: '',
    brand_id: '',
    template_id: ''
  });
  
  const [bulkEmailForm, setBulkEmailForm] = useState({
    campaign_name: '',
    subject: '',
    content: '',
    template_id: '',
    recipient_type: 'brands', // 'brands' or 'suppliers'
    selected_recipients: [],
    search_query: '',
    filter_stage: ''
  });
  
  const [sending, setSending] = useState(false);

  // Template CRUD state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'email',
    subject: '',
    content: '',
    variables: []
  });
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateFilterCategory, setTemplateFilterCategory] = useState('all');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statusRes, campaignsRes, templatesRes, brandsRes, suppliersRes, logsRes, settingsRes] = await Promise.all([
        api.get('/sourcing/campaigns/status'),
        api.get('/sourcing/campaigns'),
        api.get('/sourcing/templates'),
        api.get('/sourcing/brands?limit=500'),
        api.get('/sourcing/suppliers?limit=500'),
        api.get('/sourcing/campaigns/logs/recent?limit=50'),
        api.get('/sourcing/settings')
      ]);
      setServiceStatus(statusRes.data);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setBrands(brandsRes.data);
      setSuppliers(suppliersRes.data);
      setOutreachLogs(logsRes.data);
      setSourcingSettings(settingsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load campaigns data');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId, formType) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      if (formType === 'single') {
        setSingleEmailForm(prev => ({
          ...prev,
          template_id: templateId,
          subject: template.subject || prev.subject,
          content: template.content || prev.content
        }));
      } else {
        setBulkEmailForm(prev => ({
          ...prev,
          template_id: templateId,
          subject: template.subject || prev.subject,
          content: template.content || prev.content
        }));
      }
    }
  };

  const sendSingleEmail = async () => {
    if (!singleEmailForm.to_email || !singleEmailForm.subject || !singleEmailForm.content) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSending(true);
    try {
      await api.post('/sourcing/campaigns/send-single', singleEmailForm);
      toast.success(`Email sent to ${singleEmailForm.to_email}`);
      setShowSingleEmail(false);
      setSingleEmailForm({ to_email: '', to_name: '', subject: '', content: '', brand_id: '', template_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const sendBulkEmail = async () => {
    if (!bulkEmailForm.campaign_name || !bulkEmailForm.subject || !bulkEmailForm.content) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (bulkEmailForm.selected_recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    
    setSending(true);
    try {
      // Build recipients list based on recipient type
      const sourceList = bulkEmailForm.recipient_type === 'brands' ? brands : suppliers;
      const recipients = bulkEmailForm.selected_recipients.map(recipientId => {
        const entity = sourceList.find(e => e.id === recipientId);
        return {
          email: entity?.email || entity?.contact_email,
          name: entity?.founder_name || entity?.name,
          brand_id: bulkEmailForm.recipient_type === 'brands' ? recipientId : null
        };
      }).filter(r => r.email);
      
      if (recipients.length === 0) {
        toast.error('Selected recipients have no email addresses');
        return;
      }
      
      await api.post('/sourcing/campaigns/send-bulk', {
        campaign_name: bulkEmailForm.campaign_name,
        subject: bulkEmailForm.subject,
        content: bulkEmailForm.content,
        template_id: bulkEmailForm.template_id,
        recipients
      });
      
      toast.success(`Campaign sent to ${recipients.length} recipients via Outlook`);
      setShowBulkEmail(false);
      setBulkEmailForm({ 
        campaign_name: '', subject: '', content: '', template_id: '', 
        recipient_type: 'brands', selected_recipients: [], search_query: '', filter_stage: '' 
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  // Filtered recipients for bulk email modal
  const filteredRecipients = useMemo(() => {
    const sourceList = bulkEmailForm.recipient_type === 'brands' ? brands : suppliers;
    return sourceList.filter(item => {
      // Must have email
      const hasEmail = item.email || item.contact_email;
      if (!hasEmail) return false;
      
      // Search filter
      if (bulkEmailForm.search_query) {
        const query = bulkEmailForm.search_query.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const emailMatch = (item.email || item.contact_email)?.toLowerCase().includes(query);
        const cityMatch = item.city?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !cityMatch) return false;
      }
      
      // Stage filter
      if (bulkEmailForm.filter_stage && item.pipeline_stage !== bulkEmailForm.filter_stage) {
        return false;
      }
      
      return true;
    });
  }, [brands, suppliers, bulkEmailForm.recipient_type, bulkEmailForm.search_query, bulkEmailForm.filter_stage]);

  // Get unique pipeline stages for filter dropdown
  const pipelineStages = useMemo(() => {
    const sourceList = bulkEmailForm.recipient_type === 'brands' ? brands : suppliers;
    const stages = [...new Set(sourceList.map(item => item.pipeline_stage).filter(Boolean))];
    return stages.sort();
  }, [brands, suppliers, bulkEmailForm.recipient_type]);

  const viewCampaignDetail = async (campaign) => {
    try {
      const [detailRes, statsRes] = await Promise.all([
        api.get(`/sourcing/campaigns/${campaign.id}`),
        api.get(`/sourcing/campaigns/${campaign.id}/stats`)
      ]);
      setSelectedCampaign({ ...detailRes.data, stats: statsRes.data });
      setShowCampaignDetail(true);
    } catch (error) {
      toast.error('Failed to load campaign details');
    }
  };

  // =====================
  // TEMPLATE CRUD HANDLERS
  // =====================

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', type: 'email', subject: '', content: '', variables: [] });
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name || '',
      type: template.type || 'email',
      subject: template.subject || '',
      content: template.content || '',
      variables: template.variables || []
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!templateForm.content.trim()) {
      toast.error('Template content is required');
      return;
    }

    setSavingTemplate(true);
    try {
      // Extract variables from content ({{variable_name}} format)
      const variableMatches = templateForm.content.match(/\{\{(\w+)\}\}/g) || [];
      const extractedVars = [...new Set(variableMatches.map(v => v.replace(/[{}]/g, '')))];

      const payload = {
        ...templateForm,
        variables: extractedVars
      };

      if (editingTemplate) {
        await api.put(`/sourcing/templates/${editingTemplate.id}`, payload);
        toast.success('Template updated successfully');
      } else {
        await api.post('/sourcing/templates', payload);
        toast.success('Template created successfully');
      }

      setShowTemplateModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/sourcing/templates/${templateId}`);
      toast.success('Template deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const payload = {
        name: `${template.name} (Copy)`,
        type: template.type,
        subject: template.subject,
        content: template.content,
        variables: template.variables || []
      };
      await api.post('/sourcing/templates', payload);
      toast.success('Template duplicated');
      fetchData();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Category filter
      if (templateFilterCategory !== 'all' && template.type !== templateFilterCategory) {
        return false;
      }
      // Search filter
      if (templateSearchQuery) {
        const query = templateSearchQuery.toLowerCase();
        const nameMatch = template.name?.toLowerCase().includes(query);
        const subjectMatch = template.subject?.toLowerCase().includes(query);
        const contentMatch = template.content?.toLowerCase().includes(query);
        if (!nameMatch && !subjectMatch && !contentMatch) return false;
      }
      return true;
    });
  }, [templates, templateFilterCategory, templateSearchQuery]);

  // Template counts by category
  const templateCounts = useMemo(() => {
    const counts = { all: templates.length };
    Object.keys(TEMPLATE_CATEGORIES).forEach(key => {
      counts[key] = templates.filter(t => t.type === key).length;
    });
    return counts;
  }, [templates]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Get brands with emails for bulk selection
  const brandsWithEmail = brands.filter(b => b.email || b.contact_email);
  const suppliersWithEmail = suppliers.filter(s => s.email || s.contact_email);
  
  // Get the configured sender email from settings
  const senderEmail = sourcingSettings?.email?.fromEmail || 'seller@sevora.com';

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="email-campaigns-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Mail className="h-8 w-8 text-orange-500" /> Email Campaigns
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Service Status - Outlook */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Mail className="h-5 w-5" />
            <span className="text-sm font-medium">Outlook Connected</span>
            <span className="text-xs text-blue-500">({senderEmail})</span>
          </div>
          
          <Button onClick={() => setShowSingleEmail(true)} variant="outline" className="border-[#E8D5C4] text-[#4A3728] hover:bg-[#E8D5C4]/50">
            <Send className="h-4 w-4 mr-2" /> Single Email
          </Button>
          <Button onClick={() => setShowBulkEmail(true)} className="bg-orange-600 hover:bg-orange-700">
            <Users className="h-4 w-4 mr-2" /> Bulk Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-gray-500">Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{brandsWithEmail.length}</p>
                <p className="text-sm text-gray-500">Brands</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suppliersWithEmail.length}</p>
                <p className="text-sm text-gray-500">Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-gray-500">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Activity
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No campaigns yet</p>
                  <Button onClick={() => setShowBulkEmail(true)} variant="outline" className="mt-2">
                    Create your first campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(campaign => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => viewCampaignDetail(campaign)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-gray-500">
                            {campaign.recipients_count} recipients • {campaign.subject?.slice(0, 50)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(campaign.status)} variant="secondary">
                          {campaign.status}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Outreach Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {outreachLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No outreach activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outreachLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.status === 'sent' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {log.status === 'sent' ? 
                            <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <div className="text-sm font-medium">{log.to_email}</div>
                          <div className="text-xs text-gray-500">{log.subject?.slice(0, 40)}...</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(log.sent_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-4">
            {/* Templates Header with Search, Filter, and Create */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search templates..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        data-testid="template-search"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <Select value={templateFilterCategory} onValueChange={setTemplateFilterCategory}>
                      <SelectTrigger className="w-48" data-testid="template-category-filter">
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({templateCounts.all})</SelectItem>
                        {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label} ({templateCounts[key] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={openCreateTemplateModal} className="bg-orange-600 hover:bg-orange-700" data-testid="create-template-btn">
                    <Plus className="h-4 w-4 mr-2" /> Create Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={templateFilterCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTemplateFilterCategory('all')}
              >
                All ({templateCounts.all})
              </Button>
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={key}
                    variant={templateFilterCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemplateFilterCategory(key)}
                    className={templateFilterCategory === key ? '' : config.color}
                  >
                    <IconComponent className="h-3 w-3 mr-1" />
                    {config.label} ({templateCounts[key] || 0})
                  </Button>
                );
              })}
            </div>

            {/* Templates Grid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Email Templates
                  <Badge variant="secondary">{filteredTemplates.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">
                      {templates.length === 0 ? 'No templates yet' : 'No templates match your filters'}
                    </p>
                    <p className="text-sm mb-4">
                      {templates.length === 0 
                        ? 'Create your first email template to speed up your outreach'
                        : 'Try adjusting your search or category filter'}
                    </p>
                    {templates.length === 0 && (
                      <Button onClick={openCreateTemplateModal} className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-2" /> Create First Template
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => {
                      const categoryConfig = TEMPLATE_CATEGORIES[template.type] || TEMPLATE_CATEGORIES.email;
                      return (
                        <Card key={template.id} className="hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: template.type === 'introduction' ? '#22c55e' : template.type === 'follow_up' ? '#f59e0b' : template.type === 'partnership' ? '#a855f7' : template.type === 'sample_request' ? '#ec4899' : '#3b82f6' }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                                <Badge className={`mt-1 text-xs ${categoryConfig.color}`}>
                                  {categoryConfig.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowTemplatePreview(template)} title="Preview">
                                  <Eye className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditTemplateModal(template)} title="Edit">
                                  <Edit className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDuplicateTemplate(template)} title="Duplicate">
                                  <Copy className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteTemplate(template.id)} title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {template.subject && (
                              <p className="text-sm text-gray-600 mb-2 font-medium">
                                📧 {template.subject}
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500 line-clamp-3 mb-3">
                              {template.content?.slice(0, 150)}...
                            </p>
                            
                            {template.variables?.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-2 border-t">
                                {template.variables.slice(0, 4).map(v => (
                                  <Badge key={v} variant="outline" className="text-xs bg-gray-50">
                                    {`{{${v}}}`}
                                  </Badge>
                                ))}
                                {template.variables.length > 4 && (
                                  <Badge variant="outline" className="text-xs bg-gray-50">
                                    +{template.variables.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Single Email Dialog */}
      <Dialog open={showSingleEmail} onOpenChange={setShowSingleEmail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> Send Single Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Email *</label>
                <Input
                  type="email"
                  value={singleEmailForm.to_email}
                  onChange={(e) => setSingleEmailForm(prev => ({ ...prev, to_email: e.target.value }))}
                  placeholder="email@example.com"
                  data-testid="single-to-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Name</label>
                <Input
                  value={singleEmailForm.to_name}
                  onChange={(e) => setSingleEmailForm(prev => ({ ...prev, to_name: e.target.value }))}
                  placeholder="John Doe"
                  data-testid="single-to-name"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Use Template</label>
              <Select 
                value={singleEmailForm.template_id || 'none'} 
                onValueChange={(v) => handleTemplateSelect(v === 'none' ? '' : v, 'single')}
              >
                <SelectTrigger data-testid="single-template-select"><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Subject *</label>
              <Input
                value={singleEmailForm.subject}
                onChange={(e) => setSingleEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="single-subject"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Content *</label>
              <Textarea
                value={singleEmailForm.content}
                onChange={(e) => setSingleEmailForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your email content here..."
                rows={8}
                data-testid="single-content"
              />
            </div>
            
            {/* Sender Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <span className="text-gray-600">Sending from: </span>
                <span className="font-medium text-blue-700">{senderEmail}</span>
                <span className="text-gray-500 ml-2">(via Outlook)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSingleEmail(false)}>Cancel</Button>
            <Button onClick={sendSingleEmail} disabled={sending} className="bg-orange-600 hover:bg-orange-700" data-testid="send-single-btn">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmail} onOpenChange={setShowBulkEmail}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Create Bulk Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Campaign Info Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name *</label>
                <Input
                  value={bulkEmailForm.campaign_name}
                  onChange={(e) => setBulkEmailForm(prev => ({ ...prev, campaign_name: e.target.value }))}
                  placeholder="Q1 Brand Outreach"
                  data-testid="bulk-campaign-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Use Template</label>
                <Select 
                  value={bulkEmailForm.template_id || 'none'} 
                  onValueChange={(v) => handleTemplateSelect(v === 'none' ? '' : v, 'bulk')}
                >
                  <SelectTrigger data-testid="bulk-template-select"><SelectValue placeholder="Select a template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Subject *</label>
              <Input
                value={bulkEmailForm.subject}
                onChange={(e) => setBulkEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="bulk-subject"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Content *</label>
              <Textarea
                value={bulkEmailForm.content}
                onChange={(e) => setBulkEmailForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your email content here..."
                rows={6}
                data-testid="bulk-content"
              />
            </div>
            
            {/* Recipient Selection Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Select Recipients ({bulkEmailForm.selected_recipients.length} selected)
                </label>
                
                {/* Recipient Type Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={bulkEmailForm.recipient_type === 'brands' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBulkEmailForm(prev => ({ 
                      ...prev, 
                      recipient_type: 'brands', 
                      selected_recipients: [],
                      filter_stage: ''
                    }))}
                    data-testid="select-brands-btn"
                  >
                    <Building2 className="h-4 w-4 mr-1" /> Brands ({brandsWithEmail.length})
                  </Button>
                  <Button
                    variant={bulkEmailForm.recipient_type === 'suppliers' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBulkEmailForm(prev => ({ 
                      ...prev, 
                      recipient_type: 'suppliers', 
                      selected_recipients: [],
                      filter_stage: ''
                    }))}
                    data-testid="select-suppliers-btn"
                  >
                    <Package className="h-4 w-4 mr-1" /> Suppliers ({suppliersWithEmail.length})
                  </Button>
                </div>
              </div>
              
              {/* Search and Filter Row */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder={`Search ${bulkEmailForm.recipient_type}...`}
                    value={bulkEmailForm.search_query}
                    onChange={(e) => setBulkEmailForm(prev => ({ ...prev, search_query: e.target.value }))}
                    data-testid="recipient-search"
                  />
                </div>
                <Select 
                  value={bulkEmailForm.filter_stage || 'all'} 
                  onValueChange={(v) => setBulkEmailForm(prev => ({ ...prev, filter_stage: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="w-48" data-testid="stage-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {pipelineStages.map(stage => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Select All / Clear */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allIds = filteredRecipients.map(r => r.id);
                    const allSelected = allIds.every(id => bulkEmailForm.selected_recipients.includes(id));
                    setBulkEmailForm(prev => ({
                      ...prev,
                      selected_recipients: allSelected ? [] : allIds
                    }));
                  }}
                  data-testid="select-all-btn"
                >
                  {filteredRecipients.length > 0 && 
                   filteredRecipients.every(r => bulkEmailForm.selected_recipients.includes(r.id)) 
                    ? 'Clear All' : 'Select All'}
                </Button>
              </div>
              
              {/* Recipients List */}
              <div className="border rounded-lg bg-white max-h-60 overflow-y-auto">
                {filteredRecipients.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">
                    No {bulkEmailForm.recipient_type} with email addresses found
                  </p>
                ) : (
                  filteredRecipients.map(recipient => (
                    <div 
                      key={recipient.id} 
                      className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        bulkEmailForm.selected_recipients.includes(recipient.id) ? 'bg-orange-50' : ''
                      }`}
                      onClick={() => {
                        setBulkEmailForm(prev => ({
                          ...prev,
                          selected_recipients: prev.selected_recipients.includes(recipient.id)
                            ? prev.selected_recipients.filter(id => id !== recipient.id)
                            : [...prev.selected_recipients, recipient.id]
                        }));
                      }}
                      data-testid={`recipient-${recipient.id}`}
                    >
                      <Checkbox 
                        checked={bulkEmailForm.selected_recipients.includes(recipient.id)} 
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{recipient.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {recipient.email || recipient.contact_email}
                          {recipient.city && ` • ${recipient.city}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {recipient.pipeline_stage || 'No Stage'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              
              {/* Selection Summary */}
              {bulkEmailForm.selected_recipients.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>
                    {bulkEmailForm.selected_recipients.length} {bulkEmailForm.recipient_type} selected for outreach
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-red-600 hover:text-red-700"
                    onClick={() => setBulkEmailForm(prev => ({ ...prev, selected_recipients: [] }))}
                  >
                    <X className="h-4 w-4 mr-1" /> Clear Selection
                  </Button>
                </div>
              )}
            </div>
            
            {/* Sender Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <span className="text-gray-600">Sending from: </span>
                <span className="font-medium text-blue-700">{senderEmail}</span>
                <span className="text-gray-500 ml-2">(via Outlook)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmail(false)}>Cancel</Button>
            <Button 
              onClick={sendBulkEmail} 
              disabled={sending || bulkEmailForm.selected_recipients.length === 0} 
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="send-bulk-btn"
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send to {bulkEmailForm.selected_recipients.length} Recipients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showCampaignDetail} onOpenChange={setShowCampaignDetail}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Campaign Details
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{selectedCampaign.name}</h3>
                <Badge className={getStatusColor(selectedCampaign.status)} variant="secondary">
                  {selectedCampaign.status}
                </Badge>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedCampaign.stats?.total_recipients || 0}</p>
                    <p className="text-xs text-gray-500">Recipients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedCampaign.stats?.sent || 0}</p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{selectedCampaign.stats?.open_rate || 0}%</p>
                    <p className="text-xs text-gray-500">Open Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{selectedCampaign.stats?.reply_rate || 0}%</p>
                    <p className="text-xs text-gray-500">Reply Rate</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Email Content */}
              <div>
                <label className="text-sm font-medium text-gray-500">Subject</label>
                <p className="mt-1">{selectedCampaign.subject}</p>
              </div>
              
              {/* Outreach Logs */}
              {selectedCampaign.outreach_logs?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Recipients</label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {selectedCampaign.outreach_logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                        <div>
                          <p className="text-sm font-medium">{log.to_email}</p>
                          <p className="text-xs text-gray-500">{log.to_name}</p>
                        </div>
                        <Badge className={getStatusColor(log.status)} variant="secondary">
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Create/Edit Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Template Name *</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Brand Introduction"
                  className="mt-1"
                  data-testid="template-name-input"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Category *</Label>
                <Select 
                  value={templateForm.type} 
                  onValueChange={(v) => setTemplateForm(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="mt-1" data-testid="template-type-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Email Subject</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Partnership Opportunity with {{company_name}}"
                className="mt-1"
                data-testid="template-subject-input"
              />
              <p className="text-xs text-gray-500 mt-1">Use {"{{variable_name}}"} for dynamic values</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Email Content *</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Dear {{founder_name}},&#10;&#10;I hope this email finds you well..."
                rows={10}
                className="mt-1 font-mono text-sm"
                data-testid="template-content-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variables will be auto-detected. Available: {"{{founder_name}}, {{company_name}}, {{brand_name}}, {{category}}"}
              </p>
            </div>

            {/* Variable Preview */}
            {templateForm.content && (
              <div className="bg-gray-50 rounded-lg p-3">
                <Label className="text-xs uppercase tracking-wider text-gray-500">Detected Variables</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...new Set((templateForm.content.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/[{}]/g, '')))].map(v => (
                    <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                  ))}
                  {!(templateForm.content.match(/\{\{(\w+)\}\}/g) || []).length && (
                    <span className="text-xs text-gray-400">No variables detected</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={savingTemplate || !templateForm.name || !templateForm.content}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="save-template-btn"
            >
              {savingTemplate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={!!showTemplatePreview} onOpenChange={() => setShowTemplatePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview: {showTemplatePreview?.name}
            </DialogTitle>
          </DialogHeader>
          {showTemplatePreview && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={TEMPLATE_CATEGORIES[showTemplatePreview.type]?.color || 'bg-gray-100'}>
                  {TEMPLATE_CATEGORIES[showTemplatePreview.type]?.label || showTemplatePreview.type}
                </Badge>
                {showTemplatePreview.variables?.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {showTemplatePreview.variables.length} variables
                  </span>
                )}
              </div>

              {showTemplatePreview.subject && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Subject Line</Label>
                  <p className="mt-1 font-medium">{showTemplatePreview.subject}</p>
                </div>
              )}

              <div className="bg-white border rounded-lg p-4">
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Email Body</Label>
                <div className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg max-h-80 overflow-y-auto">
                  {showTemplatePreview.content}
                </div>
              </div>

              {showTemplatePreview.variables?.length > 0 && (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Variables Used</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {showTemplatePreview.variables.map(v => (
                      <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatePreview(null)}>Close</Button>
            <Button onClick={() => { openEditTemplateModal(showTemplatePreview); setShowTemplatePreview(null); }}>
              <Edit className="h-4 w-4 mr-2" /> Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailCampaignsPage;
