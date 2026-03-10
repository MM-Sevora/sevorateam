import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Users, Search, Send, Plus, RefreshCw, 
  CheckCircle, XCircle, Loader2, ChevronLeft, Settings,
  User, AtSign, MoreVertical
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TeamsChat() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  
  const token = localStorage.getItem('sevora_token');

  useEffect(() => {
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
      // Get auth config
      const configRes = await fetch(`${API}/api/teams/auth/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!configRes.ok) {
        throw new Error('Failed to get auth config');
      }
      
      const config = await configRes.json();
      
      // Build OAuth URL
      const authUrl = new URL(`${config.authority}/oauth2/v2.0/authorize`);
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', window.location.origin + '/teams/callback');
      authUrl.searchParams.set('scope', config.scope_string);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('state', 'teams_connect');
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl.toString(),
        'Teams Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Listen for callback
      const handleMessage = async (event) => {
        if (event.data.type === 'teams_auth_callback') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          if (event.data.code) {
            // Exchange code for tokens
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
      
      // Timeout after 5 minutes
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
      const res = await fetch(`${API}/api/teams/chats?with_preview=true`, {
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
    try {
      const res = await fetch(`${API}/api/teams/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages || []).reverse());
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
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
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChatDisplayName = (chat) => {
    if (chat.topic) return chat.topic;
    if (chat.chatType === 'oneOnOne' && chat.members) {
      // Find the other person
      const other = chat.members.find(m => m.userId !== localStorage.getItem('sevora_user_id'));
      return other?.displayName || 'Chat';
    }
    return chat.chatType === 'group' ? 'Group Chat' : 'Chat';
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  // Not connected view
  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-[#E8D5C4]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#464EB8] rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-[#4A3728]">Connect Microsoft Teams</CardTitle>
            <p className="text-[#6B5D52] mt-2">
              Chat with your team directly from Sevora using Microsoft Teams
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-[#F5EBE0] rounded-lg p-4 text-left">
              <h4 className="font-medium text-[#4A3728] mb-2">What you can do:</h4>
              <ul className="text-sm text-[#6B5D52] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  View and send Teams chat messages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Start new conversations with team members
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Access 1:1 and group chats
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={connectTeams}
              disabled={connecting}
              className="bg-[#464EB8] hover:bg-[#3d44a5] text-white px-8"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Connect Teams
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
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-lg border border-[#E8D5C4] overflow-hidden">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-[#E8D5C4] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E8D5C4]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#464EB8] rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-[#4A3728]">Teams Chat</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchChats}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewChat(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8C74]" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-[#D4BBA6] h-9"
            />
          </div>
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-[#9C8C74]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats found</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 border-b border-[#E8D5C4] cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-[#F5EBE0]' : 'hover:bg-[#FDF8F3]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#464EB8] flex items-center justify-center text-white font-medium flex-shrink-0">
                    {chat.chatType === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      getChatDisplayName(chat).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[#4A3728] truncate">
                        {getChatDisplayName(chat)}
                      </p>
                      <span className="text-xs text-[#9C8C74] flex-shrink-0 ml-2">
                        {formatTime(chat.lastMessagePreview?.createdDateTime)}
                      </span>
                    </div>
                    {chat.lastMessagePreview && (
                      <p className="text-sm text-[#6B5D52] truncate mt-0.5">
                        {chat.lastMessagePreview.body?.content?.replace(/<[^>]*>/g, '') || ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-[#E8D5C4] bg-[#FDF8F3]">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={disconnectTeams}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Disconnect Teams
          </Button>
        </div>
      </div>
      
      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#E8D5C4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#464EB8] flex items-center justify-center text-white font-medium">
                  {selectedChat.chatType === 'group' ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    getChatDisplayName(selectedChat).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#4A3728]">
                    {getChatDisplayName(selectedChat)}
                  </h3>
                  <p className="text-xs text-[#9C8C74]">
                    {selectedChat.chatType === 'group' ? 'Group Chat' : '1:1 Chat'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAFA]">
              {messages.map((message, idx) => {
                const isMe = message.from?.user?.id === localStorage.getItem('sevora_azure_id');
                return (
                  <div
                    key={message.id || idx}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                      {!isMe && (
                        <p className="text-xs text-[#9C8C74] mb-1 ml-1">
                          {message.from?.user?.displayName || 'Unknown'}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isMe 
                            ? 'bg-[#464EB8] text-white rounded-br-md' 
                            : 'bg-white border border-[#E8D5C4] text-[#4A3728] rounded-bl-md'
                        }`}
                      >
                        <div 
                          className="text-sm"
                          dangerouslySetInnerHTML={{ 
                            __html: message.body?.content || '' 
                          }}
                        />
                      </div>
                      <p className={`text-xs text-[#9C8C74] mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(message.createdDateTime)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-[#E8D5C4] bg-white">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 border-[#D4BBA6]"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#464EB8] hover:bg-[#3d44a5] text-white"
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
          <div className="flex-1 flex items-center justify-center bg-[#FAFAFA]">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" />
              <h3 className="text-lg font-medium text-[#4A3728]">Select a chat</h3>
              <p className="text-sm text-[#9C8C74]">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="bg-white border-[#D4BBA6]">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Start New Chat</DialogTitle>
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
                className="pl-9 border-[#D4BBA6]"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#9C8C74]" />
                </div>
              ) : searchUsers.length > 0 ? (
                <div className="space-y-1">
                  {searchUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => startNewChat(user.id)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F5EBE0] cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#464EB8] flex items-center justify-center text-white font-medium">
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-[#4A3728]">{user.displayName}</p>
                        <p className="text-sm text-[#9C8C74]">{user.mail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery ? (
                <p className="text-center text-[#9C8C74] py-8">No users found</p>
              ) : (
                <p className="text-center text-[#9C8C74] py-8">
                  Start typing to search for people
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChat(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
