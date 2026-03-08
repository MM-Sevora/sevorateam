import React, { useState, useEffect, useCallback } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { format } from 'date-fns';
import { 
  Mail, Search, Star, Archive, Trash2, Reply, ReplyAll, Forward,
  RefreshCw, Send, Paperclip, MoreVertical, ChevronLeft, X, AlertCircle,
  Inbox, FileText, Clock, Tag, Settings, PenSquare, ChevronDown,
  MailOpen, CheckSquare, Square, StarOff, Bookmark, Eye, EyeOff,
  CornerUpLeft, ArrowLeft, Printer, ExternalLink, MoreHorizontal,
  Loader2, Plus, Check, LogIn, LogOut, User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';
import { mailRequest } from '../../authConfig';

// Gmail-like color scheme
const GMAIL_COLORS = {
  primary: '#1a73e8',
  primaryHover: '#1557b0',
  sidebar: '#f6f8fc',
  sidebarHover: '#e8eaed',
  sidebarActive: '#d3e3fd',
  text: '#202124',
  textSecondary: '#5f6368',
  border: '#e0e0e0',
  unread: '#202124',
  read: '#5f6368',
  star: '#f4b400',
  important: '#fa7b17',
};

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox, count: 0 },
  { id: 'starred', name: 'Starred', icon: Star, count: 0 },
  { id: 'snoozed', name: 'Snoozed', icon: Clock, count: 0 },
  { id: 'sentitems', name: 'Sent', icon: Send, count: 0 },
  { id: 'drafts', name: 'Drafts', icon: FileText, count: 0 },
  { id: 'archive', name: 'All Mail', icon: Archive, count: 0 },
  { id: 'deleteditems', name: 'Trash', icon: Trash2, count: 0 },
];

// Helper to get display name for folders
const getFolderDisplayName = (folderId) => {
  const folder = FOLDERS.find(f => f.id === folderId);
  return folder ? folder.name : folderId.charAt(0).toUpperCase() + folderId.slice(1);
};

const LABELS = [
  { id: 'work', name: 'Work', color: '#1a73e8' },
  { id: 'personal', name: 'Personal', color: '#34a853' },
  { id: 'important', name: 'Important', color: '#ea4335' },
  { id: 'social', name: 'Social', color: '#fbbc04' },
];

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

