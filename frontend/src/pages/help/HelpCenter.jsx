import React, { useState, useEffect } from 'react';
import {
    Search, HelpCircle, Book, MessageSquare, Ticket, ChevronRight,
    ClipboardList, Target, Mail, Share2, Home, FileText, Loader2,
    Plus, Send, Clock, CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MODULE_ICONS = {
    'overview': Home,
    'project_management': ClipboardList,
    'marketing': Target,
    'mail': Mail,
    'social': Share2,
    'default': HelpCircle
};

const STATUS_CONFIG = {
    'open': { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    'in_progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: Clock },
    'waiting_user': { label: 'Waiting on You', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
    'resolved': { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    'closed': { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: XCircle }
};

const PRIORITY_CONFIG = {
    'low': { label: 'Low', color: 'bg-gray-100 text-gray-600' },
    'medium': { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
    'high': { label: 'High', color: 'bg-orange-100 text-orange-600' },
    'urgent': { label: 'Urgent', color: 'bg-red-100 text-red-600' }
};

const HelpCenter = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');
    const [modules, setModules] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchModules();
        fetchMyTickets();
    }, []);

    const fetchModules = async () => {
        try {
            const res = await api.get('/help/modules');
            setModules(res.data);
        } catch (e) {
            console.error('Failed to fetch modules:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyTickets = async () => {
        try {
            const res = await api.get('/help/tickets?my_tickets=true&limit=20');
            setTickets(res.data);
        } catch (e) {
            console.error('Failed to fetch tickets:', e);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        
        setSearching(true);
        try {
            const res = await api.get(`/help/search?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data);
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setSearching(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#FDF8F3] p-6" data-testid="help-center">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-[#4A3728] mb-2">Help Center</h1>
                    <p className="text-[#6B5D52]">Find answers, browse guides, or submit a support request</p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9C8C74]" />
                        <Input
                            placeholder="Search for help articles, FAQs, or topics..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-12 py-6 text-lg border-[#D4BBA6] bg-white shadow-sm"
                            data-testid="help-search-input"
                        />
                        {searching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[#9C8C74]" />
                        )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <Card className="mt-2 border-[#E8D5C4] shadow-lg">
                            <CardContent className="p-0">
                                <ScrollArea className="max-h-80">
                                    {searchResults.map((result) => (
                                        <div
                                            key={`${result.type}-${result.id}`}
                                            className="p-4 hover:bg-[#FDF8F3] cursor-pointer border-b border-[#E8D5C4] last:border-0"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSearchResults([]);
                                                navigate(result.url);
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Badge variant="outline" className="text-xs">
                                                    {result.type}
                                                </Badge>
                                                <div>
                                                    <p className="font-medium text-[#4A3728]">{result.title}</p>
                                                    <p className="text-sm text-[#6B5D52] mt-1">{result.snippet}</p>
                                                    <p className="text-xs text-[#9C8C74] mt-1">{result.module_name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white border border-[#E8D5C4] p-1">
                        <TabsTrigger 
                            value="browse" 
                            className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white"
                            data-testid="browse-tab"
                        >
                            <Book className="w-4 h-4 mr-2" />
                            Browse Help
                        </TabsTrigger>
                        <TabsTrigger 
                            value="tickets" 
                            className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white"
                            data-testid="tickets-tab"
                        >
                            <Ticket className="w-4 h-4 mr-2" />
                            My Tickets ({tickets.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Browse Help Tab */}
                    <TabsContent value="browse">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-[#9C8C74]" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {modules.map((module) => {
                                    const Icon = MODULE_ICONS[module.module_key] || MODULE_ICONS.default;
                                    return (
                                        <Card
                                            key={module.id}
                                            className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow cursor-pointer group"
                                            onClick={() => navigate(`/help/modules/${module.module_key}`)}
                                            data-testid={`module-card-${module.module_key}`}
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 rounded-lg bg-[#F5EDE5] flex items-center justify-center group-hover:bg-[#4A3728] transition-colors">
                                                        <Icon className="w-6 h-6 text-[#4A3728] group-hover:text-white transition-colors" />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-[#D4BBA6] group-hover:text-[#4A3728] transition-colors" />
                                                </div>
                                                <CardTitle className="text-lg text-[#4A3728] mt-3">
                                                    {module.module_name}
                                                </CardTitle>
                                                <CardDescription className="text-[#6B5D52]">
                                                    {module.description || 'Help and documentation'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-[#9C8C74]">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        {module.article_count} articles
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {module.faq_count} FAQs
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="mt-8 p-6 bg-gradient-to-r from-[#4A3728] to-[#6B5D52] rounded-xl text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Can't find what you're looking for?</h3>
                                    <p className="text-white/80">Submit a support ticket and our team will help you out.</p>
                                </div>
                                <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            className="bg-white text-[#4A3728] hover:bg-white/90"
                                            data-testid="submit-ticket-btn"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Submit Ticket
                                        </Button>
                                    </DialogTrigger>
                                    <TicketDialog 
                                        modules={modules} 
                                        onClose={() => setTicketDialogOpen(false)}
                                        onSuccess={() => {
                                            setTicketDialogOpen(false);
                                            fetchMyTickets();
                                            setActiveTab('tickets');
                                        }}
                                    />
                                </Dialog>
                            </div>
                        </div>
                    </TabsContent>

                    {/* My Tickets Tab */}
                    <TabsContent value="tickets">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[#4A3728]">My Support Tickets</h2>
                            <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-[#4A3728] hover:bg-[#3A2A1E]" data-testid="new-ticket-btn">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Ticket
                                    </Button>
                                </DialogTrigger>
                                <TicketDialog 
                                    modules={modules} 
                                    onClose={() => setTicketDialogOpen(false)}
                                    onSuccess={() => {
                                        setTicketDialogOpen(false);
                                        fetchMyTickets();
                                    }}
                                />
                            </Dialog>
                        </div>

                        {tickets.length === 0 ? (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="text-center py-12">
                                    <Ticket className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                                    <p className="font-medium text-[#4A3728]">No tickets yet</p>
                                    <p className="text-sm text-[#6B5D52] mt-1">
                                        Create a ticket if you need help with something
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="p-0">
                                    <div className="divide-y divide-[#E8D5C4]">
                                        {tickets.map((ticket) => {
                                            const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                            const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                            const StatusIcon = statusConfig.icon;
                                            
                                            return (
                                                <div
                                                    key={ticket.id}
                                                    className="p-4 hover:bg-[#FDF8F3] cursor-pointer transition-colors"
                                                    onClick={() => navigate(`/help/tickets/${ticket.id}`)}
                                                    data-testid={`ticket-${ticket.ticket_number}`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-mono text-[#9C8C74]">
                                                                    {ticket.ticket_number}
                                                                </span>
                                                                <Badge className={`text-xs ${statusConfig.color}`}>
                                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                                    {statusConfig.label}
                                                                </Badge>
                                                                <Badge className={`text-xs ${priorityConfig.color}`}>
                                                                    {priorityConfig.label}
                                                                </Badge>
                                                            </div>
                                                            <p className="font-medium text-[#4A3728]">{ticket.subject}</p>
                                                            <p className="text-sm text-[#6B5D52] mt-1 line-clamp-1">
                                                                {ticket.description}
                                                            </p>
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-[#9C8C74]">
                                                                <span>{ticket.module_name}</span>
                                                                <span>•</span>
                                                                <span>{formatDate(ticket.created_at)}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-[#D4BBA6]" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

// Ticket Creation Dialog
const TicketDialog = ({ modules, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        module_key: '',
        issue_type: 'question',
        priority: 'medium',
        subject: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.module_key || !formData.subject || !formData.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/help/tickets', formData);
            toast.success('Ticket submitted successfully');
            onSuccess();
        } catch (e) {
            toast.error('Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
                <DialogTitle className="text-[#4A3728]">Submit Support Ticket</DialogTitle>
                <DialogDescription className="text-[#6B5D52]">
                    Describe your issue and we'll get back to you as soon as possible.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[#4A3728]">Module *</Label>
                        <Select
                            value={formData.module_key}
                            onValueChange={(v) => setFormData({ ...formData, module_key: v })}
                        >
                            <SelectTrigger className="border-[#D4BBA6]">
                                <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#D4BBA6]">
                                {modules.map((m) => (
                                    <SelectItem key={m.module_key} value={m.module_key}>
                                        {m.module_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#4A3728]">Issue Type</Label>
                        <Select
                            value={formData.issue_type}
                            onValueChange={(v) => setFormData({ ...formData, issue_type: v })}
                        >
                            <SelectTrigger className="border-[#D4BBA6]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#D4BBA6]">
                                <SelectItem value="question">Question</SelectItem>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature_request">Feature Request</SelectItem>
                                <SelectItem value="how_to">How To</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label className="text-[#4A3728]">Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                        <SelectTrigger className="border-[#D4BBA6]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#D4BBA6]">
                            <SelectItem value="low">Low - General inquiry</SelectItem>
                            <SelectItem value="medium">Medium - Need help soon</SelectItem>
                            <SelectItem value="high">High - Blocking my work</SelectItem>
                            <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[#4A3728]">Subject *</Label>
                    <Input
                        placeholder="Brief summary of your issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="border-[#D4BBA6]"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[#4A3728]">Description *</Label>
                    <Textarea
                        placeholder="Please describe your issue in detail..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="border-[#D4BBA6] min-h-[120px]"
                    />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} className="border-[#D4BBA6]">
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={submitting}
                        className="bg-[#4A3728] hover:bg-[#3A2A1E]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Submit Ticket
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default HelpCenter;
