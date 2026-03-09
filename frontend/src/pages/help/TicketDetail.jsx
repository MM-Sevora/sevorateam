import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ChevronRight, Send, Clock, CheckCircle, AlertCircle,
    XCircle, MessageSquare, User, Loader2, Paperclip
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

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

const TYPE_LABELS = {
    'bug': 'Bug Report',
    'question': 'Question',
    'feature_request': 'Feature Request',
    'how_to': 'How To',
    'other': 'Other'
};

const TicketDetail = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [updating, setUpdating] = useState(false);

    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

    useEffect(() => {
        if (ticketId) {
            fetchTicket();
        }
    }, [ticketId]);

    const fetchTicket = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/help/tickets/${ticketId}`);
            setTicket(res.data);
        } catch (e) {
            console.error('Failed to fetch ticket:', e);
            toast.error('Failed to load ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        
        setSubmitting(true);
        try {
            await api.post(`/help/tickets/${ticketId}/comments`, {
                content: newComment,
                is_internal: false
            });
            toast.success('Comment added');
            setNewComment('');
            fetchTicket();
        } catch (e) {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        setUpdating(true);
        try {
            await api.put(`/help/tickets/${ticketId}`, { status: newStatus });
            toast.success('Status updated');
            fetchTicket();
        } catch (e) {
            toast.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!window.confirm('Are you sure you want to close this ticket?')) return;
        await handleUpdateStatus('closed');
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#9C8C74]" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] p-6">
                <div className="max-w-4xl mx-auto text-center py-12">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" />
                    <h2 className="text-xl font-semibold text-[#4A3728]">Ticket not found</h2>
                    <Button 
                        onClick={() => navigate('/help?tab=tickets')} 
                        className="mt-4 bg-[#4A3728]"
                    >
                        Back to Tickets
                    </Button>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
    const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-[#FDF8F3] p-6" data-testid="ticket-detail">
            <div className="max-w-4xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[#6B5D52] mb-6">
                    <button 
                        onClick={() => navigate('/help')}
                        className="hover:text-[#4A3728] transition-colors"
                    >
                        Help Center
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <button 
                        onClick={() => navigate('/help?tab=tickets')}
                        className="hover:text-[#4A3728] transition-colors"
                    >
                        My Tickets
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[#4A3728] font-medium">{ticket.ticket_number}</span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-[#9C8C74]">
                                {ticket.ticket_number}
                            </span>
                            <Badge className={statusConfig.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                            </Badge>
                            <Badge className={priorityConfig.color}>
                                {priorityConfig.label}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-semibold text-[#4A3728]">
                            {ticket.subject}
                        </h1>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/help?tab=tickets')}
                        className="border-[#D4BBA6]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="col-span-2 space-y-6">
                        {/* Original Description */}
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#4A3728] flex items-center justify-center text-white font-medium">
                                        {ticket.requester_name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#4A3728]">
                                            {ticket.requester_name}
                                        </p>
                                        <p className="text-xs text-[#9C8C74]">
                                            {formatDate(ticket.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-[#4A3728] whitespace-pre-wrap">
                                    {ticket.description}
                                </p>
                                {ticket.attachments?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
                                        <p className="text-sm text-[#6B5D52] mb-2">Attachments:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {ticket.attachments.map((url, i) => (
                                                <a
                                                    key={i}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                >
                                                    <Paperclip className="w-3 h-3" />
                                                    Attachment {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Comments Thread */}
                        {ticket.comments?.length > 0 && (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardHeader>
                                    <CardTitle className="text-lg text-[#4A3728]">
                                        Conversation ({ticket.comments.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {ticket.comments.map((comment) => (
                                        <div 
                                            key={comment.id}
                                            className={`p-4 rounded-lg ${
                                                comment.user_id === ticket.requester_id
                                                    ? 'bg-[#FDF8F3] ml-0 mr-8'
                                                    : 'bg-blue-50 ml-8 mr-0'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                                    comment.user_id === ticket.requester_id
                                                        ? 'bg-[#4A3728]'
                                                        : 'bg-blue-600'
                                                }`}>
                                                    {comment.user_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#4A3728]">
                                                        {comment.user_name}
                                                        {comment.user_id !== ticket.requester_id && (
                                                            <Badge className="ml-2 text-[10px] bg-blue-100 text-blue-700">
                                                                Support
                                                            </Badge>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-[#9C8C74]">
                                                        {formatDate(comment.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-[#4A3728] whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Add Comment */}
                        {ticket.status !== 'closed' && (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardHeader>
                                    <CardTitle className="text-lg text-[#4A3728]">
                                        Add a Reply
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        placeholder="Type your message..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="border-[#D4BBA6] min-h-[100px] mb-4"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleAddComment}
                                            disabled={submitting || !newComment.trim()}
                                            className="bg-[#4A3728] hover:bg-[#3A2A1E]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send Reply
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Ticket Info */}
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardHeader>
                                <CardTitle className="text-sm text-[#6B5D52]">
                                    Ticket Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-[#9C8C74] mb-1">Module</p>
                                    <p className="text-sm font-medium text-[#4A3728]">
                                        {ticket.module_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9C8C74] mb-1">Type</p>
                                    <p className="text-sm font-medium text-[#4A3728]">
                                        {TYPE_LABELS[ticket.issue_type] || ticket.issue_type}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9C8C74] mb-1">Created</p>
                                    <p className="text-sm font-medium text-[#4A3728]">
                                        {formatDate(ticket.created_at)}
                                    </p>
                                </div>
                                {ticket.assigned_to_name && (
                                    <div>
                                        <p className="text-xs text-[#9C8C74] mb-1">Assigned To</p>
                                        <p className="text-sm font-medium text-[#4A3728]">
                                            {ticket.assigned_to_name}
                                        </p>
                                    </div>
                                )}
                                {ticket.resolved_at && (
                                    <div>
                                        <p className="text-xs text-[#9C8C74] mb-1">Resolved</p>
                                        <p className="text-sm font-medium text-[#4A3728]">
                                            {formatDate(ticket.resolved_at)}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        {ticket.status !== 'closed' && (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardHeader>
                                    <CardTitle className="text-sm text-[#6B5D52]">
                                        Actions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {isAdmin && (
                                        <div>
                                            <p className="text-xs text-[#9C8C74] mb-2">Update Status</p>
                                            <Select
                                                value={ticket.status}
                                                onValueChange={handleUpdateStatus}
                                                disabled={updating}
                                            >
                                                <SelectTrigger className="border-[#D4BBA6]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-[#D4BBA6]">
                                                    <SelectItem value="open">Open</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="waiting_user">Waiting on User</SelectItem>
                                                    <SelectItem value="resolved">Resolved</SelectItem>
                                                    <SelectItem value="closed">Closed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    
                                    {ticket.status === 'resolved' && (
                                        <Button
                                            onClick={handleCloseTicket}
                                            variant="outline"
                                            className="w-full border-[#D4BBA6]"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Close Ticket
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Resolution Notes */}
                        {ticket.resolution_notes && (
                            <Card className="bg-green-50 border-green-200">
                                <CardHeader>
                                    <CardTitle className="text-sm text-green-700">
                                        Resolution
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-green-800">
                                        {ticket.resolution_notes}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
