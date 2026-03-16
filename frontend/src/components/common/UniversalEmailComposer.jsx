import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Mail, Send, FileText, Loader2, Paperclip, X, Building2, Users, Factory, Megaphone, User } from 'lucide-react';

// Module configurations for entity types
const MODULE_CONFIG = {
  brand: {
    icon: Building2,
    label: 'Brand',
    color: 'orange',
    endpoint: '/sourcing/campaigns/send-single',
    templateEndpoint: '/sourcing/email-templates',
    entityIdKey: 'brand_id'
  },
  supplier: {
    icon: Users,
    label: 'Supplier',
    color: 'blue',
    endpoint: '/sourcing/campaigns/send-single',
    templateEndpoint: '/sourcing/email-templates',
    entityIdKey: 'supplier_id'
  },
  manufacturer: {
    icon: Factory,
    label: 'Manufacturer',
    color: 'green',
    endpoint: '/sourcing/campaigns/send-single',
    templateEndpoint: '/sourcing/email-templates',
    entityIdKey: 'manufacturer_id'
  },
  influencer: {
    icon: Megaphone,
    label: 'Influencer',
    color: 'purple',
    endpoint: '/marketing/send-email',
    templateEndpoint: '/marketing/email-templates',
    entityIdKey: 'influencer_id'
  },
  contact: {
    icon: User,
    label: 'Contact',
    color: 'gray',
    endpoint: '/marketing/send-email',
    templateEndpoint: '/marketing/email-templates',
    entityIdKey: 'contact_id'
  },
  general: {
    icon: Mail,
    label: 'Email',
    color: 'gray',
    endpoint: '/sourcing/campaigns/send-single',
    templateEndpoint: '/sourcing/email-templates',
    entityIdKey: null
  }
};

const UniversalEmailComposer = ({ 
  isOpen, 
  onClose, 
  entityType = 'general', // 'brand' | 'supplier' | 'manufacturer' | 'influencer' | 'contact' | 'general'
  entityId,
  entityName,
  defaultEmail,
  defaultRecipientName,
  replyData, // { subject, quotedContent, isReply }
  onSuccess 
}) => {
  const { api } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [sharedMailboxes, setSharedMailboxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    to_email: '',
    to_name: '',
    subject: '',
    content: '',
    template_id: '',
    from_mailbox: ''
  });
  
  const config = MODULE_CONFIG[entityType] || MODULE_CONFIG.general;
  const IconComponent = config.icon;

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchSharedMailboxes();
      
      // Handle reply data or set defaults
      if (replyData?.isReply) {
        setFormData(prev => ({
          ...prev,
          to_email: defaultEmail || '',
          to_name: defaultRecipientName || '',
          subject: replyData.subject || '',
          content: replyData.quotedContent || '',
          template_id: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          to_email: defaultEmail || '',
          to_name: defaultRecipientName || '',
          subject: '',
          content: '',
          template_id: ''
        }));
      }
    }
  }, [isOpen, defaultEmail, defaultRecipientName, replyData]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get(config.templateEndpoint);
      setTemplates(res.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedMailboxes = async () => {
    try {
      const res = await api.get('/shared-mailboxes');
      const activeMailboxes = (res.data || []).filter(m => m.is_active);
      setSharedMailboxes(activeMailboxes);
      // Set default mailbox
      if (activeMailboxes.length > 0 && !formData.from_mailbox) {
        const defaultMailbox = activeMailboxes.find(m => m.display_name?.toLowerCase().includes('seller')) || activeMailboxes[0];
        setFormData(prev => ({ ...prev, from_mailbox: defaultMailbox.id }));
      }
    } catch (error) {
      console.error('Failed to fetch shared mailboxes:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (templateId === 'none') {
      setFormData(prev => ({
        ...prev,
        template_id: '',
        subject: '',
        content: ''
      }));
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      let subject = template.subject || '';
      let content = template.body || template.content || '';
      
      // Replace placeholders
      const replacements = {
        '{{company_name}}': entityName || '',
        '{{brand_name}}': entityName || '',
        '{{recipient_name}}': formData.to_name || '',
        '{{contact_name}}': formData.to_name || ''
      };
      
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value);
        content = content.replace(new RegExp(key, 'g'), value);
      });
      
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        subject,
        content
      }));
    }
  };

  const handleSend = async () => {
    if (!formData.to_email) {
      toast.error('Recipient email is required');
      return;
    }
    if (!formData.subject) {
      toast.error('Subject is required');
      return;
    }
    if (!formData.content) {
      toast.error('Email content is required');
      return;
    }
    
    setSending(true);
    try {
      const payload = {
        to_email: formData.to_email,
        to_name: formData.to_name,
        subject: formData.subject,
        content: formData.content,
        template_id: formData.template_id || undefined,
        mailbox_id: formData.from_mailbox || undefined
      };
      
      // Add entity-specific ID if applicable
      if (config.entityIdKey && entityId) {
        payload[config.entityIdKey] = entityId;
      }
      
      await api.post(config.endpoint, payload);
      
      toast.success(`Email sent to ${formData.to_email}`);
      onClose();
      if (onSuccess) onSuccess();
      
      // Reset form
      setFormData({
        to_email: '',
        to_name: '',
        subject: '',
        content: '',
        template_id: '',
        from_mailbox: formData.from_mailbox // Keep selected mailbox
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const getColorClass = () => {
    const colors = {
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[config.color] || colors.gray;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 text-${config.color}-600`} />
            {replyData?.isReply ? `Reply to ${entityName || 'Email'}` : `Compose Email`}
            {entityName && !replyData?.isReply && (
              <Badge variant="outline" className={getColorClass()}>
                {config.label}: {entityName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {replyData?.isReply && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Replying to conversation - original message is quoted below
          </div>
        )}
        
        <div className="space-y-4 py-4">
          {/* From Mailbox Selection */}
          {sharedMailboxes.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">From</Label>
              <Select 
                value={formData.from_mailbox} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, from_mailbox: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select sender mailbox..." />
                </SelectTrigger>
                <SelectContent>
                  {sharedMailboxes.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection - hide for replies */}
          {!replyData?.isReply && templates.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Use Template</Label>
              <Select 
                value={formData.template_id || 'none'} 
                onValueChange={handleTemplateSelect}
                disabled={loading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template - write from scratch</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Recipient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">To (Email) *</Label>
              <Input
                type="email"
                value={formData.to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, to_email: e.target.value }))}
                placeholder="recipient@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Recipient Name</Label>
              <Input
                value={formData.to_name}
                onChange={(e) => setFormData(prev => ({ ...prev, to_name: e.target.value }))}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>
          </div>
          
          {/* Subject */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Email subject"
              className="mt-1"
            />
          </div>
          
          {/* Content */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Message *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your message here..."
              rows={10}
              className="mt-1 font-mono text-sm"
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !formData.to_email || !formData.subject || !formData.content}
            className={`bg-${config.color}-600 hover:bg-${config.color}-700`}
            style={{ backgroundColor: config.color === 'orange' ? '#ea580c' : undefined }}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalEmailComposer;
