import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { 
  MessageSquare, Users, Search, Send, Plus, RefreshCw, 
  CheckCircle, Loader2, ChevronLeft, Settings,
  User, AtSign, MoreVertical, Phone, Video, Info, ListTodo,
  Calendar, Flag, FolderKanban, CalendarPlus, Clock, MapPin, Target,
  LogOut, ChevronDown
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { teamsRequest } from '../../authConfig';

const API = process.env.REACT_APP_BACKEND_URL;
const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

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
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];

  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [msLoginLoading, setMsLoginLoading] = useState(false);
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
  
  // Meeting creation state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingMessage, setMeetingMessage] = useState(null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meeting_type: 'general',
    start_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    linked_project_id: ''
  });
  
  const token = localStorage.getItem('sevora_token');

  // Get access token from MSAL
  const getAccessToken = useCallback(async () => {
    if (!account) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...teamsRequest,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(teamsRequest);
          return response.accessToken;
        } catch (popupError) {
          console.error('Failed to acquire token:', popupError);
          return null;
        }
      }
      console.error('Token error:', error);
      return null;
    }
  }, [instance, account]);

  // Microsoft Graph API call helper
  const callGraphAPI = useCallback(
    async (endpoint, options = {}) => {
      const msToken = await getAccessToken();
      if (!msToken) {
        toast.error('Please sign in with Microsoft');
        return null;
      }

      const response = await fetch(`${GRAPH_ENDPOINT}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${msToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'API call failed');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }

      return true;
    },
    [getAccessToken]
  );

  // Check Teams connection
  useEffect(() => {
    const checkConnection = async () => {
      setCheckingConnection(true);
      if (accounts.length > 0 && account) {
        try {
          const silentRequest = {
            scopes: ["Chat.Read"],
            account: account,
          };
          const response = await instance.acquireTokenSilent(silentRequest);
          if (response && response.accessToken) {
            setConnected(true);
            // Set current user info from MS account
            setCurrentUserEmail(account.username || '');
          } else {
            setConnected(false);
          }
        } catch (error) {
          console.log('Teams Chat silent token failed:', error.message);
          setConnected(false);
        }
      } else {
        setConnected(false);
      }
      setCheckingConnection(false);
      setLoading(false);
    };

    if (inProgress === 'none') {
      checkConnection();
    }
  }, [accounts, account, instance, inProgress]);

  useEffect(() => {
    // Get current user ID from Sevora
    const userData = localStorage.getItem('sevora_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        if (!currentUserEmail) {
          setCurrentUserEmail(user.email);
        }
      } catch (e) {}
    }
  }, [currentUserEmail]);

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

  // Handle Microsoft login
  const handleMicrosoftLogin = async () => {
    setMsLoginLoading(true);
    try {
      // If user is already signed in, try popup for consent
      if (accounts.length > 0) {
        try {
          const response = await instance.acquireTokenPopup(teamsRequest);
          if (response && response.accessToken) {
            setConnected(true);
            setCurrentUserEmail(account?.username || '');
            toast.success('Teams Chat connected!');
            setMsLoginLoading(false);
            return;
          }
        } catch (popupError) {
          console.log('Popup consent failed, trying redirect:', popupError.message);
        }
      }
      
      // Use redirect flow for full sign-in
      sessionStorage.setItem('msalRedirectPath', window.location.pathname);
      sessionStorage.setItem('msalLoginType', 'teams');
      await instance.loginRedirect(teamsRequest);
    } catch (error) {
      console.error('Login error:', error);
      setMsLoginLoading(false);
      toast.error('Failed to connect to Microsoft');
    }
  };

  // Handle Microsoft logout
  const handleMicrosoftLogout = async () => {
    try {
      await instance.logoutPopup();
      setConnected(false);
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
      toast.success('Signed out from Microsoft');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch chats using Graph API
  const fetchChats = async () => {
    if (!connected) return;
    
    setLoading(true);
    try {
      const data = await callGraphAPI('/me/chats?$expand=lastMessagePreview,members&$top=50');
      setChats(data?.value || []);
    } catch (e) {
      console.error('Error fetching chats:', e);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a chat
  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    
    setLoadingMessages(true);
    try {
      const data = await callGraphAPI(`/me/chats/${chatId}/messages?$top=50&$orderby=createdDateTime desc`);
      // Reverse to show oldest first
      setMessages((data?.value || []).reverse());
    } catch (e) {
      console.error('Error fetching messages:', e);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    setSending(true);
    try {
      await callGraphAPI(`/me/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          body: {
            content: newMessage,
          },
        }),
      });
      
      setNewMessage('');
      fetchMessages(selectedChat.id);
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Search users for new chat
  const searchForUsers = async (query) => {
    if (!query || query.length < 2) {
      setSearchUsers([]);
      return;
    }
    
    setSearchingUsers(true);
    try {
      const data = await callGraphAPI(`/users?$filter=startswith(displayName,'${query}') or startswith(mail,'${query}')&$top=10`);
      setSearchUsers(data?.value || []);
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Start new chat with user
  const startNewChat = async (user) => {
    try {
      const data = await callGraphAPI('/me/chats', {
        method: 'POST',
        body: JSON.stringify({
          chatType: 'oneOnOne',
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${account?.localAccountId || account?.homeAccountId}`,
            },
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${user.id}`,
            },
          ],
        }),
      });
      
      if (data) {
        setShowNewChat(false);
        setUserSearchQuery('');
        setSearchUsers([]);
        fetchChats();
        setSelectedChat(data);
        toast.success('Chat created!');
      }
    } catch (e) {
      console.error('Error creating chat:', e);
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

  // Open meeting creation modal with message content
  const openMeetingModal = (message) => {
    const messageContent = stripHtml(message.body?.content || '');
    const senderName = message.from?.user?.displayName || 'Unknown';
    const chatName = getChatDisplayName(selectedChat);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];
    
    setMeetingMessage(message);
    setMeetingForm({
      title: `Follow-up: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
      meeting_type: 'general',
      start_date: defaultDate,
      start_time: '10:00',
      end_time: '10:30',
      location: '',
      description: `Meeting scheduled from Teams chat with ${chatName}:\n\n"${messageContent}"\n\n— ${senderName}`,
      linked_project_id: ''
    });
    fetchProjects();
    setShowMeetingModal(true);
  };

  // Create meeting from message
  const createMeetingFromMessage = async () => {
    if (!meetingForm.title.trim()) {
      toast.error('Please fill in meeting title');
      return;
    }
    
    if (!meetingForm.start_date) {
      toast.error('Please select a date');
      return;
    }
    
    setCreatingMeeting(true);
    try {
      const startDateTime = `${meetingForm.start_date}T${meetingForm.start_time}:00Z`;
      const endDateTime = `${meetingForm.start_date}T${meetingForm.end_time}:00Z`;
      
      const body = {
        title: meetingForm.title,
        meeting_type: meetingForm.meeting_type,
        description: meetingForm.description,
        start_time: startDateTime,
        end_time: endDateTime,
        timezone: 'UTC',
        location: meetingForm.location || null,
        linked_project_id: meetingForm.linked_project_id || null,
        visibility: 'public',
        source: 'teams_chat'
      };
      
      const res = await fetch(`${API}/api/meetings`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        toast.success('Meeting scheduled successfully!');
        setShowMeetingModal(false);
        setMeetingMessage(null);
        setMeetingForm({
          title: '',
          meeting_type: 'general',
          start_date: '',
          start_time: '',
          end_time: '',
          location: '',
          description: '',
          linked_project_id: ''
        });
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to schedule meeting');
      }
    } catch (e) {
      toast.error('Failed to schedule meeting');
    } finally {
      setCreatingMeeting(false);
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
              onClick={handleMicrosoftLogin}
              disabled={msLoginLoading || inProgress !== 'none'}
              className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white px-10 py-6 text-lg shadow-lg"
              data-testid="connect-teams-btn"
            >
              {msLoginLoading || inProgress !== 'none' ? (
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
                                    data-testid="convert-to-task-btn"
                                  >
                                    <ListTodo className="w-3.5 h-3.5 mr-2 text-[#464EB8]" />
                                    Convert to Task
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => openMeetingModal(message)}
                                    className="cursor-pointer text-[#4A3728] text-xs"
                                    data-testid="schedule-meeting-btn"
                                  >
                                    <CalendarPlus className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                    Schedule Meeting
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
                            {/* Actions button for own messages - shows on hover */}
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
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => openMeetingModal(message)}
                                    className="cursor-pointer text-[#4A3728] text-xs"
                                  >
                                    <CalendarPlus className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                    Schedule Meeting
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

      {/* Schedule Meeting from Message Modal */}
      <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-emerald-600" />
              Schedule Meeting from Chat
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Meeting Title */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Meeting Title *</Label>
              <Input
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="Enter meeting title"
                className="border-[#D4BBA6]"
                data-testid="meeting-title-input"
              />
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Meeting Type</Label>
              <Select 
                value={meetingForm.meeting_type} 
                onValueChange={(value) => setMeetingForm({ ...meetingForm, meeting_type: value })}
              >
                <SelectTrigger className="border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="general">General Meeting</SelectItem>
                  <SelectItem value="one_on_one">One-on-One</SelectItem>
                  <SelectItem value="project_review">Project Review</SelectItem>
                  <SelectItem value="weekly_team_review">Weekly Team Review</SelectItem>
                  <SelectItem value="daily_standup">Daily Standup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Date *</Label>
                <Input
                  type="date"
                  value={meetingForm.start_date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, start_date: e.target.value })}
                  className="border-[#D4BBA6]"
                  data-testid="meeting-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#4A3728]">Start Time</Label>
                <Input
                  type="time"
                  value={meetingForm.start_time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, start_time: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#4A3728]">End Time</Label>
                <Input
                  type="time"
                  value={meetingForm.end_time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, end_time: e.target.value })}
                  className="border-[#D4BBA6]"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Location (Optional)</Label>
              <Input
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                placeholder="e.g., Conference Room A or Teams link"
                className="border-[#D4BBA6]"
              />
            </div>

            {/* Link to Project */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Link to Project (Optional)</Label>
              <Select 
                value={meetingForm.linked_project_id || 'none'} 
                onValueChange={(value) => setMeetingForm({ ...meetingForm, linked_project_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="border-[#D4BBA6]">
                  <SelectValue placeholder={loadingProjects ? "Loading..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#D4BBA6]">
                  <SelectItem value="none">None</SelectItem>
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
            
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Description</Label>
              <Textarea
                value={meetingForm.description}
                onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                placeholder="Meeting agenda and notes"
                rows={3}
                className="border-[#D4BBA6] resize-none"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowMeetingModal(false)} 
              className="border-[#D4BBA6]"
            >
              Cancel
            </Button>
            <Button 
              onClick={createMeetingFromMessage}
              disabled={creatingMeeting || !meetingForm.title.trim() || !meetingForm.start_date}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              data-testid="create-meeting-btn"
            >
              {creatingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
