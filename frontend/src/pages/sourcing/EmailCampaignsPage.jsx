import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { 
  Mail, Send, Users, History, CheckCircle2, AlertCircle, 
  Plus, Loader2, FileText, Eye, BarChart3, Clock,
  ChevronRight, Building2, ExternalLink, Trash2, RefreshCw
} from 'lucide-react';

const EmailCampaignsPage = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [brands, setBrands] = useState([]);
  const [outreachLogs, setOutreachLogs] = useState([]);
  
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
    selected_brands: []
  });
  
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statusRes, campaignsRes, templatesRes, brandsRes, logsRes] = await Promise.all([
        api.get('/sourcing/campaigns/status'),
        api.get('/sourcing/campaigns'),
        api.get('/sourcing/templates'),
        api.get('/sourcing/brands?limit=500'),
        api.get('/sourcing/campaigns/logs/recent?limit=50')
      ]);
      setServiceStatus(statusRes.data);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setBrands(brandsRes.data);
      setOutreachLogs(logsRes.data);
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
    
    if (bulkEmailForm.selected_brands.length === 0) {
      toast.error('Please select at least one brand');
      return;
    }
    
    setSending(true);
    try {
      // Build recipients list from selected brands
      const recipients = bulkEmailForm.selected_brands.map(brandId => {
        const brand = brands.find(b => b.id === brandId);
        return {
          email: brand?.email || brand?.contact_email,
          name: brand?.founder_name || brand?.name,
          brand_id: brandId
        };
      }).filter(r => r.email);
      
      if (recipients.length === 0) {
        toast.error('Selected brands have no email addresses');
        return;
      }
      
      await api.post('/sourcing/campaigns/send-bulk', {
        campaign_name: bulkEmailForm.campaign_name,
        subject: bulkEmailForm.subject,
        content: bulkEmailForm.content,
        template_id: bulkEmailForm.template_id,
        recipients
      });
      
      toast.success(`Campaign sent to ${recipients.length} recipients`);
      setShowBulkEmail(false);
      setBulkEmailForm({ campaign_name: '', subject: '', content: '', template_id: '', selected_brands: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

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
          {/* Service Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            serviceStatus?.configured ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {serviceStatus?.configured ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {serviceStatus?.configured ? 'SendGrid Ready' : 'Not Configured'}
            </span>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-gray-500">Total Campaigns</p>
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
                <p className="text-sm text-gray-500">Brands with Email</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No templates yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium">{template.name}</h3>
                          <Badge variant="outline">{template.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{template.subject}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{template.content?.slice(0, 100)}...</p>
                        {template.variables?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variables.map(v => (
                              <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Name</label>
                <Input
                  value={singleEmailForm.to_name}
                  onChange={(e) => setSingleEmailForm(prev => ({ ...prev, to_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Use Template</label>
              <Select 
                value={singleEmailForm.template_id || 'none'} 
                onValueChange={(v) => handleTemplateSelect(v === 'none' ? '' : v, 'single')}
              >
                <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
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
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Content *</label>
              <Textarea
                value={singleEmailForm.content}
                onChange={(e) => setSingleEmailForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your email content here..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSingleEmail(false)}>Cancel</Button>
            <Button onClick={sendSingleEmail} disabled={sending} className="bg-orange-600 hover:bg-orange-700">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmail} onOpenChange={setShowBulkEmail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Create Bulk Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name *</label>
                <Input
                  value={bulkEmailForm.campaign_name}
                  onChange={(e) => setBulkEmailForm(prev => ({ ...prev, campaign_name: e.target.value }))}
                  placeholder="Q1 Brand Outreach"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Use Template</label>
                <Select 
                  value={bulkEmailForm.template_id || 'none'} 
                  onValueChange={(v) => handleTemplateSelect(v === 'none' ? '' : v, 'bulk')}
                >
                  <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
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
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Content *</label>
              <Textarea
                value={bulkEmailForm.content}
                onChange={(e) => setBulkEmailForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your email content here..."
                rows={6}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Brands ({bulkEmailForm.selected_brands.length} selected)
              </label>
              <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
                {brandsWithEmail.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">No brands with email addresses found</p>
                ) : (
                  brandsWithEmail.map(brand => (
                    <div 
                      key={brand.id} 
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        bulkEmailForm.selected_brands.includes(brand.id) ? 'bg-orange-50' : ''
                      }`}
                      onClick={() => {
                        setBulkEmailForm(prev => ({
                          ...prev,
                          selected_brands: prev.selected_brands.includes(brand.id)
                            ? prev.selected_brands.filter(id => id !== brand.id)
                            : [...prev.selected_brands, brand.id]
                        }));
                      }}
                    >
                      <Checkbox checked={bulkEmailForm.selected_brands.includes(brand.id)} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{brand.name}</div>
                        <div className="text-xs text-gray-500">{brand.email || brand.contact_email}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">{brand.pipeline_stage}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmail(false)}>Cancel</Button>
            <Button 
              onClick={sendBulkEmail} 
              disabled={sending || bulkEmailForm.selected_brands.length === 0} 
              className="bg-orange-600 hover:bg-orange-700"
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send to {bulkEmailForm.selected_brands.length} Brands
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
    </div>
  );
};

export default EmailCampaignsPage;
