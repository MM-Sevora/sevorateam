import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { marketingAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Send, 
    Mail, 
    MessageCircle, 
    Plus,
    Check,
    Eye,
    Reply,
    Clock
} from 'lucide-react';

const EMAIL_TEMPLATES = [
    {
        id: 'intro',
        name: 'Introduction',
        subject: 'Collaboration with SEVORA - India\'s Premier Fashion Platform',
        message: `Hi {name},

I'm reaching out from SEVORA — India's first stylist-led fashion platform.

We've been following your fashion content and believe your aesthetic aligns perfectly with our brand vision. Your {category} content particularly caught our attention.

We'd love to explore a collaboration opportunity with you for our upcoming campaign.

Would you be interested in discussing this further?

Best regards,
SEVORA Team`
    },
    {
        id: 'campaign',
        name: 'Campaign Invite',
        subject: 'Exclusive Campaign Opportunity - SEVORA Style Circle',
        message: `Dear {name},

You've been selected for SEVORA's exclusive Style Circle campaign.

Campaign Details:
- Duration: 2 weeks
- Deliverables: 1 Reel + 3 Stories
- Compensation: Competitive fee + products

As a SEVORA Style Partner, you'll get early access to our curated collections and exclusive brand events.

Interested? Reply to schedule a brief call.

SEVORA Team`
    },
    {
        id: 'followup',
        name: 'Follow Up',
        subject: 'Following up - SEVORA Collaboration',
        message: `Hi {name},

Hope this message finds you well. I wanted to follow up on my previous message about collaborating with SEVORA.

We're currently finalizing our campaign roster and would love to include you.

Please let me know if you have any questions or would like to discuss the opportunity.

Best,
SEVORA Team`
    }
];

const WHATSAPP_TEMPLATES = [
    {
        id: 'intro',
        name: 'Quick Intro',
        message: `Hi {name}! 👋 This is SEVORA - India's premier stylist-led fashion platform. We love your {category} content and would love to collaborate. Interested? 🌟`
    },
    {
        id: 'campaign',
        name: 'Campaign Brief',
        message: `Hey {name}! 🎯 SEVORA here. We're launching an exclusive campaign and think you'd be perfect. Quick call to discuss? Let me know your availability!`
    }
];

