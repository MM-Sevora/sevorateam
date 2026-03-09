import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FileText, MessageSquare, Ticket, Users, Clock,
    CheckCircle, AlertCircle, TrendingUp, Loader2, Plus, Edit, Trash2,
    Eye, EyeOff, Send, UserPlus, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import api from '../../lib/api';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    'open': { label: 'Open', color: 'bg-blue-100 text-blue-700' },
    'in_progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
    'waiting_user': { label: 'Waiting', color: 'bg-purple-100 text-purple-700' },
    'resolved': { label: 'Resolved', color: 'bg-green-100 text-green-700' },
    'closed': { label: 'Closed', color: 'bg-gray-100 text-gray-700' }
};

const PRIORITY_CONFIG = {
    'low': { label: 'Low', color: 'bg-gray-100 text-gray-600' },
    'medium': { label: 'Medium', color: 'bg-blue-100 text-blue-600' },
    'high': { label: 'High', color: 'bg-orange-100 text-orange-600' },
    'urgent': { label: 'Urgent', color: 'bg-red-100 text-red-600' }
};

const HelpAdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [dashboardData, setDashboardData] = useState(null);
    const [articles, setArticles] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [supportStaff, setSupportStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editArticle, setEditArticle] = useState(null);
    const [editFaq, setEditFaq] = useState(null);
    const [assignTicket, setAssignTicket] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (activeTab === 'articles') fetchArticles();
        if (activeTab === 'faqs') fetchFaqs();
        if (activeTab === 'tickets') { fetchTickets(); fetchSupportStaff(); }
    }, [activeTab]);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/help/admin/dashboard');
            setDashboardData(res.data);
        } catch (e) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchArticles = async () => {
        try {
            const res = await api.get('/help/articles?limit=100');
            setArticles(res.data);
        } catch (e) {
            console.error('Failed to fetch articles:', e);
        }
    };

    const fetchFaqs = async () => {
        try {
            const res = await api.get('/help/faqs?include_inactive=true');
            setFaqs(res.data);
        } catch (e) {
            console.error('Failed to fetch FAQs:', e);
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await api.get('/help/tickets?limit=50');
            setTickets(res.data);
        } catch (e) {
            console.error('Failed to fetch tickets:', e);
        }
    };

    const fetchSupportStaff = async () => {
        try {
            const res = await api.get('/help/support-staff');
            setSupportStaff(res.data);
        } catch (e) {
            console.error('Failed to fetch support staff:', e);
        }
    };

    const handlePublishArticle = async (article) => {
        try {
            await api.put(`/help/articles/${article.id}`, { status: 'published' });
            toast.success('Article published');
            fetchArticles();
            fetchDashboardData();
        } catch (e) {
            toast.error('Failed to publish article');
        }
    };

    const handleUnpublishArticle = async (article) => {
        try {
            await api.put(`/help/articles/${article.id}`, { status: 'draft' });
            toast.success('Article unpublished');
            fetchArticles();
            fetchDashboardData();
        } catch (e) {
            toast.error('Failed to unpublish article');
        }
    };

    const handleToggleFaq = async (faq) => {
        try {
            await api.put(`/help/faqs/${faq.id}`, { is_active: !faq.is_active });
            toast.success(faq.is_active ? 'FAQ hidden' : 'FAQ activated');
            fetchFaqs();
            fetchDashboardData();
        } catch (e) {
            toast.error('Failed to update FAQ');
        }
    };

    const handleAssignTicket = async (ticketId, staffId) => {
        try {
            await api.put(`/help/tickets/${ticketId}/assign?staff_id=${staffId}`);
            toast.success('Ticket assigned');
            fetchTickets();
            fetchDashboardData();
            setAssignTicket(null);
        } catch (e) {
            toast.error('Failed to assign ticket');
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#9C8C74]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDF8F3] p-6" data-testid="help-admin-dashboard">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#4A3728]">Help Center Admin</h1>
                        <p className="text-[#6B5D52]">Manage articles, FAQs, and support tickets</p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/help')}
                        className="border-[#D4BBA6]"
                    >
                        View Help Center
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white border border-[#E8D5C4] mb-6">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="articles" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            <FileText className="w-4 h-4 mr-2" />
                            Articles
                        </TabsTrigger>
                        <TabsTrigger value="faqs" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            FAQs
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
                            <Ticket className="w-4 h-4 mr-2" />
                            Tickets
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <StatCard 
                                title="Open Tickets" 
                                value={dashboardData?.tickets?.open || 0}
                                icon={AlertCircle}
                                color="text-blue-600"
                                bgColor="bg-blue-50"
                            />
                            <StatCard 
                                title="Unassigned" 
                                value={dashboardData?.tickets?.unassigned || 0}
                                icon={UserPlus}
                                color="text-orange-600"
                                bgColor="bg-orange-50"
                            />
                            <StatCard 
                                title="Resolved Today" 
                                value={dashboardData?.tickets?.resolved_today || 0}
                                icon={CheckCircle}
                                color="text-green-600"
                                bgColor="bg-green-50"
                            />
                            <StatCard 
                                title="Draft Articles" 
                                value={dashboardData?.articles?.draft || 0}
                                icon={FileText}
                                color="text-purple-600"
                                bgColor="bg-purple-50"
                            />
                        </div>

                        {/* Recent Tickets */}
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader>
                                <CardTitle className="text-lg text-[#4A3728]">Recent Tickets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-[#E8D5C4]">
                                    {dashboardData?.recent_tickets?.map(ticket => {
                                        const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                        const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                        
                                        return (
                                            <div 
                                                key={ticket.id}
                                                className="py-3 flex items-center justify-between hover:bg-[#FDF8F3] -mx-4 px-4 cursor-pointer"
                                                onClick={() => navigate(`/help/tickets/${ticket.id}`)}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono text-[#9C8C74]">
                                                            {ticket.ticket_number}
                                                        </span>
                                                        <Badge className={`text-xs ${statusConfig.color}`}>
                                                            {statusConfig.label}
                                                        </Badge>
                                                        <Badge className={`text-xs ${priorityConfig.color}`}>
                                                            {priorityConfig.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-medium text-[#4A3728]">
                                                        {ticket.subject}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-[#9C8C74]">
                                                        {formatDate(ticket.created_at)}
                                                    </p>
                                                    {ticket.assigned_to_name && (
                                                        <p className="text-xs text-[#6B5D52]">
                                                            {ticket.assigned_to_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Articles Tab */}
                    <TabsContent value="articles">
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg text-[#4A3728]">Articles</CardTitle>
                                    <CardDescription>
                                        {articles.filter(a => a.status === 'published').length} published, {articles.filter(a => a.status === 'draft').length} drafts
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="divide-y divide-[#E8D5C4]">
                                        {articles.map(article => (
                                            <div key={article.id} className="py-3 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge 
                                                            className={article.status === 'published' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-gray-100 text-gray-700'
                                                            }
                                                        >
                                                            {article.status}
                                                        </Badge>
                                                        <span className="text-xs text-[#9C8C74]">
                                                            {article.module_key}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-[#4A3728]">
                                                        {article.title}
                                                    </p>
                                                    <p className="text-xs text-[#6B5D52] mt-1">
                                                        {article.views} views • {article.helpful_count} helpful
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {article.status === 'draft' ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handlePublishArticle(article)}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            Publish
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleUnpublishArticle(article)}
                                                            className="border-[#D4BBA6]"
                                                        >
                                                            <EyeOff className="w-4 h-4 mr-1" />
                                                            Unpublish
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => navigate(`/help/articles/${article.id}`)}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FAQs Tab */}
                    <TabsContent value="faqs">
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg text-[#4A3728]">FAQs</CardTitle>
                                    <CardDescription>
                                        {faqs.filter(f => f.is_active).length} active, {faqs.filter(f => !f.is_active).length} hidden
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="divide-y divide-[#E8D5C4]">
                                        {faqs.map(faq => (
                                            <div key={faq.id} className="py-3 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge 
                                                            className={faq.is_active 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-gray-100 text-gray-700'
                                                            }
                                                        >
                                                            {faq.is_active ? 'Active' : 'Hidden'}
                                                        </Badge>
                                                        <span className="text-xs text-[#9C8C74]">
                                                            {faq.module_key}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-[#4A3728]">
                                                        {faq.question}
                                                    </p>
                                                    <p className="text-xs text-[#6B5D52] mt-1 line-clamp-1">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleToggleFaq(faq)}
                                                        className="border-[#D4BBA6]"
                                                    >
                                                        {faq.is_active ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-1" />
                                                                Hide
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Show
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tickets Tab */}
                    <TabsContent value="tickets">
                        <div className="grid grid-cols-4 gap-6">
                            {/* Tickets List */}
                            <div className="col-span-3">
                                <Card className="bg-white border-[#E8D5C4]">
                                    <CardHeader>
                                        <CardTitle className="text-lg text-[#4A3728]">All Tickets</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[500px]">
                                            <div className="divide-y divide-[#E8D5C4]">
                                                {tickets.map(ticket => {
                                                    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                                    const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                                                    
                                                    return (
                                                        <div key={ticket.id} className="py-3 flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs font-mono text-[#9C8C74]">
                                                                        {ticket.ticket_number}
                                                                    </span>
                                                                    <Badge className={`text-xs ${statusConfig.color}`}>
                                                                        {statusConfig.label}
                                                                    </Badge>
                                                                    <Badge className={`text-xs ${priorityConfig.color}`}>
                                                                        {priorityConfig.label}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm font-medium text-[#4A3728]">
                                                                    {ticket.subject}
                                                                </p>
                                                                <p className="text-xs text-[#6B5D52] mt-1">
                                                                    {ticket.requester_name} • {ticket.module_name}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!ticket.assigned_to && ticket.status !== 'closed' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => setAssignTicket(ticket)}
                                                                        className="bg-[#4A3728] hover:bg-[#3A2A1E]"
                                                                    >
                                                                        <UserPlus className="w-4 h-4 mr-1" />
                                                                        Assign
                                                                    </Button>
                                                                )}
                                                                {ticket.assigned_to && (
                                                                    <Badge variant="outline" className="border-[#D4BBA6]">
                                                                        {ticket.assigned_to_name}
                                                                    </Badge>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => navigate(`/help/tickets/${ticket.id}`)}
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Support Staff */}
                            <div>
                                <Card className="bg-white border-[#E8D5C4]">
                                    <CardHeader>
                                        <CardTitle className="text-sm text-[#4A3728]">Support Staff</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {supportStaff.map(staff => (
                                            <div 
                                                key={staff.id}
                                                className="p-3 rounded-lg bg-[#FDF8F3] border border-[#E8D5C4]"
                                            >
                                                <p className="text-sm font-medium text-[#4A3728]">
                                                    {staff.name}
                                                </p>
                                                <p className="text-xs text-[#6B5D52]">{staff.role}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className="bg-blue-100 text-blue-700">
                                                        {staff.open_tickets} open
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Assign Ticket Dialog */}
            <Dialog open={!!assignTicket} onOpenChange={() => setAssignTicket(null)}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#4A3728]">Assign Ticket</DialogTitle>
                        <DialogDescription>
                            Assign {assignTicket?.ticket_number} to a support staff member
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Staff Member</Label>
                            <Select onValueChange={(value) => handleAssignTicket(assignTicket?.id, value)}>
                                <SelectTrigger className="border-[#D4BBA6]">
                                    <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[#D4BBA6]">
                                    {supportStaff.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.name} ({staff.open_tickets} open tickets)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-[#6B5D52]">{title}</p>
                    <p className="text-2xl font-semibold text-[#4A3728]">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default HelpAdminDashboard;
