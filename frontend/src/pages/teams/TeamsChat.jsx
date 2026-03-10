import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Users, Search, Send, Plus, RefreshCw, 
  CheckCircle, XCircle, Loader2, ChevronLeft, Settings,
  User, AtSign, MoreVertical, Phone, Video, Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Helper to decode HTML entities
const decodeHtml = (html) => {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

// Helper to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  return decodeHtml(html.replace(/<[^>]*>/g, ''));
};

export default function TeamsChat() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const messagesEndRef = useRef(null);
  
  const token = localStorage.getItem('sevora_token');

  useEffect(() => {
    // Get current user email for identifying own messages
    const userData = localStorage.getItem('sevora_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserEmail(user.email);
      } catch (e) {}
    }
    checkConnection();
  }, []);

  useEffect(() => {
    if (connected) {
      fetchChats();
    }
  }, [connected]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkConnection = async () => {
    try {
      const res = await fetch(`${API}/api/teams/auth/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
      }
    } catch (e) {
      console.error('Error checking Teams connection:', e);
    } finally {
      setLoading(false);
    }
  };

  const connectTeams = async () => {
    setConnecting(true);
    try {
      const configRes = await fetch(`${API}/api/teams/auth/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!configRes.ok) {
        throw new Error('Failed to get auth config');
      }
      
      const config = await configRes.json();
      
      const authUrl = new URL(`${config.authority}/oauth2/v2.0/authorize`);
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', window.location.origin + '/teams/callback');
      authUrl.searchParams.set('scope', config.scope_string);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('state', 'teams_connect');
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl.toString(),
        'Teams Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      const handleMessage = async (event) => {
        if (event.data.type === 'teams_auth_callback') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          if (event.data.code) {
            const callbackRes = await fetch(`${API}/api/teams/auth/callback?code=${event.data.code}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (callbackRes.ok) {
              toast.success('Teams connected successfully!');
              setConnected(true);
            } else {
              toast.error('Failed to connect Teams');
            }
          } else if (event.data.error) {
            toast.error(`Auth error: ${event.data.error}`);
          }
          
          setConnecting(false);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setConnecting(false);
      }, 300000);
      
    } catch (e) {
      console.error('Error connecting Teams:', e);
      toast.error('Failed to connect Teams');
      setConnecting(false);
    }
  };

  const disconnectTeams = async () => {
    try {
      const res = await fetch(`${API}/api/teams/auth/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConnected(false);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        toast.success('Teams disconnected');
      }
    } catch (e) {
      toast.error('Failed to disconnect');
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API}/api/teams/chats?with_preview=true&include_members=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (e) {
      console.error('Error fetching chats:', e);
    }
  };

  const fetchMessages = async (chatId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API}/api/teams/chats/${chatId}/messages?top=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).reverse());
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    setSending(true);
    try {
      const res = await fetch(`${API}/api/teams/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage, content_type: 'text' })
      });
      
      if (res.ok) {
        setNewMessage('');
        fetchMessages(selectedChat.id);
      } else {
        toast.error('Failed to send message');
      }
    } catch (e) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const searchForUsers = async (query) => {
    if (!query.trim()) {
      setSearchUsers([]);
      return;
    }
    
    setSearchingUsers(true);
    try {
      const res = await fetch(`${API}/api/teams/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setSearchingUsers(false);
    }
  };

  const startNewChat = async (userId) => {
    try {
      const res = await fetch(`${API}/api/teams/chats`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ member_ids: [userId] })
      });
      
      if (res.ok) {
        const data = await res.json();
        setShowNewChat(false);
        setUserSearchQuery('');
        setSearchUsers([]);
        fetchChats();
        setSelectedChat(data.chat);
        toast.success('Chat created');
      } else {
        toast.error('Failed to create chat');
      }
    } catch (e) {
      toast.error('Failed to create chat');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getChatDisplayName = (chat) => {
    // If it has a topic, use that
    if (chat.topic) return chat.topic;
    
    // For 1:1 chats, find the other person
    if (chat.chatType === 'oneOnOne' && chat.members && chat.members.length > 0) {
      // Try to find the other participant (not the current user)
      const otherMember = chat.members.find(m => {
        const email = m.email || m.mail || '';
        return email.toLowerCase() !== currentUserEmail.toLowerCase();
      });
      
      if (otherMember) {
        return otherMember.displayName || otherMember.email || 'Chat';
      }
      
      // If we can't find other member, use first member's name
      const firstMember = chat.members[0];
      if (firstMember?.displayName) {
        return firstMember.displayName;
      }
    }
    
    // For group chats without topic
    if (chat.chatType === 'group' && chat.members) {
      const names = chat.members
        .slice(0, 3)
        .map(m => m.displayName?.split(' ')[0] || 'User')
        .join(', ');
      return names + (chat.members.length > 3 ? '...' : '');
    }
    
    // Fallback: try to get name from last message
    if (chat.lastMessagePreview?.from?.user?.displayName) {
      return chat.lastMessagePreview.from.user.displayName;
    }
    
    return chat.chatType === 'group' ? 'Group Chat' : 'Chat';
  };

  const getChatInitials = (chat) => {
    const name = getChatDisplayName(chat);
    if (chat.chatType === 'group') return null; // Will show icon
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isOwnMessage = (message) => {
    const senderEmail = message.from?.user?.email || message.from?.user?.mail || '';
    return senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#464EB8]" />
      </div>
    );
  }

  // Not connected view
  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-[#E8D5C4] shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#464EB8] to-[#7B83EB] rounded-2xl flex items-center justify-center shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-[#4A3728]">Microsoft Teams Chat</CardTitle>
            <p className="text-[#6B5D52] mt-2">
              Chat with your team directly from Sevora
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-6 pt-4">
            <div className="bg-gradient-to-r from-[#F5EBE0] to-[#FDF8F3] rounded-xl p-5 text-left border border-[#E8D5C4]">
              <h4 className="font-semibold text-[#4A3728] mb-3">What you can do:</h4>
              <ul className="text-sm text-[#6B5D52] space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  View and send Teams chat messages
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  Start new conversations with team members
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  Access 1:1 and group chats seamlessly
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={connectTeams}
              disabled={connecting}
              className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white px-10 py-6 text-lg shadow-lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Connect Microsoft Teams
                </>
              )}
            </Button>
            
            <p className="text-xs text-[#9C8C74]">
              You'll be redirected to Microsoft to authorize the connection
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected view with chat interface
  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-xl border border-[#E8D5C4] overflow-hidden shadow-sm">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-[#E8D5C4] flex flex-col bg-[#FAFAFA]">
        {/* Header */}
        <div className="p-4 border-b border-[#E8D5C4] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#464EB8] to-[#7B83EB] rounded-lg flex items-center justify-center shadow">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#4A3728] text-sm">Teams Chat</h2>
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Connected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchChats}
                className="h-8 w-8 p-0 hover:bg-[#E8D5C4]"
                title="Refresh chats"
              >
                <RefreshCw className="w-4 h-4 text-[#6B5D52]" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewChat(true)}
                className="h-8 w-8 p-0 hover:bg-[#E8D5C4]"
                title="New chat"
              >
                <Plus className="w-4 h-4 text-[#6B5D52]" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8C74]" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-[#E8D5C4] h-9 bg-[#F5EBE0] focus:bg-white transition-colors"
            />
          </div>
        </div>
        
        {/* Chat List */}
        <ScrollArea className="flex-1">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center text-[#9C8C74]">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No chats found</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 border-b border-[#E8D5C4]/50 cursor-pointer transition-all ${
                  selectedChat?.id === chat.id 
                    ? 'bg-[#464EB8]/10 border-l-2 border-l-[#464EB8]' 
                    : 'hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 shadow-sm ${
                    chat.chatType === 'group' 
                      ? 'bg-gradient-to-br from-[#7B83EB] to-[#464EB8]' 
                      : 'bg-gradient-to-br from-[#464EB8] to-[#5B64D4]'
                  }`}>
                    {chat.chatType === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      getChatInitials(chat)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[#4A3728] truncate text-sm">
                        {getChatDisplayName(chat)}
                      </p>
                      <span className="text-xs text-[#9C8C74] flex-shrink-0 ml-2">
                        {formatTime(chat.lastMessagePreview?.createdDateTime)}
                      </span>
                    </div>
                    {chat.lastMessagePreview && (
                      <p className="text-xs text-[#6B5D52] truncate mt-1">
                        {stripHtml(chat.lastMessagePreview.body?.content)}
                      </p>
                    )}
                    {chat.chatType === 'group' && chat.members && (
                      <p className="text-xs text-[#9C8C74] mt-1">
                        {chat.members.length} members
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-3 border-t border-[#E8D5C4] bg-white">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={disconnectTeams}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Disconnect Teams
          </Button>
        </div>
      </div>
      
      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-[#E8D5C4] flex items-center justify-between bg-gradient-to-r from-white to-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-medium shadow ${
                  selectedChat.chatType === 'group' 
                    ? 'bg-gradient-to-br from-[#7B83EB] to-[#464EB8]' 
                    : 'bg-gradient-to-br from-[#464EB8] to-[#5B64D4]'
                }`}>
                  {selectedChat.chatType === 'group' ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    getChatInitials(selectedChat)
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#4A3728]">
                    {getChatDisplayName(selectedChat)}
                  </h3>
                  <p className="text-xs text-[#9C8C74]">
                    {selectedChat.chatType === 'group' 
                      ? `${selectedChat.members?.length || 0} members` 
                      : 'Direct Message'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-[#E8D5C4]" title="Voice call">
                  <Phone className="w-4 h-4 text-[#6B5D52]" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-[#E8D5C4]" title="Video call">
                  <Video className="w-4 h-4 text-[#6B5D52]" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-[#E8D5C4]" title="Chat info">
                  <Info className="w-4 h-4 text-[#6B5D52]" />
                </Button>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-[#FAFAFA] to-white">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-[#464EB8]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#9C8C74]">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, idx) => {
                    const isMe = isOwnMessage(message);
                    const senderName = message.from?.user?.displayName || 'Unknown';
                    const showSender = !isMe && (idx === 0 || messages[idx-1]?.from?.user?.id !== message.from?.user?.id);
                    
                    return (
                      <div
                        key={message.id || idx}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                          {showSender && (
                            <p className="text-xs font-medium text-[#464EB8] mb-1 ml-1">
                              {senderName}
                            </p>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                              isMe 
                                ? 'bg-gradient-to-r from-[#464EB8] to-[#5B64D4] text-white rounded-br-md' 
                                : 'bg-white border border-[#E8D5C4] text-[#4A3728] rounded-bl-md'
                            }`}
                          >
                            <div 
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: message.body?.content || '' 
                              }}
                            />
                          </div>
                          <p className={`text-[10px] text-[#9C8C74] mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatMessageTime(message.createdDateTime)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t border-[#E8D5C4] bg-white">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 border-[#E8D5C4] bg-[#F5EBE0] focus:bg-white transition-colors py-5"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white h-10 w-10 p-0 rounded-full shadow"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-[#FAFAFA] to-white">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#E8D5C4] to-[#D4BBA6] rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-[#6B5D52]" />
              </div>
              <h3 className="text-lg font-semibold text-[#4A3728]">Select a chat</h3>
              <p className="text-sm text-[#9C8C74] mt-1">
                Choose a conversation from the sidebar
              </p>
              <Button 
                onClick={() => setShowNewChat(true)}
                variant="outline"
                className="mt-4 border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#464EB8]" />
              Start New Chat
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8C74]" />
              <Input
                placeholder="Search for a person..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchForUsers(e.target.value);
                }}
                className="pl-9 border-[#D4BBA6] bg-[#F5EBE0] focus:bg-white"
              />
            </div>
            
            <ScrollArea className="h-60">
              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#464EB8]" />
                </div>
              ) : searchUsers.length > 0 ? (
                <div className="space-y-1">
                  {searchUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => startNewChat(user.id)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5EBE0] cursor-pointer transition-colors border border-transparent hover:border-[#E8D5C4]"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#464EB8] to-[#5B64D4] flex items-center justify-center text-white font-medium shadow">
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#4A3728] truncate">{user.displayName}</p>
                        <p className="text-sm text-[#9C8C74] truncate">{user.mail || user.userPrincipalName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 mx-auto mb-2 text-[#D4BBA6]" />
                  <p className="text-[#9C8C74]">No users found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="w-10 h-10 mx-auto mb-2 text-[#D4BBA6]" />
                  <p className="text-[#9C8C74]">Start typing to search for people</p>
                </div>
              )}
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChat(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
