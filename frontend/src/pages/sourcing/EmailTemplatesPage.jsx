import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, Plus, Edit2, Trash2, Copy, Mail, MessageSquare, 
  Search, Tag, Eye, Save, X, Sparkles
} from 'lucide-react';

const TEMPLATE_TYPES = [
  { id: 'introduction', label: 'Introduction', icon: Mail, color: 'bg-blue-500' },
  { id: 'follow_up', label: 'Follow-up', icon: MessageSquare, color: 'bg-amber-500' },
  { id: 'partnership', label: 'Partnership', icon: FileText, color: 'bg-purple-500' },
  { id: 'sample_request', label: 'Sample Request', icon: Tag, color: 'bg-green-500' },
  { id: 'agreement', label: 'Agreement', icon: FileText, color: 'bg-indigo-500' },
  { id: 'onboarding', label: 'Onboarding', icon: Sparkles, color: 'bg-cyan-500' },
];

const DEFAULT_TEMPLATES = [
  {
    name: 'Brand Introduction',
    type: 'introduction',
    subject: 'Partnership Opportunity with Sevora',
    content: `Dear {{founder_name}},

I hope this email finds you well. I'm reaching out from Sevora regarding a potential partnership opportunity with {{brand_name}}.

We've been following your brand and are impressed by your work in {{category}}. We believe there's a great opportunity for us to collaborate and bring your products to a wider audience.

Would you be available for a brief call this week to discuss further?

Best regards,
{{sender_name}}
Sevora Team`,
    variables: ['founder_name', 'brand_name', 'category', 'sender_name']
  },
  {
    name: 'Follow-up Email',
    type: 'follow_up',
    subject: 'Following up - {{brand_name}} x Sevora',
    content: `Hi {{founder_name}},

I wanted to follow up on my previous email regarding a potential partnership between {{brand_name}} and Sevora.

We're very excited about the possibility of working together and would love to discuss how we can support your brand's growth.

Please let me know if you have any questions or if there's a better time to connect.

Best regards,
{{sender_name}}`,
    variables: ['founder_name', 'brand_name', 'sender_name']
  },
  {
    name: 'Agreement Draft',
    type: 'agreement',
    subject: 'Partnership Agreement - {{brand_name}} x Sevora',
    content: `Dear {{founder_name}},

Thank you for our recent discussions. We're pleased to share the partnership agreement for {{brand_name}} with Sevora.

**Key Terms:**
- Commission Rate: {{commission_rate}}%
- Payment Terms: {{payment_terms}}
- Contract Duration: {{contract_start_date}} to {{contract_end_date}}

Please review the attached agreement and let us know if you have any questions or would like to discuss any terms.

We look forward to a successful partnership!

Best regards,
{{sender_name}}
Sevora Team`,
    variables: ['founder_name', 'brand_name', 'commission_rate', 'payment_terms', 'contract_start_date', 'contract_end_date', 'sender_name']
  },
  {
    name: 'Agreement Sent',
    type: 'agreement',
    subject: 'Action Required: Partnership Agreement - {{brand_name}}',
    content: `Dear {{founder_name}},

Please find attached the partnership agreement between {{brand_name}} and Sevora for your review and signature.

**Agreement Summary:**
- Commission: {{commission_rate}}%
- Payment Terms: {{payment_terms}}
- Start Date: {{contract_start_date}}

Please sign and return the agreement at your earliest convenience. Feel free to reach out if you have any questions.

Best regards,
{{sender_name}}`,
    variables: ['founder_name', 'brand_name', 'commission_rate', 'payment_terms', 'contract_start_date', 'sender_name']
  },
  {
    name: 'Onboarding Welcome',
    type: 'onboarding',
    subject: 'Welcome to Sevora - {{brand_name}} Onboarding',
    content: `Dear {{founder_name}},

Welcome to the Sevora family! We're thrilled to have {{brand_name}} as our partner.

**Next Steps:**
1. Complete brand profile documentation
2. Submit product catalog and pricing
3. Schedule training session with our team
4. Set up payment and logistics

Our onboarding team will reach out shortly to guide you through each step.

Looking forward to a successful partnership!

Best regards,
{{sender_name}}
Sevora Onboarding Team`,
    variables: ['founder_name', 'brand_name', 'sender_name']
  },
  {
    name: 'Sample Request',
    type: 'sample_request',
    subject: 'Sample Request - Sevora',
    content: `Dear {{contact_name}},

Thank you for our recent conversation about {{brand_name}}. We would like to request samples of your products for evaluation.

**Sample Details:**
{{sample_details}}

Please let us know the shipping details and expected delivery timeline.

Best regards,
{{sender_name}}
Sevora Buying Team`,
    variables: ['contact_name', 'brand_name', 'sample_details', 'sender_name']
  }
];

