import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Users, Search, Send, Plus, RefreshCw, 
  CheckCircle, XCircle, Loader2, ChevronLeft, Settings,
  User, AtSign, MoreVertical, Phone, Video, Info, ListTodo,
  Calendar, Flag, FolderKanban
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
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
  const [currentUserId, setCurrentUserId] = useState('');
  const messagesEndRef = useRef(null);
  
  // Task creation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskMessage, setTaskMessage] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskType, setTaskType] = useState('project'); // 'project' or 'personal'
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'medium',
    due_date: ''
  });
  
  const token = localStorage.getItem('sevora_token');

  useEffect(() => {
    // Get current user email and ID for identifying own messages
    const userData = localStorage.getItem('sevora_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserEmail(user.email);
        setCurrentUserId(user.id);
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

  // Fetch projects for task creation
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API}/api/projects/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data || []);
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch employees for task assignment
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter to only active users
        setEmployees((data || []).filter(u => u.status === 'active'));
      }
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  };

  // Open task creation modal with message content
  const openTaskModal = (message) => {
    const messageContent = stripHtml(message.body?.content || '');
    const senderName = message.from?.user?.displayName || 'Unknown';
    const chatName = getChatDisplayName(selectedChat);
    
    setTaskMessage(message);
    setTaskType('project');
    setTaskForm({
      name: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
      description: `From Teams chat with ${chatName}:\n\n"${messageContent}"\n\n— ${senderName}`,
      project_id: '',
      assignee_id: '',
      priority: 'medium',
      due_date: ''
    });
    fetchProjects();
    fetchEmployees();
    setShowTaskModal(true);
  };

  // Create task from message
  const createTaskFromMessage = async () => {
    if (!taskForm.name.trim()) {
      toast.error('Please fill in task name');
      return;
    }
    
    if (taskType === 'project' && !taskForm.project_id) {
      toast.error('Please select a project');
      return;
    }
    
    setCreatingTask(true);
    try {
      let endpoint = `${API}/api/projects/tasks`;
      let body = {
        name: taskForm.name,
        description: taskForm.description,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'todo',
        source: 'teams_chat'
      };

      // Get actual assignee ID (handle 'self' value)
      const actualAssigneeId = taskForm.assignee_id === 'self' || !taskForm.assignee_id 
        ? currentUserId 
        : taskForm.assignee_id;
      
      if (taskType === 'personal') {
        // Create personal task (My Tasks)
        endpoint = `${API}/api/projects/my-tasks`;
        if (actualAssigneeId && actualAssigneeId !== currentUserId) {
          // If assigning to someone else
          body.assigned_to = actualAssigneeId;
        }
      } else {
        // Project task
        body.project_id = taskForm.project_id;
        if (actualAssigneeId) {
          body.assigned_to = actualAssigneeId;
        }
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        const assigneeName = actualAssigneeId && actualAssigneeId !== currentUserId
          ? employees.find(e => e.id === actualAssigneeId)?.name || 'team member'
          : 'yourself';
        toast.success(`Task created and assigned to ${assigneeName}!`);
        setShowTaskModal(false);
        setTaskMessage(null);
        setTaskForm({ name: '', description: '', project_id: '', assignee_id: '', priority: 'medium', due_date: '' });
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to create task');
      }
    } catch (e) {
      toast.error('Failed to create task');
    } finally {
      setCreatingTask(false);
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
      {/* Chat List Sidebar - Narrower */}
      <div className="w-64 border-r border-[#E8D5C4] flex flex-col bg-[#FAFAFA]">
        {/* Header */}
        <div className="p-3 border-b border-[#E8D5C4] bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#464EB8] to-[#7B83EB] rounded-lg flex items-center justify-center shadow">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-[#4A3728] text-xs">Teams Chat</h2>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Connected
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchChats}
                className="h-7 w-7 p-0 hover:bg-[#E8D5C4]"
                title="Refresh chats"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#6B5D52]" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNewChat(true)}
                className="h-7 w-7 p-0 hover:bg-[#E8D5C4]"
                title="New chat"
              >
                <Plus className="w-3.5 h-3.5 text-[#6B5D52]" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C8C74]" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-[#E8D5C4] h-8 text-xs bg-[#F5EBE0] focus:bg-white transition-colors"
            />
          </div>
        </div>
        
        {/* Chat List */}
        <ScrollArea className="flex-1">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-[#9C8C74]">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No chats found</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`px-3 py-2.5 border-b border-[#E8D5C4]/30 cursor-pointer transition-all ${
                  selectedChat?.id === chat.id 
                    ? 'bg-[#464EB8]/10 border-l-2 border-l-[#464EB8]' 
                    : 'hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                    chat.chatType === 'group' 
                      ? 'bg-gradient-to-br from-[#7B83EB] to-[#464EB8]' 
                      : 'bg-gradient-to-br from-[#464EB8] to-[#5B64D4]'
                  }`}>
                    {chat.chatType === 'group' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      getChatInitials(chat)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-medium text-[#4A3728] truncate text-xs">
                        {getChatDisplayName(chat)}
                      </p>
                      <span className="text-[10px] text-[#9C8C74] flex-shrink-0">
                        {formatTime(chat.lastMessagePreview?.createdDateTime)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B5D52] truncate mt-0.5">
                      {chat.lastMessagePreview 
                        ? stripHtml(chat.lastMessagePreview.body?.content)
                        : chat.chatType === 'group' 
                          ? `${chat.members?.length || 0} members`
                          : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-2 border-t border-[#E8D5C4] bg-white">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={disconnectTeams}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] h-7"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Disconnect
          </Button>
        </div>
      </div>
      
      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Chat Header - Compact */}
            <div className="px-4 py-3 border-b border-[#E8D5C4] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  selectedChat.chatType === 'group' 
                    ? 'bg-gradient-to-br from-[#7B83EB] to-[#464EB8]' 
                    : 'bg-gradient-to-br from-[#464EB8] to-[#5B64D4]'
                }`}>
                  {selectedChat.chatType === 'group' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    getChatInitials(selectedChat)
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#4A3728] text-sm">
                    {getChatDisplayName(selectedChat)}
                  </h3>
                  <p className="text-[11px] text-[#9C8C74]">
                    {selectedChat.chatType === 'group' 
                      ? `${selectedChat.members?.length || 0} members` 
                      : 'Direct Message'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#E8D5C4] rounded-full" title="Voice call">
                  <Phone className="w-4 h-4 text-[#6B5D52]" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#E8D5C4] rounded-full" title="Video call">
                  <Video className="w-4 h-4 text-[#6B5D52]" />
                </Button>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3 bg-[#FAFAFA]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-[#464EB8]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#9C8C74]">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, idx) => {
                    const isMe = isOwnMessage(message);
                    const senderName = message.from?.user?.displayName || 'Unknown';
                    const showSender = !isMe && (idx === 0 || messages[idx-1]?.from?.user?.id !== message.from?.user?.id);
                    
                    return (
                      <div
                        key={message.id || idx}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'} relative`}>
                          {showSender && (
                            <p className="text-[11px] font-medium text-[#464EB8] mb-1 ml-1">
                              {senderName}
                            </p>
                          )}
                          <div className="flex items-start gap-1">
                            {/* Convert to Task button - shows on hover */}
                            {!isMe && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-[#E8D5C4]"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5 text-[#6B5D52]" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-white border-[#D4BBA6]">
                                  <DropdownMenuItem 
                                    onClick={() => openTaskModal(message)}
                                    className="cursor-pointer text-[#4A3728] text-xs"
                                  >
                                    <ListTodo className="w-3.5 h-3.5 mr-2 text-[#464EB8]" />
                                    Convert to Task
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <div
                              className={`rounded-2xl px-3 py-2 ${
                                isMe 
                                  ? 'bg-gradient-to-r from-[#464EB8] to-[#5B64D4] text-white rounded-br-sm' 
                                  : 'bg-white border border-[#E8D5C4] text-[#4A3728] rounded-bl-sm shadow-sm'
                              }`}
                            >
                              <div 
                                className="text-[13px] leading-relaxed"
                                dangerouslySetInnerHTML={{ 
                                  __html: message.body?.content || '' 
                                }}
                              />
                            </div>
                            {/* Convert to Task button for own messages - shows on hover */}
                            {isMe && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-[#E8D5C4]"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5 text-[#6B5D52]" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-[#D4BBA6]">
                                  <DropdownMenuItem 
                                    onClick={() => openTaskModal(message)}
                                    className="cursor-pointer text-[#4A3728] text-xs"
                                  >
                                    <ListTodo className="w-3.5 h-3.5 mr-2 text-[#464EB8]" />
                                    Convert to Task
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <p className={`text-[10px] text-[#9C8C74] mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-7'}`}>
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
            
            {/* Message Input - Compact */}
            <div className="p-3 border-t border-[#E8D5C4] bg-white">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 border-[#E8D5C4] bg-[#F5EBE0] focus:bg-white transition-colors h-9 text-sm"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white h-9 w-9 p-0 rounded-full"
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
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#E8D5C4] to-[#D4BBA6] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-[#6B5D52]" />
              </div>
              <h3 className="text-sm font-semibold text-[#4A3728]">Select a chat</h3>
              <p className="text-xs text-[#9C8C74] mt-1">
                Choose a conversation from the sidebar
              </p>
              <Button 
                onClick={() => setShowNewChat(true)}
                variant="outline"
                size="sm"
                className="mt-3 border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0] text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Chat
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

      {/* Create Task from Message Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[#464EB8]" />
              Create Task from Message
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Task Name *</Label>
              <Input
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                placeholder="Enter task name"
                className="border-[#D4BBA6]"
              />
            </div>

            {/* Task Type Selection */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Task Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={taskType === 'personal' ? 'default' : 'outline'}
                  onClick={() => setTaskType('personal')}
                  className={taskType === 'personal' 
                    ? 'flex-1 bg-gradient-to-r from-[#464EB8] to-[#5B64D4] text-white' 
                    : 'flex-1 border-[#D4BBA6] text-[#4A3728]'}
                >
                  <User className="w-4 h-4 mr-2" />
                  My Task
                </Button>
                <Button
                  type="button"
                  variant={taskType === 'project' ? 'default' : 'outline'}
                  onClick={() => setTaskType('project')}
                  className={taskType === 'project' 
                    ? 'flex-1 bg-gradient-to-r from-[#464EB8] to-[#5B64D4] text-white' 
                    : 'flex-1 border-[#D4BBA6] text-[#4A3728]'}
                >
                  <FolderKanban className="w-4 h-4 mr-2" />
                  Project Task
                </Button>
              </div>
            </div>
            
            {/* Project Selection - Only show for project tasks */}
            {taskType === 'project' && (
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Project *</Label>
                <Select 
                  value={taskForm.project_id} 
                  onValueChange={(value) => setTaskForm({ ...taskForm, project_id: value })}
                >
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-[#464EB8]" />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assignee Selection */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Assign To</Label>
              <Select 
                value={taskForm.assignee_id || 'self'} 
                onValueChange={(value) => setTaskForm({ ...taskForm, assignee_id: value === 'self' ? currentUserId : value })}
              >
                <SelectTrigger className="border-[#D4BBA6]">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6] max-h-60">
                  <SelectItem value="self">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#464EB8] to-[#5B64D4] flex items-center justify-center text-white text-xs">
                        Me
                      </div>
                      <span className="font-medium">Myself</span>
                    </div>
                  </SelectItem>
                  {employees.filter(e => e.id !== currentUserId).map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#E8D5C4] flex items-center justify-center text-[#4A3728] text-xs font-medium">
                          {employee.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span>{employee.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Priority</Label>
                <Select 
                  value={taskForm.priority} 
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger className="border-[#D4BBA6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#D4BBA6]">
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-gray-400" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-amber-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-red-500" />
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description"
                rows={3}
                className="border-[#D4BBA6] resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowTaskModal(false)} 
              className="border-[#D4BBA6]"
            >
              Cancel
            </Button>
            <Button 
              onClick={createTaskFromMessage}
              disabled={creatingTask || !taskForm.name.trim() || (taskType === 'project' && !taskForm.project_id)}
              className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white"
            >
              {creatingTask ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ListTodo className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