export const OutreachPage = () => {
    const [searchParams] = useSearchParams();
    const [outreach, setOutreach] = useState([]);
    const [influencers, setInfluencers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [compose, setCompose] = useState({
        influencer_id: searchParams.get('influencer') || '',
        channel: 'email',
        subject: '',
        message: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [outreachRes, influencersRes] = await Promise.all([
                marketingAPI.getAll(),
                marketingAPI.getAll()
            ]);
            setOutreach(outreachRes.data);
            setInfluencers(influencersRes.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (template) => {
        const inf = influencers.find(i => i.id === compose.influencer_id);
        const message = template.message
            .replace('{name}', inf?.name || 'there')
            .replace('{category}', inf?.category || 'fashion');
        
        setCompose({
            ...compose,
            subject: template.subject || '',
            message
        });
        setSelectedTemplate(template.id);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!compose.influencer_id || !compose.message) {
            toast.error('Please select an influencer and enter a message');
            return;
        }
        try {
            await marketingAPI.create(compose);
            toast.success('Outreach sent successfully');
            setShowComposeModal(false);
            setCompose({ influencer_id: '', channel: 'email', subject: '', message: '' });
            setSelectedTemplate(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to send outreach');
        }
    };

    const handleResponseUpdate = async (id, opened, replied) => {
        try {
            await marketingAPI.updateResponse(id, opened, replied);
            toast.success('Response updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update response');
        }
    };

    const stats = {
        total: outreach.length,
        opened: outreach.filter(o => o.opened).length,
        replied: outreach.filter(o => o.replied).length,
        email: outreach.filter(o => o.channel === 'email').length,
        whatsapp: outreach.filter(o => o.channel === 'whatsapp').length
    };

    return (
        <div className="p-8 space-y-8" data-testid="outreach-page">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Communication Hub
                    </p>
                    <h1 className="font-serif text-4xl">Outreach</h1>
                </div>
                <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
                    <DialogTrigger asChild>
                        <Button 
                            data-testid="compose-outreach-btn"
                            className="rounded-none bg-primary text-primary-foreground hover:bg-gold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Outreach
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-serif text-2xl">Compose Outreach</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSend} className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Influencer *</Label>
                                    <Select 
                                        value={compose.influencer_id} 
                                        onValueChange={(v) => setCompose({ ...compose, influencer_id: v })}
                                    >
                                        <SelectTrigger data-testid="select-influencer">
                                            <SelectValue placeholder="Select influencer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {influencers.map(inf => (
                                                <SelectItem key={inf.id} value={inf.id}>
                                                    {inf.name} - {inf.city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Channel *</Label>
                                    <Select 
                                        value={compose.channel} 
                                        onValueChange={(v) => setCompose({ ...compose, channel: v })}
                                    >
                                        <SelectTrigger data-testid="select-channel">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="email">
                                                <span className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4" /> Email
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="whatsapp">
                                                <span className="flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4" /> WhatsApp
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Templates */}
                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Templates</Label>
                                <div className="flex flex-wrap gap-2">
                                    {(compose.channel === 'email' ? EMAIL_TEMPLATES : WHATSAPP_TEMPLATES).map(template => (
                                        <Button
                                            key={template.id}
                                            type="button"
                                            variant={selectedTemplate === template.id ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleTemplateSelect(template)}
                                            className="rounded-none text-xs"
                                        >
                                            {template.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {compose.channel === 'email' && (
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Subject</Label>
                                    <Input
                                        data-testid="email-subject"
                                        value={compose.subject}
                                        onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                                        placeholder="Email subject"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="font-mono text-xs uppercase">Message *</Label>
                                <Textarea
                                    data-testid="message-input"
                                    value={compose.message}
                                    onChange={(e) => setCompose({ ...compose, message: e.target.value })}
                                    placeholder="Enter your message..."
                                    rows={8}
                                    required
                                />
                            </div>

                            <Button type="submit" data-testid="send-outreach-btn" className="w-full rounded-none">
                                <Send className="w-4 h-4 mr-2" />
                                Send Outreach
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border border-border">
                    <CardContent className="p-4 text-center">
                        <p className="font-serif text-2xl">{stats.total}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Total Sent</p>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 text-center">
                        <p className="font-serif text-2xl">{stats.opened}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Opened</p>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 text-center">
                        <p className="font-serif text-2xl">{stats.replied}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Replied</p>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 text-center">
                        <p className="font-serif text-2xl">{stats.email}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">Email</p>
                    </CardContent>
                </Card>
                <Card className="border border-border">
                    <CardContent className="p-4 text-center">
                        <p className="font-serif text-2xl">{stats.whatsapp}</p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">WhatsApp</p>
                    </CardContent>
                </Card>
            </div>

            {/* Outreach List */}
            <Card className="border border-border">
                <CardHeader>
                    <CardTitle className="font-serif text-lg">Recent Outreach</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-20" />
                            ))}
                        </div>
                    ) : outreach.length === 0 ? (
                        <div className="text-center py-12">
                            <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-serif text-xl mb-2">No Outreach Yet</h3>
                            <p className="text-muted-foreground text-sm">
                                Start reaching out to influencers
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {outreach.map((item) => (
                                <div 
                                    key={item.id}
                                    className="border border-border p-4 hover:border-gold/30 transition-all duration-200"
                                    data-testid={`outreach-item-${item.id}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                                                {item.channel === 'email' ? (
                                                    <Mail className="w-4 h-4 text-gold" />
                                                ) : (
                                                    <MessageCircle className="w-4 h-4 text-gold" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{item.influencer_name}</p>
                                                {item.subject && (
                                                    <p className="text-sm text-muted-foreground">{item.subject}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {item.sent_at ? new Date(item.sent_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge 
                                                variant={item.replied ? 'default' : item.opened ? 'secondary' : 'outline'}
                                                className="text-xs"
                                            >
                                                {item.replied ? (
                                                    <><Reply className="w-3 h-3 mr-1" /> Replied</>
                                                ) : item.opened ? (
                                                    <><Eye className="w-3 h-3 mr-1" /> Opened</>
                                                ) : (
                                                    <><Check className="w-3 h-3 mr-1" /> Sent</>
                                                )}
                                            </Badge>
                                            {!item.replied && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleResponseUpdate(item.id, true, !item.replied)}
                                                    className="text-xs"
                                                >
                                                    Mark {item.opened ? 'Replied' : 'Opened'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 pl-13">
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {item.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OutreachPage;