const EmailTemplatesPage = () => {
  const { api } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'introduction',
    subject: '',
    content: '',
    variables: []
  });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/sourcing/templates');
      setTemplates(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultTemplates = async () => {
    try {
      // Seed each default template
      for (const tmpl of DEFAULT_TEMPLATES) {
        const existing = templates.find(t => t.name === tmpl.name);
        if (!existing) {
          await api.post('/sourcing/templates', tmpl);
        }
      }
      toast.success('Default templates added');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to seed templates');
    }
  };

  const openCreateModal = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      type: 'introduction',
      subject: '',
      content: '',
      variables: []
    });
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables || []
    });
    setShowModal(true);
  };

  const openPreview = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const saveTemplate = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Name and content are required');
      return;
    }

    // Extract variables from content
    const variableMatches = formData.content.match(/\{\{(\w+)\}\}/g) || [];
    const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];

    try {
      if (selectedTemplate) {
        await api.put(`/sourcing/templates/${selectedTemplate.id}`, { ...formData, variables });
        toast.success('Template updated');
      } else {
        await api.post('/sourcing/templates', { ...formData, variables });
        toast.success('Template created');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await api.delete(`/sourcing/templates/${templateId}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const duplicateTemplate = async (template) => {
    try {
      await api.post('/sourcing/templates', {
        name: `${template.name} (Copy)`,
        type: template.type,
        subject: template.subject,
        content: template.content,
        variables: template.variables
      });
      toast.success('Template duplicated');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTypeConfig = (type) => TEMPLATE_TYPES.find(t => t.id === type) || TEMPLATE_TYPES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="email-templates-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-8 w-8" /> Email Templates
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {templates.length === 0 && (
            <Button variant="outline" onClick={seedDefaultTemplates}>
              <Sparkles className="h-4 w-4 mr-2" /> Add Default Templates
            </Button>
          )}
          <Button onClick={openCreateModal} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TEMPLATE_TYPES.map(type => (
              <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Stats */}
      <div className="grid grid-cols-6 gap-3">
        {TEMPLATE_TYPES.map(type => {
          const count = templates.filter(t => t.type === type.id).length;
          return (
            <Card 
              key={type.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterType === type.id ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setFilterType(filterType === type.id ? 'all' : type.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${type.color} p-2 rounded-lg`}>
                  <type.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{type.label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No templates found</p>
          <Button onClick={seedDefaultTemplates} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" /> Add Default Templates
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => {
            const typeConfig = getTypeConfig(template.type);
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`${typeConfig.color} p-1.5 rounded`}>
                        <typeConfig.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">{typeConfig.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(template)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.subject && (
                    <p className="text-sm text-gray-600 mb-2 truncate">
                      <span className="font-medium">Subject:</span> {template.subject}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 line-clamp-3">{template.content}</p>
                  
                  {template.variables?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.slice(0, 4).map(v => (
                        <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                      ))}
                      {template.variables.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{template.variables.length - 4}</Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => duplicateTemplate(template)}>
                      <Copy className="h-3 w-3 mr-1" /> Duplicate
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteTemplate(template.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g., Introduction Email"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input
                placeholder="e.g., Partnership Opportunity with {{brand_name}}"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              />
            </div>

            <div>
              <Label>Email Content *</Label>
              <Textarea
                placeholder="Write your email template here. Use {{variable_name}} for dynamic content."
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {`{{founder_name}}, {{brand_name}}, {{category}}, {{commission_rate}}, {{payment_terms}}, {{contract_start_date}}, {{contract_end_date}}, {{sender_name}}`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveTemplate} className="bg-orange-600 hover:bg-orange-700">
              <Save className="h-4 w-4 mr-2" /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Subject</p>
                <p className="font-medium">{selectedTemplate.subject || '(No subject)'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Content</p>
                <div className="whitespace-pre-wrap text-sm">{selectedTemplate.content}</div>
              </div>
              
              {selectedTemplate.variables?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map(v => (
                      <Badge key={v} variant="outline">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
            <Button onClick={() => { setShowPreview(false); openEditModal(selectedTemplate); }}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesPage;
