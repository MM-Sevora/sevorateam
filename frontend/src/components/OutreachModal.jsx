import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Mail, MessageCircle, Send, Loader2, User, Phone, CheckCircle, XCircle, FileText } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_TEMPLATES = {
    email: {
        collaboration: `Hi {{influencer_name}},

I hope this message finds you well! I'm reaching out from SEVORA, a luxury fashion brand based in India.

We've been following your content and love your unique style. We think you'd be a perfect fit for {{campaign_name}}.

We'd love to discuss a potential collaboration with you. Would you be interested in learning more?

Looking forward to hearing from you!`,
        followup: `Hi {{influencer_name}},

I wanted to follow up on my previous message about collaborating with SEVORA. 

We're still very interested in working with you and would love to hear your thoughts.

Best regards,
The SEVORA Team`
    },
    whatsapp: {
        collaboration: `Hi {{influencer_name}}! 👋

This is the SEVORA team. We love your content and would like to discuss a collaboration opportunity for {{campaign_name}}.

Are you available for a quick chat? Let us know! 🙏`,
        followup: `Hi {{influencer_name}}! Just following up on our previous message about a collaboration opportunity. Would love to connect when you have a moment! 😊`
    }
};

export const OutreachModal = ({ open, onClose, influencer, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [channelStatus, setChannelStatus] = useState({ email: {}, whatsapp: {} });
    const [selectedChannel, setSelectedChannel] = useState('email');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    
    const [formData, setFormData] = useState({
        subject: 'Collaboration Opportunity with SEVORA',
        message: DEFAULT_TEMPLATES.email.collaboration,
        campaign_name: ''
    });

    useEffect(() => {
        if (open) {
            fetchChannelStatus();
            fetchTemplates();
        }
    }, [open]);

    useEffect(() => {
        // Update default message when channel changes
        setFormData(prev => ({
            ...prev,
            message: selectedChannel === 'email' 
                ? DEFAULT_TEMPLATES.email.collaboration 
                : DEFAULT_TEMPLATES.whatsapp.collaboration
        }));
    }, [selectedChannel]);

    const fetchChannelStatus = async () => {
        try {
            const response = await axios.get(`${API}/outreach-hub/status`);
            setChannelStatus(response.data);
        } catch (err) {
            console.error('Failed to fetch channel status', err);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${API}/outreach-hub/templates`);
            setTemplates(response.data);
        } catch (err) {
            console.error('Failed to fetch templates', err);
        }
    };

    const handleTemplateSelect = (templateId) => {
        if (templateId === 'custom') {
            setSelectedTemplate(null);
            return;
        }
        
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setFormData(prev => ({
                ...prev,
                subject: template.subject || prev.subject,
                message: template.body
            }));
        }
    };

    const handleSend = async () => {
        if (!formData.message.trim()) {
            toast.error('Please enter a message');
            return;
        }

        // Check if channel is available
        if (selectedChannel === 'email' && !influencer.email) {
            toast.error('This influencer has no email on file');
            return;
        }
        if (selectedChannel === 'whatsapp' && !influencer.phone && !influencer.whatsapp) {
            toast.error('This influencer has no phone number on file');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                influencer_id: influencer.id,
                channel: selectedChannel,
                message: formData.message,
                campaign_name: formData.campaign_name || null
            };

            if (selectedChannel === 'email') {
                payload.subject = formData.subject;
            }

            if (selectedTemplate) {
                payload.template_id = selectedTemplate.id;
            }

            await axios.post(`${API}/outreach-hub/send`, payload);
            
            toast.success(`${selectedChannel === 'email' ? 'Email' : 'WhatsApp message'} sent to ${influencer.name}!`);
            onSuccess && onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    const canSendEmail = influencer?.email && channelStatus.email?.configured;
    const canSendWhatsApp = (influencer?.phone || influencer?.whatsapp) && channelStatus.whatsapp?.configured;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-gold" />
                        Send Outreach to {influencer?.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Contact Info */}
                    <div className="flex gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{influencer?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{influencer?.email || <span className="text-red-500 italic">No email</span>}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{influencer?.phone || influencer?.whatsapp || <span className="text-red-500 italic">No phone</span>}</span>
                        </div>
                    </div>

                    {/* Channel Selection */}
                    <Tabs value={selectedChannel} onValueChange={setSelectedChannel}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="email" disabled={!canSendEmail} className="gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                                {canSendEmail ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="whatsapp" disabled={!canSendWhatsApp} className="gap-2">
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                                {canSendWhatsApp ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                    <XCircle className="w-3 h-3 text-red-500" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="email" className="space-y-4 mt-4">
                            {/* Template Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-mono">Template</Label>
                                <Select onValueChange={handleTemplateSelect} defaultValue="custom">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template or write custom" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">
                                            <span className="flex items-center gap-2">
                                                <FileText className="w-3 h-3" /> Custom Message
                                            </span>
                                        </SelectItem>
                                        {templates.filter(t => t.channel === 'email' || t.channel === 'both').map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-mono">Subject</Label>
                                <Input
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Email subject line"
                                />
                            </div>

                            {/* Campaign Name */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-mono">Campaign Name (Optional)</Label>
                                <Input
                                    value={formData.campaign_name}
                                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                                    placeholder="e.g., Summer Collection 2026"
                                />
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs uppercase font-mono">Message</Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Variables: {`{{influencer_name}}, {{campaign_name}}, {{brand_name}}`}
                                    </span>
                                </div>
                                <Textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={10}
                                    placeholder="Write your message..."
                                    className="font-mono text-sm"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="whatsapp" className="space-y-4 mt-4">
                            {/* Template Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-mono">Template</Label>
                                <Select onValueChange={handleTemplateSelect} defaultValue="custom">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template or write custom" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">Custom Message</SelectItem>
                                        {templates.filter(t => t.channel === 'whatsapp' || t.channel === 'both').map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campaign Name */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-mono">Campaign Name (Optional)</Label>
                                <Input
                                    value={formData.campaign_name}
                                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                                    placeholder="e.g., Summer Collection 2026"
                                />
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs uppercase font-mono">Message</Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Variables: {`{{influencer_name}}, {{campaign_name}}`}
                                    </span>
                                </div>
                                <Textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={6}
                                    placeholder="Write your WhatsApp message..."
                                    className="font-mono text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Note: WhatsApp text messages only work within 24-hour conversation windows. 
                                    For new conversations, use template messages (must be approved by Meta).
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Preview */}
                    <div className="p-3 bg-muted/20 rounded-lg border">
                        <p className="text-[10px] uppercase font-mono text-muted-foreground mb-2">Preview</p>
                        <div className="text-sm whitespace-pre-wrap">
                            {formData.message
                                .replace(/\{\{influencer_name\}\}/g, influencer?.name || 'Influencer')
                                .replace(/\{\{campaign_name\}\}/g, formData.campaign_name || 'our upcoming campaign')
                                .replace(/\{\{brand_name\}\}/g, 'SEVORA')
                            }
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button 
                            onClick={handleSend} 
                            disabled={loading || (selectedChannel === 'email' && !canSendEmail) || (selectedChannel === 'whatsapp' && !canSendWhatsApp)}
                            className="gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send {selectedChannel === 'email' ? 'Email' : 'WhatsApp'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OutreachModal;
