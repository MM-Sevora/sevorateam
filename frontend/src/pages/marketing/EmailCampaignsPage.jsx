import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  Mail, Plus, Send, Clock, CheckCircle, XCircle, Users, Edit2, Trash2,
  BarChart3, RefreshCw, Eye, Copy, Calendar, FileText, Target,
  TrendingUp, MousePointer, ExternalLink, Search, MoreHorizontal,
  Play, Pause, Archive
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  sending: { label: 'Sending', color: 'bg-yellow-100 text-yellow-700', icon: Send },
  sent: { label: 'Sent', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  paused: { label: 'Paused', color: 'bg-orange-100 text-orange-700', icon: Pause },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function EmailCampaignsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    from_name: '',
    from_email: '',
    template_id: '',
    recipient_list: 'all_contacts',
    scheduled_at: '',
    content: ''
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'general'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsRes, templatesRes] = await Promise.all([
        api.get('/marketing/v2/email-campaigns'),
        api.get('/marketing/v2/email-templates'),
      ]);
      setCampaigns(campaignsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch email campaigns:', error);
      // Set sample data for demo
      setCampaigns([
        {
          id: '1',
          name: 'Spring Sale Announcement',
          subject: 'Don\'t Miss Our Spring Sale! 🌸',
          status: 'sent',
          recipients: 1250,
          sent: 1248,
          opens: 687,
          clicks: 234,
          created_at: '2026-03-01',
          sent_at: '2026-03-05'
        },
        {
          id: '2',
          name: 'New Product Launch',
          subject: 'Introducing Our Latest Collection',
          status: 'scheduled',
          recipients: 2500,
          scheduled_at: '2026-03-20T10:00:00',
          created_at: '2026-03-10'
        },
        {
          id: '3',
          name: 'Weekly Newsletter',
          subject: 'This Week in Fashion',
          status: 'draft',
          recipients: 0,
          created_at: '2026-03-14'
        }
      ]);
      setTemplates([
        { id: '1', name: 'Product Announcement', category: 'marketing', subject: 'Introducing: {{product_name}}' },
        { id: '2', name: 'Newsletter', category: 'general', subject: 'Weekly Update from {{company_name}}' },
        { id: '3', name: 'Sale Promotion', category: 'promotional', subject: '{{discount}}% OFF - Limited Time!' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/marketing/v2/email-campaigns', newCampaign);
      toast.success('Email campaign created!');
      setShowCreateModal(false);
      setNewCampaign({ name: '', subject: '', from_name: '', from_email: '', template_id: '', recipient_list: 'all_contacts', scheduled_at: '', content: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/marketing/v2/email-templates', newTemplate);
      toast.success('Template created!');
      setShowTemplateModal(false);
      setNewTemplate({ name: '', subject: '', content: '', category: 'general' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Send this campaign now?')) return;
    try {
      await api.post(`/marketing/v2/email-campaigns/${campaignId}/send`);
      toast.success('Campaign is being sent!');
      fetchData();
    } catch (error) {
      toast.error('Failed to send campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/marketing/v2/email-campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.opens || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : 0;
  const avgClickRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : 0;

  return (
    <div className="p-8 space-y-6" data-testid="email-campaigns-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Email Campaigns</h1>
          <p className="text-[#5D4A3A] mt-1">Create and manage bulk email marketing campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#5D4A3A]" />
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{campaigns.length}</div>
                <div className="text-sm text-[#5D4A3A]">Total Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{totalSent.toLocaleString()}</div>
                <div className="text-sm text-green-600">Emails Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{avgOpenRate}%</div>
                <div className="text-sm text-blue-600">Open Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{avgClickRate}%</div>
                <div className="text-sm text-purple-600">Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-amber-700">{templates.length}</div>
                <div className="text-sm text-amber-600">Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Campaigns ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
                <p className="text-gray-500 mt-1">Create your first email campaign to get started</p>
                <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-[#c4a35a] hover:bg-[#b39349] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map(campaign => {
                const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                const StatusIcon = status.icon;
                return (
                  <Card key={campaign.id} className="hover:border-[#c4a35a]/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-[#4A3728]">{campaign.name}</div>
                            <div className="text-sm text-[#5D4A3A]">{campaign.subject}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {campaign.status === 'sent' && (
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <div className="font-medium text-[#4A3728]">{campaign.sent?.toLocaleString()}</div>
                                <div className="text-xs text-[#5D4A3A]">Sent</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-blue-600">{campaign.opens?.toLocaleString()}</div>
                                <div className="text-xs text-[#5D4A3A]">Opens</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-green-600">{campaign.clicks?.toLocaleString()}</div>
                                <div className="text-xs text-[#5D4A3A]">Clicks</div>
                              </div>
                            </div>
                          )}
                          {campaign.status === 'scheduled' && (
                            <div className="text-sm text-[#5D4A3A] flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(campaign.scheduled_at).toLocaleString()}
                            </div>
                          )}
                          <Badge className={status.color}>{status.label}</Badge>
                          <div className="flex items-center gap-1">
                            {campaign.status === 'draft' && (
                              <Button size="sm" variant="outline" onClick={() => handleSendCampaign(campaign.id)}>
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteCampaign(campaign.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:border-[#c4a35a]/30 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-medium text-[#4A3728]">{template.name}</h3>
                  <p className="text-sm text-[#5D4A3A] mt-1 truncate">{template.subject}</p>
                </CardContent>
              </Card>
            ))}
            <Card 
              className="border-dashed border-2 hover:border-[#c4a35a] transition-all cursor-pointer"
              onClick={() => setShowTemplateModal(true)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Create Template</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D4A3A]">Total Emails Sent</span>
                    <span className="font-bold text-[#4A3728]">{totalSent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D4A3A]">Total Opens</span>
                    <span className="font-bold text-blue-600">{totalOpens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D4A3A]">Total Clicks</span>
                    <span className="font-bold text-green-600">{totalClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D4A3A]">Avg Open Rate</span>
                    <span className="font-bold text-[#4A3728]">{avgOpenRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5D4A3A]">Avg Click Rate</span>
                    <span className="font-bold text-[#4A3728]">{avgClickRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium text-sm text-[#4A3728]">{campaign.name}</div>
                        <div className="text-xs text-[#5D4A3A]">{campaign.created_at}</div>
                      </div>
                      <Badge className={STATUS_CONFIG[campaign.status]?.color || 'bg-gray-100'}>
                        {STATUS_CONFIG[campaign.status]?.label || campaign.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Spring Sale Campaign"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={newCampaign.template_id || "none"} onValueChange={(v) => setNewCampaign(prev => ({ ...prev, template_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Subject *</Label>
              <Input
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Don't miss our exclusive offer!"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  value={newCampaign.from_name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, from_name: e.target.value }))}
                  placeholder="Sevora Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={newCampaign.from_email}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, from_email: e.target.value }))}
                  placeholder="marketing@sevora.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select value={newCampaign.recipient_list} onValueChange={(v) => setNewCampaign(prev => ({ ...prev, recipient_list: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_contacts">All Contacts</SelectItem>
                    <SelectItem value="influencers">Influencers Only</SelectItem>
                    <SelectItem value="publications">Publications Only</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="newsletter">Newsletter Subscribers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduled_at}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Content *</Label>
              <Textarea
                value={newCampaign.content}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your email content here..."
                rows={6}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                Create Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product Launch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line Template *</Label>
              <Input
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="{{company_name}}: Exciting News!"
                required
              />
              <p className="text-xs text-gray-500">Use {'{{variable}}'} for dynamic content</p>
            </div>
            <div className="space-y-2">
              <Label>Email Body Template *</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Hello {{name}},\n\nWe're excited to share..."
                rows={8}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#c4a35a] hover:bg-[#b39349] text-white">
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
