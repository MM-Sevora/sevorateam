import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Mail, Send, FileText, Loader2, Paperclip } from 'lucide-react';

const EmailComposer = ({ 
  isOpen, 
  onClose, 
  entityType, // 'brand' | 'supplier' | 'manufacturer'
  entityId,
  entityName,
  defaultEmail,
  defaultRecipientName,
  replyData, // { subject, quotedContent, isReply }
  onSuccess 
}) => {
  const { api } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    to_email: defaultEmail || '',
    to_name: defaultRecipientName || '',
    subject: '',
    content: '',
    template_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      
      // Handle reply data
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
      const res = await api.get(`/sourcing/templates?module=${entityType}`);
      setTemplates(res.data || []);
    } catch (error) {
      // Fallback to all templates
      try {
        const res = await api.get('/sourcing/templates');
        setTemplates(res.data || []);
      } catch {
        setTemplates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (!templateId || templateId === 'none') {
      setFormData(prev => ({ ...prev, template_id: '' }));
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Replace variables in subject and content
      let subject = template.subject || '';
      let content = template.content || '';
      
      // Common variable replacements
      const replacements = {
        '{{brand_name}}': entityName,
        '{{supplier_name}}': entityName,
        '{{manufacturer_name}}': entityName,
        '{{contact_name}}': formData.to_name || 'there',
        '{{company_name}}': 'SEVORA',
        '{{sender_name}}': 'SEVORA Team'
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
      await api.post('/sourcing/campaigns/send-single', {
        to_email: formData.to_email,
        to_name: formData.to_name,
        subject: formData.subject,
        content: formData.content,
        template_id: formData.template_id || undefined,
        [`${entityType}_id`]: entityId
      });
      
      toast.success(`Email sent to ${formData.to_email}`);
      onClose();
      if (onSuccess) onSuccess();
      
      // Reset form
      setFormData({
        to_email: '',
        to_name: '',
        subject: '',
        content: '',
        template_id: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-500" /> 
            {replyData?.isReply ? `Reply to ${entityName}` : `Send Email to ${entityName}`}
          </DialogTitle>
        </DialogHeader>
        
        {replyData?.isReply && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Replying to conversation - original message is quoted below
          </div>
        )}
        
        <div className="space-y-4 py-4">
          {/* Template Selection - hide for replies */}
          {!replyData?.isReply && (
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
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Recipient Email *</Label>
              <Input
                type="email"
                value={formData.to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, to_email: e.target.value }))}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Recipient Name</Label>
              <Input
                value={formData.to_name}
                onChange={(e) => setFormData(prev => ({ ...prev, to_name: e.target.value }))}
                placeholder="Contact name"
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
              placeholder="Email subject..."
              className="mt-1"
            />
          </div>
          
          {/* Content */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wider">Message *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your message..."
              className="mt-1 min-h-[200px]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Tip: Use templates for consistent messaging. Variables like {`{{contact_name}}`} will be replaced automatically.
            </p>
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposer;