const EmailPage = () => {
  // MSAL hooks
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];
  
  // State
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [msLoginLoading, setMsLoginLoading] = useState(false);
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeMode, setComposeMode] = useState('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  // Get access token silently
  const getAccessToken = useCallback(async () => {
    if (!account) return null;
    
    try {
      const response = await instance.acquireTokenSilent({
        ...mailRequest,
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fallback to interactive
        try {
          const response = await instance.acquireTokenPopup(mailRequest);
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
  const callGraphAPI = useCallback(async (endpoint, options = {}) => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Please sign in with Microsoft');
      return null;
    }
    
    const response = await fetch(`${GRAPH_ENDPOINT}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'API call failed');
    }
    
    return response.json();
  }, [getAccessToken]);

  // Handle Microsoft login
  const handleMicrosoftLogin = async () => {
    setMsLoginLoading(true);
    try {
      await instance.loginPopup(mailRequest);
      toast.success('Successfully connected to Microsoft 365!');
    } catch (error) {
      console.error('Login error:', error);
      if (error.errorCode !== 'user_cancelled') {
        toast.error('Failed to connect to Microsoft');
      }
    } finally {
      setMsLoginLoading(false);
    }
  };

  // Handle Microsoft logout
  const handleMicrosoftLogout = async () => {
    try {
      await instance.logoutPopup();
      setEmails([]);
      setSelectedEmail(null);
      toast.success('Signed out from Microsoft');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch emails using Graph API
  const fetchEmails = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const folderMap = {
        'inbox': 'inbox',
        'sentitems': 'sentItems',
        'drafts': 'drafts',
        'deleteditems': 'deletedItems',
        'archive': 'archive',
        'starred': 'inbox' // We'll filter starred later
      };
      
      const folder = folderMap[currentFolder] || 'inbox';
      let url = `/me/mailFolders/${folder}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,flag,hasAttachments,importance`;
      
      if (searchQuery) {
        url += `&$search="${searchQuery}"`;
      }
      
      const data = await callGraphAPI(url);
      let fetchedEmails = data?.value || [];
      
      // Filter starred if needed
      if (currentFolder === 'starred') {
        fetchedEmails = fetchedEmails.filter(e => e.flag?.flagStatus === 'flagged');
      }
      
      setEmails(fetchedEmails);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      toast.error('Failed to load emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentFolder, searchQuery, callGraphAPI]);

  // Sync emails
  const handleSync = async () => {
    setSyncing(true);
    await fetchEmails();
    setSyncing(false);
    toast.success('Inbox refreshed');
  };

  // Load full email using Graph API
  const loadFullEmail = async (messageId) => {
    try {
      const data = await callGraphAPI(`/me/messages/${messageId}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,importance`);
      setFullEmail(data);
      
      // Mark as read
      const email = emails.find(e => e.id === messageId);
      if (email && !email.isRead) {
        await callGraphAPI(`/me/messages/${messageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ isRead: true })
        });
        setEmails(prev => prev.map(e => e.id === messageId ? { ...e, isRead: true } : e));
      }
    } catch (error) {
      toast.error('Failed to load email');
    }
  };

  // Handle email click
  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setViewMode('detail');
    loadFullEmail(email.id);
  };

  // Back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedEmail(null);
    setFullEmail(null);
  };

  // Toggle star using Graph API
  const handleToggleStar = async (e, emailId, currentFlag) => {
    e.stopPropagation();
    const newFlag = currentFlag === 'flagged' ? 'notFlagged' : 'flagged';
    try {
      await callGraphAPI(`/me/messages/${emailId}`, {
        method: 'PATCH',
        body: JSON.stringify({ flag: { flagStatus: newFlag } })
      });
      setEmails(prev => prev.map(em => 
        em.id === emailId ? { ...em, flag: { flagStatus: newFlag } } : em
      ));
    } catch (error) {
      toast.error('Failed to update star');
    }
  };

  // Toggle select
  const handleToggleSelect = (e, emailId) => {
    e.stopPropagation();
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  // Archive selected using Graph API
  const handleArchiveSelected = async () => {
    if (selectedEmails.size === 0) return;
    try {
      // Get archive folder ID
      const folders = await callGraphAPI('/me/mailFolders');
      const archiveFolder = folders?.value?.find(f => f.displayName.toLowerCase() === 'archive');
      
      if (archiveFolder) {
        for (const emailId of selectedEmails) {
          await callGraphAPI(`/me/messages/${emailId}/move`, {
            method: 'POST',
            body: JSON.stringify({ destinationId: archiveFolder.id })
          });
        }
      }
      setEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
      setSelectedEmails(new Set());
      toast.success(`${selectedEmails.size} conversation(s) archived`);
    } catch (error) {
      toast.error('Failed to archive');
    }
  };

  // Delete selected using Graph API
  const handleDeleteSelected = async () => {
    if (selectedEmails.size === 0) return;
    try {
      for (const emailId of selectedEmails) {
        await callGraphAPI(`/me/messages/${emailId}`, { method: 'DELETE' });
      }
      setEmails(prev => prev.filter(e => !selectedEmails.has(e.id)));
      setSelectedEmails(new Set());
      toast.success(`${selectedEmails.size} conversation(s) deleted`);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Mark as read/unread using Graph API
  const handleMarkReadUnread = async (read) => {
    if (selectedEmails.size === 0) return;
    try {
      for (const emailId of selectedEmails) {
        await callGraphAPI(`/me/messages/${emailId}`, {
          method: 'PATCH',
          body: JSON.stringify({ isRead: read })
        });
      }
      setEmails(prev => prev.map(e => 
        selectedEmails.has(e.id) ? { ...e, isRead: read } : e
      ));
      setSelectedEmails(new Set());
      toast.success(`Marked as ${read ? 'read' : 'unread'}`);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // Open compose
  const openCompose = (mode = 'new', email = null) => {
    setComposeMode(mode);
    setComposeMinimized(false);
    
    if (mode === 'new') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
    } else if (mode === 'reply' && email) {
      setComposeTo(email.from?.emailAddress?.address || '');
      setComposeCc('');
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`\n\n\nOn ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}, ${email.from?.emailAddress?.name || email.from?.emailAddress?.address} wrote:\n> ${(email.bodyPreview || '').split('\n').join('\n> ')}`);
    } else if (mode === 'replyAll' && email) {
      setComposeTo(email.from?.emailAddress?.address || '');
      setComposeCc(email.toRecipients?.map(r => r.emailAddress?.address).filter(e => e).join(', ') || '');
      setShowCc(true);
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`\n\n\nOn ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}, ${email.from?.emailAddress?.name || email.from?.emailAddress?.address} wrote:\n> ${(email.bodyPreview || '').split('\n').join('\n> ')}`);
    } else if (mode === 'forward' && email) {
      setComposeTo('');
      setComposeSubject(`Fwd: ${email.subject || ''}`);
      setComposeBody(`\n\n\n---------- Forwarded message ---------\nFrom: ${email.from?.emailAddress?.name || ''} <${email.from?.emailAddress?.address || ''}>\nDate: ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}\nSubject: ${email.subject || ''}\n\n${email.bodyPreview || ''}`);
    }
    
    setShowCompose(true);
  };

  // Send email
  const handleSend = async () => {
    if (!composeTo.trim()) {
      toast.error('Please specify at least one recipient');
      return;
    }
    
    setSending(true);
    try {
      const message = {
        subject: composeSubject,
        body: {
          contentType: 'HTML',
          content: composeBody.replace(/\n/g, '<br>')
        },
        toRecipients: composeTo.split(',').map(e => e.trim()).filter(e => e).map(email => ({
          emailAddress: { address: email }
        })),
      };
      
      if (composeCc) {
        message.ccRecipients = composeCc.split(',').map(e => e.trim()).filter(e => e).map(email => ({
          emailAddress: { address: email }
        }));
      }
      
      await callGraphAPI('/me/sendMail', {
        method: 'POST',
        body: JSON.stringify({ message, saveToSentItems: true })
      });
      
      toast.success('Message sent');
      setShowCompose(false);
      if (currentFolder === 'sentitems') fetchEmails();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Format date Gmail-style
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return format(date, 'h:mm a');
    if (diffDays < 7) return format(date, 'MMM d');
    if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
    return format(date, 'M/d/yy');
  };

  // Get avatar initials
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
    }
    return email ? email[0].toUpperCase() : '?';
  };

  // Get avatar color
  const getAvatarColor = (email) => {
    if (!email) return '#5f6368';
    const colors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#673ab7', '#e91e63', '#00bcd4', '#ff5722'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmails();
    }
  }, [isAuthenticated, fetchEmails]);

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => fetchEmails(), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, isAuthenticated, fetchEmails]);

  const unreadCount = emails.filter(e => !e.isRead).length;

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" data-testid="email-page-login">
        <Card className="w-full max-w-md mx-4 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Email</h1>
              <p className="text-gray-600">
                Sign in with your Microsoft account to access your Outlook emails
              </p>
            </div>
            
            <Button
              onClick={handleMicrosoftLogin}
              disabled={msLoginLoading}
              className="w-full h-12 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              data-testid="microsoft-login-btn"
            >
              {msLoginLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-6">
              By signing in, you'll be able to read, send, and manage your Outlook emails directly from this app.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white" data-testid="email-page">
      {/* Gmail-style Sidebar */}
      <div className="w-64 flex-shrink-0 bg-[#f6f8fc] border-r border-gray-200 flex flex-col">
        {/* Compose Button */}
        <div className="p-4">
          <Button
            onClick={() => openCompose('new')}
            className="w-full h-14 rounded-2xl shadow-md hover:shadow-lg transition-shadow bg-white hover:bg-[#f0f4f9] text-[#3c4043] border-0 justify-start gap-3 px-6"
            data-testid="compose-btn"
          >
            <PenSquare className="h-5 w-5 text-[#444746]" />
            <span className="font-medium">Compose</span>
          </Button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 overflow-y-auto">
          {FOLDERS.map((folder) => {
            const isActive = currentFolder === folder.id;
            const Icon = folder.icon;
            return (
              <button
                key={folder.id}
                onClick={() => { setCurrentFolder(folder.id); setViewMode('list'); setSelectedEmail(null); }}
                className={`w-full flex items-center gap-4 px-6 py-2 rounded-r-full text-sm font-medium transition-colors mb-0.5 ${
                  isActive 
                    ? 'bg-[#d3e3fd] text-[#001d35]' 
                    : 'text-[#444746] hover:bg-[#e8eaed]'
                }`}
                data-testid={`folder-${folder.id}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#001d35]' : 'text-[#444746]'}`} />
                <span className="flex-1 text-left">{folder.name}</span>
                {folder.id === 'inbox' && unreadCount > 0 && (
                  <span className="text-xs font-bold">{unreadCount}</span>
                )}
              </button>
            );
          })}

          {/* Labels Section */}
          <div className="mt-4 pt-2 border-t border-gray-200">
            <button className="w-full flex items-center gap-4 px-6 py-2 text-sm font-medium text-[#444746] hover:bg-[#e8eaed] rounded-r-full">
              <ChevronDown className="h-4 w-4" />
              <span>Labels</span>
            </button>
            {LABELS.map(label => (
              <button
                key={label.id}
                className="w-full flex items-center gap-4 px-6 py-2 text-sm text-[#444746] hover:bg-[#e8eaed] rounded-r-full"
              >
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: label.color }} />
                <span>{label.name}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 gap-4">
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5f6368]" />
              <Input
                placeholder="Search mail"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-[#eaf1fb] hover:bg-[#dfe6ed] focus:bg-white border-0 rounded-full text-base focus:shadow-md transition-all"
                data-testid="search-input"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Account */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2 hover:bg-gray-100 rounded-full">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {account?.name?.charAt(0) || account?.username?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 max-w-32 truncate hidden sm:block">
                    {account?.username || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-gray-900">{account?.name || 'Microsoft User'}</p>
                  <p className="text-sm text-gray-500">{account?.username}</p>
                </div>
                <DropdownMenuItem onClick={handleMicrosoftLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSync} disabled={syncing}>
                    <RefreshCw className={`h-5 w-5 text-[#5f6368] ${syncing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Email List or Detail View */}
        {viewMode === 'list' ? (
          <>
            {/* Toolbar */}
            <div className="h-12 flex items-center px-4 border-b border-gray-100 gap-2">
              <Checkbox
                checked={selectedEmails.size > 0 && selectedEmails.size === emails.length}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-[#1a73e8]"
              />
              
              {selectedEmails.size > 0 ? (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleArchiveSelected}>
                          <Archive className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Archive</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleDeleteSelected}>
                          <Trash2 className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleMarkReadUnread(true)}>
                          <MailOpen className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Mark as read</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-sm text-[#5f6368] ml-2">{selectedEmails.size} selected</span>
                </>
              ) : (
                <span className="text-sm text-[#5f6368]">
                  {getFolderDisplayName(currentFolder)}
                </span>
              )}
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a73e8]" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[#5f6368]">
                  <Inbox className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-xl">No conversations</p>
                  <p className="text-sm">Your {getFolderDisplayName(currentFolder)} is empty</p>
                </div>
              ) : (
                emails.map((email) => {
                  const isSelected = selectedEmails.has(email.id);
                  const isStarred = email.flag?.flagStatus === 'flagged';
                  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
                  const senderEmail = email.from?.emailAddress?.address || '';
                  
                  return (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className={`group flex items-center h-10 px-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#c2dbff]' : email.isRead ? 'hover:bg-[#f2f2f2]' : 'bg-[#f2f6fc] hover:bg-[#ecf1f8]'
                      }`}
                      data-testid={`email-row-${email.id}`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center gap-2 w-14 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(e) => handleToggleSelect({ stopPropagation: () => {} }, email.id)}
                          className="data-[state=checked]:bg-[#1a73e8]"
                        />
                        <button onClick={(e) => handleToggleStar(e, email.id, email.flag?.flagStatus)}>
                          <Star className={`h-5 w-5 transition-colors ${isStarred ? 'fill-[#f4b400] text-[#f4b400]' : 'text-[#c4c7c5] hover:text-[#f4b400]'}`} />
                        </button>
                      </div>

                      {/* Sender */}
                      <div className={`w-52 flex-shrink-0 truncate text-sm ${email.isRead ? 'text-[#5f6368]' : 'text-[#202124] font-semibold'}`}>
                        {senderName}
                      </div>

                      {/* Subject & Preview */}
                      <div className="flex-1 flex items-center min-w-0 gap-1">
                        <span className={`truncate text-sm ${email.isRead ? 'text-[#5f6368]' : 'text-[#202124] font-semibold'}`}>
                          {email.subject || '(no subject)'}
                        </span>
                        <span className="text-[#5f6368] text-sm">-</span>
                        <span className="truncate text-sm text-[#5f6368]">
                          {email.bodyPreview}
                        </span>
                      </div>

                      {/* Attachment & Date */}
                      <div className="flex items-center gap-2 w-28 flex-shrink-0 justify-end">
                        {email.hasAttachments && <Paperclip className="h-4 w-4 text-[#5f6368]" />}
                        <span className={`text-xs ${email.isRead ? 'text-[#5f6368]' : 'text-[#202124] font-semibold'}`}>
                          {formatDate(email.receivedDateTime)}
                        </span>
                      </div>

                      {/* Hover Actions */}
                      <div className="hidden group-hover:flex items-center gap-1 absolute right-4 bg-[#f2f2f2] px-2 py-1 rounded shadow-sm" onClick={e => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedEmail(email); microsoftAPI.archiveMessage(email.id); setEmails(p => p.filter(e => e.id !== email.id)); toast.success('Archived'); }}>
                                <Archive className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archive</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { microsoftAPI.deleteMessage(email.id); setEmails(p => p.filter(e => e.id !== email.id)); toast.success('Deleted'); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { microsoftAPI.markAsRead(email.id, !email.isRead); setEmails(p => p.map(e => e.id === email.id ? {...e, isRead: !email.isRead} : e)); }}>
                                {email.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{email.isRead ? 'Mark unread' : 'Mark read'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Email Detail View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail Toolbar */}
            <div className="h-12 flex items-center px-4 border-b border-gray-100 gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                      <ArrowLeft className="h-5 w-5 text-[#5f6368]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Inbox</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="h-6 w-px bg-gray-200 mx-2" />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => { microsoftAPI.archiveMessage(selectedEmail.id); handleBackToList(); setEmails(p => p.filter(e => e.id !== selectedEmail.id)); toast.success('Archived'); }}>
                      <Archive className="h-5 w-5 text-[#5f6368]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => { microsoftAPI.deleteMessage(selectedEmail.id); handleBackToList(); setEmails(p => p.filter(e => e.id !== selectedEmail.id)); toast.success('Deleted'); }}>
                      <Trash2 className="h-5 w-5 text-[#5f6368]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="flex-1" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5 text-[#5f6368]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { microsoftAPI.markAsRead(selectedEmail.id, false); setEmails(p => p.map(e => e.id === selectedEmail.id ? {...e, isRead: false} : e)); toast.success('Marked unread'); }}>
                    <EyeOff className="h-4 w-4 mr-2" /> Mark as unread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {fullEmail ? (
                <div className="max-w-4xl">
                  {/* Subject */}
                  <h1 className="text-2xl font-normal text-[#202124] mb-4">
                    {fullEmail.subject || '(no subject)'}
                  </h1>

                  {/* Sender Info */}
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: getAvatarColor(fullEmail.from?.emailAddress?.address) }} className="text-white font-medium">
                        {getInitials(fullEmail.from?.emailAddress?.name, fullEmail.from?.emailAddress?.address)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#202124]">
                          {fullEmail.from?.emailAddress?.name || fullEmail.from?.emailAddress?.address}
                        </span>
                        <span className="text-sm text-[#5f6368]">
                          &lt;{fullEmail.from?.emailAddress?.address}&gt;
                        </span>
                      </div>
                      <div className="text-sm text-[#5f6368]">
                        to me
                        {fullEmail.toRecipients?.length > 1 && `, +${fullEmail.toRecipients.length - 1} others`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#5f6368]">
                        {format(new Date(fullEmail.receivedDateTime), 'MMM d, yyyy, h:mm a')}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleStar({stopPropagation:()=>{}}, fullEmail.id, fullEmail.flag?.flagStatus)}>
                        <Star className={`h-5 w-5 ${fullEmail.flag?.flagStatus === 'flagged' ? 'fill-[#f4b400] text-[#f4b400]' : 'text-[#5f6368]'}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openCompose('reply', fullEmail)}>
                        <Reply className="h-5 w-5 text-[#5f6368]" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5 text-[#5f6368]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCompose('replyAll', fullEmail)}>
                            <ReplyAll className="h-4 w-4 mr-2" /> Reply all
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCompose('forward', fullEmail)}>
                            <Forward className="h-4 w-4 mr-2" /> Forward
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none">
                    {fullEmail.body?.contentType === 'html' ? (
                      <div dangerouslySetInnerHTML={{ __html: fullEmail.body?.content }} />
                    ) : (
                      <div className="whitespace-pre-wrap text-[#202124]">
                        {fullEmail.body?.content || fullEmail.bodyPreview}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {fullEmail.hasAttachments && fullEmail.attachments?.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-[#202124] mb-2">
                        {fullEmail.attachments.length} Attachment{fullEmail.attachments.length > 1 ? 's' : ''}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {fullEmail.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <Paperclip className="h-4 w-4 text-[#5f6368]" />
                            <span className="text-sm text-[#202124]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Actions */}
                  <div className="mt-8 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openCompose('reply', fullEmail)}
                      className="rounded-full"
                    >
                      <Reply className="h-4 w-4 mr-2" /> Reply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openCompose('forward', fullEmail)}
                      className="rounded-full"
                    >
                      <Forward className="h-4 w-4 mr-2" /> Forward
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a73e8]" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gmail-style Compose Window */}
      {showCompose && (
        <div className={`fixed ${composeMinimized ? 'bottom-0 right-4 w-72' : 'bottom-0 right-4 w-[560px]'} bg-white rounded-t-lg shadow-2xl border border-gray-200 z-50`}>
          {/* Compose Header */}
          <div 
            className="flex items-center justify-between px-4 h-10 bg-[#404040] rounded-t-lg cursor-pointer"
            onClick={() => setComposeMinimized(!composeMinimized)}
          >
            <span className="text-white text-sm font-medium">
              {composeMode === 'new' ? 'New Message' : composeMode === 'reply' ? 'Reply' : composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setComposeMinimized(!composeMinimized); }}>
                <ChevronDown className={`h-4 w-4 transition-transform ${composeMinimized ? 'rotate-180' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setShowCompose(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Compose Body */}
          {!composeMinimized && (
            <div className="flex flex-col">
              {/* To Field */}
              <div className="flex items-center px-4 py-2 border-b border-gray-200">
                <span className="text-sm text-[#5f6368] w-12">To</span>
                <Input
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 border-0 focus-visible:ring-0 h-8 text-sm"
                />
                <Button variant="ghost" size="sm" className="text-[#5f6368] text-sm" onClick={() => setShowCc(!showCc)}>
                  Cc
                </Button>
              </div>

              {/* Cc Field */}
              {showCc && (
                <div className="flex items-center px-4 py-2 border-b border-gray-200">
                  <span className="text-sm text-[#5f6368] w-12">Cc</span>
                  <Input
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="Cc"
                    className="flex-1 border-0 focus-visible:ring-0 h-8 text-sm"
                  />
                </div>
              )}

              {/* Subject Field */}
              <div className="flex items-center px-4 py-2 border-b border-gray-200">
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 border-0 focus-visible:ring-0 h-8 text-sm"
                />
              </div>

              {/* Body */}
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Compose email"
                className="min-h-[250px] border-0 focus-visible:ring-0 resize-none text-sm p-4"
              />

              {/* Compose Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full px-6"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Paperclip className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach files</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
                  <Trash2 className="h-5 w-5 text-[#5f6368]" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailPage;
