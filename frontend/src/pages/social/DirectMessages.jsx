import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, RefreshCw, Loader2, User, Clock,
  Instagram, Facebook, AlertCircle, CheckCircle, ExternalLink,
  ChevronRight, ArrowLeft, Info
} from 'lucide-react';
import { FaInstagram, FaFacebook } from 'react-icons/fa';

const PLATFORM_CONFIG = {
  instagram: {
    icon: FaInstagram,
    color: '#E4405F',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    name: 'Instagram'
  },
  facebook: {
    icon: FaFacebook,
    color: '#1877F2',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    name: 'Facebook'
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
};

const SetupBanner = ({ status }) => {
  if (!status || status.has_messaging_permissions) return null;
  
  const completedSteps = status.setup_steps?.filter(s => s.status === 'completed').length || 0;
  const totalSteps = status.setup_steps?.length || 4;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">DM Access Setup Required</h3>
          <p className="text-sm text-amber-700 mt-1">
            Complete the following steps to enable real-time DM synchronization. Currently showing simulated data.
          </p>
          <div className="mt-3 space-y-2">
            {status.setup_steps?.map(step => (
              <div key={step.step} className="flex items-center gap-2">
                {step.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-amber-400" />
                )}
                <span className={`text-sm ${step.status === 'completed' ? 'text-green-700' : 'text-amber-800'}`}>
                  {step.title}
                </span>
                {step.url && step.status !== 'completed' && (
                  <a 
                    href={step.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-xs text-amber-600">{completedSteps}/{totalSteps}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConversationItem = ({ conversation, isActive, onClick }) => {
  const platform = PLATFORM_CONFIG[conversation.platform];
  const PlatformIcon = platform?.icon || MessageSquare;
  
  return (
    <div
      onClick={onClick}
      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-amber-50 border-l-2 border-l-amber-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <img
            src={conversation.participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.participant.name)}&background=random`}
            alt={conversation.participant.name}
            className="w-10 h-10 rounded-full"
          />
          <div 
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${platform?.bgColor || 'bg-gray-100'}`}
          >
            <PlatformIcon className="w-3 h-3" style={{ color: platform?.color }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#4A3728] truncate">{conversation.participant.name}</span>
            <span className="text-[10px] text-gray-400">{formatTime(conversation.last_message?.timestamp)}</span>
          </div>
          {conversation.participant.handle && (
            <p className="text-xs text-gray-500">{conversation.participant.handle}</p>
          )}
          <p className={`text-sm mt-1 truncate ${conversation.unread_count > 0 ? 'font-medium text-[#4A3728]' : 'text-gray-500'}`}>
            {conversation.last_message?.is_from_us && <span className="text-gray-400">You: </span>}
            {conversation.last_message?.text}
          </p>
        </div>
        {conversation.unread_count > 0 && (
          <Badge className="bg-amber-500 text-white text-xs">{conversation.unread_count}</Badge>
        )}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-amber-500 text-white rounded-br-sm'
              : 'bg-gray-100 text-[#4A3728] rounded-bl-sm'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
        <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

const ConversationView = ({ conversation, onBack, onSend, dataSource }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  const platform = PLATFORM_CONFIG[conversation?.platform];
  const PlatformIcon = platform?.icon || MessageSquare;
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);
  
  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    try {
      await onSend(conversation.id, message.trim(), conversation.platform);
      setMessage('');
    } catch (error) {
      // Error handled in parent
    } finally {
      setSending(false);
    }
  };
  
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a conversation to view messages</p>
        </div>
      </div>
    );
  }
  
  // Sort messages oldest first for display
  const sortedMessages = [...(conversation.messages || [])].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img
          src={conversation.participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.participant.name)}&background=random`}
          alt={conversation.participant.name}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#4A3728]">{conversation.participant.name}</span>
            <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${platform?.bgColor}`}>
              <PlatformIcon className="w-3 h-3" style={{ color: platform?.color }} />
              <span className="text-[10px]" style={{ color: platform?.color }}>{platform?.name}</span>
            </div>
          </div>
          {conversation.participant.handle && (
            <p className="text-xs text-gray-500">{conversation.participant.handle}</p>
          )}
        </div>
        {dataSource === 'simulated' && (
          <Badge variant="outline" className="text-[10px] text-gray-400">Simulated</Badge>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAF8]">
        {sortedMessages.map((msg, idx) => (
          <MessageBubble key={msg.id || idx} message={msg} isOwn={msg.is_from_us} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {dataSource === 'simulated' ? (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Sending messages requires API permissions</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={!message.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DirectMessages() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [dataSource, setDataSource] = useState('simulated');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState(null);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, convsRes, statsRes] = await Promise.all([
        api.get('/social/inbox/dm/status'),
        api.get('/social/inbox/dm/conversations'),
        api.get('/social/inbox/dm/stats')
      ]);
      
      setStatus(statusRes.data);
      setConversations(convsRes.data.conversations || []);
      setDataSource(convsRes.data.is_live_data ? 'live' : 'simulated');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching DM data:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (conversationId, text, platform) => {
    try {
      await api.post(`/social/inbox/dm/conversations/${conversationId}/send`, {
        text,
        platform
      });
      toast.success('Message sent');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
      throw error;
    }
  };
  
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participant.handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.text?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = !platformFilter || conv.platform === platformFilter;
    
    return matchesSearch && matchesPlatform;
  });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="p-6 animate-fade-in" data-testid="dm-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5D4A3A] mb-1">SOCIAL INBOX</p>
          <h1 className="text-2xl font-bold text-[#4A3728] tracking-tight">Direct Messages</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-[#5D4A3A]">Manage conversations from all platforms</p>
            {dataSource === 'live' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                Simulated Data
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Setup Banner */}
      <SetupBanner status={status} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#4A3728]">{stats?.overview?.total_conversations || 0}</p>
                <p className="text-xs text-gray-500">Conversations</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats?.overview?.total_unread || 0}</p>
                <p className="text-xs text-gray-500">Unread</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#4A3728]">{stats?.response_metrics?.avg_response_time_minutes || 0}m</p>
                <p className="text-xs text-gray-500">Avg Response</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats?.response_metrics?.response_rate_percent || 0}%</p>
                <p className="text-xs text-gray-500">Response Rate</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card className="bg-white border-gray-200 overflow-hidden">
        <div className="flex h-[600px]">
          {/* Conversation List */}
          <div className={`w-full lg:w-96 border-r border-gray-100 flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
            {/* Search & Filters */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={platformFilter === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter(null)}
                  className="flex-1"
                >
                  All
                </Button>
                <Button
                  variant={platformFilter === 'instagram' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter('instagram')}
                  className="flex-1"
                >
                  <FaInstagram className="w-3 h-3 mr-1" /> Instagram
                </Button>
                <Button
                  variant={platformFilter === 'facebook' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter('facebook')}
                  className="flex-1"
                >
                  <FaFacebook className="w-3 h-3 mr-1" /> Facebook
                </Button>
              </div>
            </div>
            
            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={selectedConversation?.id === conv.id}
                    onClick={() => setSelectedConversation(conv)}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* Conversation View */}
          <ConversationView
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
            onSend={handleSendMessage}
            dataSource={dataSource}
          />
        </div>
      </Card>
    </div>
  );
}
