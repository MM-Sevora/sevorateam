import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { format } from 'date-fns';
import { 
  Mail, Search, Star, Archive, Trash2, Reply, ReplyAll, Forward,
  RefreshCw, Send, Paperclip, MoreVertical, ChevronLeft, X, AlertCircle,
  Inbox, FileText, Clock, Tag, Settings, PenSquare, ChevronDown,
  MailOpen, CheckSquare, Square, StarOff, Bookmark, Eye, EyeOff,
  CornerUpLeft, ArrowLeft, Printer, ExternalLink, MoreHorizontal,
  Loader2, Plus, Check, LogIn, LogOut, User, Bold, Italic, Underline,
  Link, List, ListOrdered, AlignLeft, CalendarClock, ListTodo, FolderKanban, Flag, Calendar,
  CheckCircle, Users, BarChart3
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
  DialogFooter,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { mailRequest } from '../../authConfig';
import api from '../../lib/api';

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
const API = process.env.REACT_APP_BACKEND_URL;

// Helper to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html.replace(/<[^>]*>/g, '');
  return txt.value;
};

const EmailPage = () => {
  // URL params for compose from other pages
  const [searchParams, setSearchParams] = useSearchParams();
  
  // MSAL hooks
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts[0];
  
  // Track email-specific authentication state
  const [emailConnected, setEmailConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  
  // Check if user has email-connected account on mount and when accounts change
  useEffect(() => {
    const checkEmailConnection = async () => {
      setCheckingConnection(true);
      console.log('Checking email connection. Accounts:', accounts.length, 'InProgress:', inProgress);
      
      if (accounts.length > 0) {
        // Check if we can get a token silently (means we have valid email permissions)
        try {
          const silentRequest = {
            scopes: ["Mail.Read"],
            account: accounts[0]
          };
          const tokenResponse = await instance.acquireTokenSilent(silentRequest);
          console.log('Email connection verified - token acquired silently for:', tokenResponse?.account?.username);
          setEmailConnected(true);
        } catch (error) {
          console.log('Silent token acquisition failed:', error.message);
          // Try interactive if silent fails
          if (error.name === 'InteractionRequiredAuthError') {
            console.log('Interaction required - user needs to re-consent');
          }
          setEmailConnected(false);
        }
      } else {
        console.log('No MSAL accounts found');
        setEmailConnected(false);
      }
      setCheckingConnection(false);
    };
    
    if (inProgress === 'none') {
      checkEmailConnection();
    }
  }, [accounts, instance, inProgress]);
  
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
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = React.useRef(null);
  const editorRef = React.useRef(null);
  
  // Email Signature state (now API-backed)
  const [emailSignature, setEmailSignature] = useState('');
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [signatures, setSignatures] = useState([]);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState(null);
  const [editingSignature, setEditingSignature] = useState(null);
  const [newSignatureName, setNewSignatureName] = useState('');
  
  // Email Templates state (API-backed)
  const [apiTemplates, setApiTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Rich text and scheduling state
  const [useRichText, setUseRichText] = useState(false); // Disabled by default for stability
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  
  // Snooze state
  const [snoozedEmails, setSnoozedEmails] = useState([]);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeEmail, setSnoozeEmail] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeTime, setSnoozeTime] = useState('');
  
  // Follow-up reminders state
  const [followUps, setFollowUps] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpEmail, setFollowUpEmail] = useState(null);
  const [followUpHours, setFollowUpHours] = useState(48);
  const [enableTracking, setEnableTracking] = useState(false);
  
  // Email tracking state
  const [trackingStats, setTrackingStats] = useState(null);

  // Shared Mailbox state
  const [sharedMailboxes, setSharedMailboxes] = useState([]);
  const [activeMailbox, setActiveMailbox] = useState(null); // null = personal mailbox
  const [loadingMailboxes, setLoadingMailboxes] = useState(false);

  // Task creation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskEmail, setTaskEmail] = useState(null);
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
  const [meetingEmail, setMeetingEmail] = useState(null);
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

  // Get current user ID from localStorage
  const currentUserId = React.useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || '';
    } catch {
      return '';
    }
  }, []);

  const token = localStorage.getItem('sevora_token');
  // Email Templates
  const EMAIL_TEMPLATES = [
    {
      id: 'collaboration',
      name: 'Collaboration Inquiry',
      subject: 'Collaboration Opportunity with Sevora',
      body: `Hi there,

I hope this email finds you well! I'm reaching out from Sevora, and we've been following your amazing content.

We believe your unique style and engaged audience would be a perfect fit for our brand. We'd love to explore a potential collaboration opportunity with you.

Would you be open to discussing this further? We're flexible on deliverables and would love to hear your ideas.

Looking forward to hearing from you!

Best regards,
Sevora Team`
    },
    {
      id: 'followup',
      name: 'Follow Up',
      subject: 'Following Up - Collaboration Opportunity',
      body: `Hi there,

I wanted to follow up on my previous message about a potential collaboration with Sevora.

We're still very interested in working together and would love to hear your thoughts. If you have any questions about the partnership or would like to schedule a quick call, please let me know.

Looking forward to connecting!

Best regards,
Sevora Team`
    },
    {
      id: 'campaign_invite',
      name: 'Campaign Invite',
      subject: 'Exclusive Campaign Invitation',
      body: `Hi there,

We're launching an exciting new campaign and would love for you to be part of it!

Campaign Details:
- Campaign Name: [Campaign Name]
- Timeline: [Start Date] - [End Date]
- Deliverables: [List deliverables]
- Compensation: [Compensation details]

Based on your content style and audience, we believe this would be a great fit. Let us know if you're interested and we can discuss the details further.

Best regards,
Sevora Team`
    },
    {
      id: 'pr_pitch',
      name: 'PR Pitch',
      subject: 'Story Pitch: [Your Story Angle]',
      body: `Dear Editor,

I hope this email finds you well. I'm reaching out from Sevora with a story idea that I believe would resonate with your readers.

Story Angle:
[Brief description of the story/angle]

Key Points:
- [Point 1]
- [Point 2]
- [Point 3]

We have [spokesperson/expert] available for interviews and can provide additional materials including high-resolution images and data.

Would you be interested in covering this story? I'd be happy to provide more information or arrange an interview at your convenience.

Best regards,
Sevora Team`
    },
    {
      id: 'thank_you',
      name: 'Thank You',
      subject: 'Thank You for the Collaboration!',
      body: `Hi there,

Thank you so much for the amazing collaboration! The content turned out fantastic and we've received great feedback from our audience.

We truly appreciate your creativity and professionalism throughout the project. It was a pleasure working with you.

We'd love to keep in touch for future opportunities. Please don't hesitate to reach out if you have any ideas or if there's anything we can do for you.

Best regards,
Sevora Team`
    }
  ];

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
    
    // Some Graph API endpoints return empty responses (like sendMail returns 202)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    // Return true for successful empty responses
    return true;
  }, [getAccessToken]);

  // Handle Microsoft login - use redirect flow for reliability
  const handleMicrosoftLogin = async () => {
    setMsLoginLoading(true);
    try {
      // Store current path and login type to return after redirect
      sessionStorage.setItem('msalRedirectPath', window.location.pathname);
      sessionStorage.setItem('msalLoginType', 'email');
      
      // Use redirect flow - more reliable than popup
      await instance.loginRedirect(mailRequest);
    } catch (error) {
      console.error('Login redirect error:', error);
      setMsLoginLoading(false);
      toast.error('Failed to connect to Microsoft. Please try again.');
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
      console.error('Failed to fetch projects:', e);
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
      console.error('Failed to fetch employees:', e);
    }
  };

  // Open task creation modal with email content
  const openTaskModal = (email) => {
    const subject = email.subject || '(no subject)';
    const preview = email.bodyPreview || '';
    const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
    const senderEmail = email.from?.emailAddress?.address || '';
    
    setTaskEmail(email);
    setTaskType('project');
    setTaskForm({
      name: subject.substring(0, 100),
      description: `From email: "${subject}"\nFrom: ${senderName} <${senderEmail}>\n\n${preview}`,
      project_id: '',
      assignee_id: '',
      priority: 'medium',
      due_date: ''
    });
    fetchProjects();
    fetchEmployees();
    setShowTaskModal(true);
  };

  // Create task from email
  const createTaskFromEmail = async () => {
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
        source: 'email'
      };

      // Get actual assignee ID (handle 'self' value)
      const actualAssigneeId = taskForm.assignee_id === 'self' || !taskForm.assignee_id 
        ? currentUserId 
        : taskForm.assignee_id;
      
      if (taskType === 'personal') {
        // Create personal task (My Tasks)
        endpoint = `${API}/api/projects/my-tasks`;
        if (actualAssigneeId && actualAssigneeId !== currentUserId) {
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
        setTaskEmail(null);
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

  // Open meeting creation modal with email content
  const openMeetingModal = (email) => {
    const subject = email.subject || '(no subject)';
    const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
    const senderEmail = email.from?.emailAddress?.address || '';
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];
    
    setMeetingEmail(email);
    setMeetingForm({
      title: `Follow-up: ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`,
      meeting_type: 'general',
      start_date: defaultDate,
      start_time: '10:00',
      end_time: '10:30',
      location: '',
      description: `Meeting scheduled from email:\n\nSubject: ${subject}\nFrom: ${senderName} <${senderEmail}>`,
      linked_project_id: ''
    });
    fetchProjects();
    setShowMeetingModal(true);
  };

  // Create meeting from email
  const createMeetingFromEmail = async () => {
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
        source: 'email'
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
        setMeetingEmail(null);
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

  // Fetch shared mailboxes from backend
  const fetchSharedMailboxes = useCallback(async () => {
    try {
      setLoadingMailboxes(true);
      const response = await api.get('/shared-mailboxes/my-mailboxes');
      setSharedMailboxes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch shared mailboxes:', error);
    } finally {
      setLoadingMailboxes(false);
    }
  }, []);

  // Fetch email templates from backend API
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.get('/email-features/templates');
      setApiTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch email signatures from backend API
  const fetchSignatures = useCallback(async () => {
    try {
      setLoadingSignatures(true);
      const response = await api.get('/email-features/signatures');
      const sigs = response.data || [];
      setSignatures(sigs);
      
      // Set the default signature as active
      const defaultSig = sigs.find(s => s.is_default);
      if (defaultSig) {
        setActiveSignatureId(defaultSig.id);
        setEmailSignature(defaultSig.content);
      }
    } catch (error) {
      console.error('Failed to fetch signatures:', error);
    } finally {
      setLoadingSignatures(false);
    }
  }, []);

  // Create a new email template
  const createTemplate = async (template) => {
    try {
      setSavingTemplate(true);
      const response = await api.post('/email-features/templates', template);
      setApiTemplates(prev => [...prev, response.data]);
      toast.success('Template created');
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create template');
      throw error;
    } finally {
      setSavingTemplate(false);
    }
  };

  // Update an existing template
  const updateTemplate = async (templateId, template) => {
    try {
      setSavingTemplate(true);
      const response = await api.put(`/email-features/templates/${templateId}`, template);
      setApiTemplates(prev => prev.map(t => t.id === templateId ? response.data : t));
      toast.success('Template updated');
      return response.data;
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
      throw error;
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete a template
  const deleteTemplate = async (templateId) => {
    try {
      await api.delete(`/email-features/templates/${templateId}`);
      setApiTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Create a new signature
  const createSignature = async (signature) => {
    try {
      const response = await api.post('/email-features/signatures', signature);
      setSignatures(prev => {
        // If this is default, unset others
        if (signature.is_default) {
          return [...prev.map(s => ({ ...s, is_default: false })), response.data];
        }
        return [...prev, response.data];
      });
      toast.success('Signature created');
      if (signature.is_default) {
        setActiveSignatureId(response.data.id);
        setEmailSignature(response.data.content);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create signature:', error);
      toast.error('Failed to create signature');
      throw error;
    }
  };

  // Update an existing signature
  const updateSignature = async (signatureId, signature) => {
    try {
      const response = await api.put(`/email-features/signatures/${signatureId}`, signature);
      setSignatures(prev => {
        // If this is default, unset others
        if (signature.is_default) {
          return prev.map(s => s.id === signatureId ? response.data : { ...s, is_default: false });
        }
        return prev.map(s => s.id === signatureId ? response.data : s);
      });
      toast.success('Signature updated');
      if (signature.is_default || signatureId === activeSignatureId) {
        setEmailSignature(response.data.content);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to update signature:', error);
      toast.error('Failed to update signature');
      throw error;
    }
  };

  // Delete a signature
  const deleteSignature = async (signatureId) => {
    try {
      await api.delete(`/email-features/signatures/${signatureId}`);
      setSignatures(prev => prev.filter(s => s.id !== signatureId));
      if (activeSignatureId === signatureId) {
        setActiveSignatureId(null);
        setEmailSignature('');
      }
      toast.success('Signature deleted');
    } catch (error) {
      console.error('Failed to delete signature:', error);
      toast.error('Failed to delete signature');
    }
  };

  // Select a signature for use
  const selectSignature = (signature) => {
    setActiveSignatureId(signature.id);
    setEmailSignature(signature.content);
    setShowSignatureEditor(false);
  };

  // ============== SNOOZE FUNCTIONS ==============
  
  // Fetch snoozed emails
  const fetchSnoozedEmails = useCallback(async () => {
    try {
      const response = await api.get('/email-features/snoozed');
      setSnoozedEmails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch snoozed emails:', error);
    }
  }, []);

  // Snooze an email
  const snoozeEmailAction = async (email, snoozeUntil) => {
    try {
      const snoozeData = {
        message_id: email.id,
        mailbox: activeMailbox?.email || null,
        snooze_until: snoozeUntil,
        subject: email.subject || '(no subject)',
        from_email: email.from?.emailAddress?.address || '',
        from_name: email.from?.emailAddress?.name || null
      };
      await api.post('/email-features/snooze', snoozeData);
      toast.success('Email snoozed');
      setShowSnoozeModal(false);
      setSnoozeEmail(null);
      fetchSnoozedEmails();
      // Remove from current view
      setEmails(prev => prev.filter(e => e.id !== email.id));
    } catch (error) {
      console.error('Failed to snooze email:', error);
      toast.error('Failed to snooze email');
    }
  };

  // Unsnooze an email
  const unsnoozeEmail = async (messageId) => {
    try {
      await api.delete(`/email-features/snooze/${messageId}`);
      toast.success('Email unsnoozed');
      fetchSnoozedEmails();
      fetchEmails(); // Refresh inbox
    } catch (error) {
      console.error('Failed to unsnooze email:', error);
      toast.error('Failed to unsnooze email');
    }
  };

  // ============== SCHEDULED SEND FUNCTIONS ==============
  
  // Fetch scheduled emails
  const fetchScheduledEmails = useCallback(async () => {
    try {
      setLoadingScheduled(true);
      const response = await api.get('/email-features/scheduled');
      setScheduledEmails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch scheduled emails:', error);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  // Schedule an email
  const scheduleEmail = async (emailData) => {
    try {
      const response = await api.post('/email-features/scheduled', emailData);
      toast.success('Email scheduled');
      setScheduledEmails(prev => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error('Failed to schedule email:', error);
      toast.error('Failed to schedule email');
      throw error;
    }
  };

  // Cancel scheduled email
  const cancelScheduledEmail = async (scheduledId) => {
    try {
      await api.delete(`/email-features/scheduled/${scheduledId}`);
      toast.success('Scheduled email cancelled');
      setScheduledEmails(prev => prev.filter(e => e.id !== scheduledId));
    } catch (error) {
      console.error('Failed to cancel scheduled email:', error);
      toast.error('Failed to cancel scheduled email');
    }
  };

  // ============== FOLLOW-UP REMINDER FUNCTIONS ==============
  
  // Fetch follow-up reminders
  const fetchFollowUps = useCallback(async () => {
    try {
      const response = await api.get('/email-features/follow-ups');
      setFollowUps(response.data || []);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    }
  }, []);

  // Create follow-up reminder
  const createFollowUp = async (email, hours = 48) => {
    try {
      const reminderData = {
        message_id: email.id,
        subject: email.subject || '(no subject)',
        to_email: email.from?.emailAddress?.address || '',
        to_name: email.from?.emailAddress?.name || null,
        remind_after_hours: hours,
        mailbox: activeMailbox?.email || null
      };
      const response = await api.post('/email-features/follow-ups', reminderData);
      toast.success(`Follow-up reminder set for ${hours} hours`);
      setFollowUps(prev => [...prev, response.data]);
      setShowFollowUpModal(false);
      return response.data;
    } catch (error) {
      console.error('Failed to create follow-up:', error);
      toast.error('Failed to create follow-up reminder');
      throw error;
    }
  };

  // Dismiss follow-up
  const dismissFollowUp = async (reminderId) => {
    try {
      await api.put(`/email-features/follow-ups/${reminderId}/dismiss`);
      toast.success('Reminder dismissed');
      setFollowUps(prev => prev.filter(f => f.id !== reminderId));
    } catch (error) {
      console.error('Failed to dismiss follow-up:', error);
      toast.error('Failed to dismiss reminder');
    }
  };

  // Snooze follow-up
  const snoozeFollowUp = async (reminderId, hours = 24) => {
    try {
      await api.put(`/email-features/follow-ups/${reminderId}/snooze?hours=${hours}`);
      toast.success(`Reminder snoozed for ${hours} hours`);
      fetchFollowUps();
    } catch (error) {
      console.error('Failed to snooze follow-up:', error);
      toast.error('Failed to snooze reminder');
    }
  };

  // ============== EMAIL TRACKING FUNCTIONS ==============
  
  // Fetch tracking stats
  const fetchTrackingStats = useCallback(async () => {
    try {
      const response = await api.get('/email-features/tracking/stats/summary');
      setTrackingStats(response.data);
    } catch (error) {
      console.error('Failed to fetch tracking stats:', error);
    }
  }, []);

  // Create tracking for an email
  const createTracking = async (messageId, toEmail, subject) => {
    try {
      const response = await api.post('/email-features/tracking', {
        message_id: messageId,
        to_email: toEmail,
        subject: subject,
        mailbox: activeMailbox?.email || null
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create tracking:', error);
      return null;
    }
  };

  // Fetch shared mailboxes when email is connected
  useEffect(() => {
    if (emailConnected) {
      fetchSharedMailboxes();
      fetchTemplates();
      fetchSignatures();
      fetchSnoozedEmails();
      fetchScheduledEmails();
      fetchFollowUps();
      fetchTrackingStats();
    }
  }, [emailConnected, fetchSharedMailboxes, fetchTemplates, fetchSignatures, fetchSnoozedEmails, fetchScheduledEmails, fetchFollowUps, fetchTrackingStats]);

  // Fetch emails using Graph API
  const fetchEmails = useCallback(async () => {
    if (!emailConnected) return;
    
    // Handle snoozed folder separately (uses our backend)
    if (currentFolder === 'snoozed') {
      setLoading(true);
      try {
        const response = await api.get('/email-features/snoozed');
        // Transform snoozed emails to match the email list format
        const snoozedList = (response.data || []).map(s => ({
          id: s.message_id,
          subject: s.subject,
          bodyPreview: `Snoozed until ${format(new Date(s.snooze_until), 'MMM d, yyyy h:mm a')}`,
          from: { emailAddress: { address: s.from_email, name: s.from_name } },
          receivedDateTime: s.created_at,
          isRead: true,
          isSnoozed: true,
          snoozeUntil: s.snooze_until,
          snoozeId: s.id
        }));
        setEmails(snoozedList);
      } catch (error) {
        console.error('Failed to fetch snoozed emails:', error);
        setEmails([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
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
      
      // Build URL based on whether we're accessing shared mailbox or personal
      let baseUrl = activeMailbox 
        ? `/users/${activeMailbox.email}/mailFolders/${folder}/messages`
        : `/me/mailFolders/${folder}/messages`;
      
      let url = `${baseUrl}?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,flag,hasAttachments,importance`;
      
      if (searchQuery) {
        url += `&$search="${searchQuery}"`;
      }
      
      const data = await callGraphAPI(url);
      let fetchedEmails = data?.value || [];
      
      // Filter starred if needed
      if (currentFolder === 'starred') {
        fetchedEmails = fetchedEmails.filter(e => e.flag?.flagStatus === 'flagged');
      }
      
      // Filter out snoozed emails from inbox
      if (currentFolder === 'inbox' && snoozedEmails.length > 0) {
        const snoozedIds = new Set(snoozedEmails.map(s => s.message_id));
        fetchedEmails = fetchedEmails.filter(e => !snoozedIds.has(e.id));
      }
      
      setEmails(fetchedEmails);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      toast.error('Failed to load emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [emailConnected, currentFolder, searchQuery, callGraphAPI, activeMailbox, snoozedEmails]);

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
      const baseUrl = activeMailbox 
        ? `/users/${activeMailbox.email}/messages/${messageId}`
        : `/me/messages/${messageId}`;
      
      const data = await callGraphAPI(`${baseUrl}?$select=id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,flag,hasAttachments,importance`);
      
      // Fetch attachments if email has them
      if (data.hasAttachments) {
        try {
          const attachmentsData = await callGraphAPI(`${baseUrl}/attachments`);
          data.attachments = attachmentsData?.value || [];
        } catch (attError) {
          console.error('Failed to fetch attachments:', attError);
          data.attachments = [];
        }
      }
      
      setFullEmail(data);
      
      // Mark as read
      const email = emails.find(e => e.id === messageId);
      if (email && !email.isRead) {
        await callGraphAPI(baseUrl, {
          method: 'PATCH',
          body: JSON.stringify({ isRead: true })
        });
        setEmails(prev => prev.map(e => e.id === messageId ? { ...e, isRead: true } : e));
      }
    } catch (error) {
      toast.error('Failed to load email');
    }
  };

  // Download attachment
  const handleDownloadAttachment = async (attachment) => {
    try {
      if (attachment.contentBytes) {
        // Attachment content is already available
        const byteCharacters = atob(attachment.contentBytes);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.contentType });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Downloaded ${attachment.name}`);
      } else {
        toast.error('Attachment content not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download attachment');
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
    const baseUrl = activeMailbox ? `/users/${activeMailbox.email}` : '/me';
    try {
      await callGraphAPI(`${baseUrl}/messages/${emailId}`, {
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
    const baseUrl = activeMailbox ? `/users/${activeMailbox.email}` : '/me';
    try {
      // Get archive folder ID
      const folders = await callGraphAPI(`${baseUrl}/mailFolders`);
      const archiveFolder = folders?.value?.find(f => f.displayName.toLowerCase() === 'archive');
      
      if (archiveFolder) {
        for (const emailId of selectedEmails) {
          await callGraphAPI(`${baseUrl}/messages/${emailId}/move`, {
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
    const baseUrl = activeMailbox ? `/users/${activeMailbox.email}` : '/me';
    try {
      for (const emailId of selectedEmails) {
        await callGraphAPI(`${baseUrl}/messages/${emailId}`, { method: 'DELETE' });
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
    const baseUrl = activeMailbox ? `/users/${activeMailbox.email}` : '/me';
    try {
      for (const emailId of selectedEmails) {
        await callGraphAPI(`${baseUrl}/messages/${emailId}`, {
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
    setAttachments([]); // Clear attachments
    setShowTemplates(false);
    
    if (mode === 'new') {
      setComposeTo('');
      setComposeCc('');
      setComposeBcc('');
      setComposeSubject('');
      // Add signature to new emails
      const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
      setComposeBody(sig);
    } else if (mode === 'reply' && email) {
      setComposeTo(email.from?.emailAddress?.address || '');
      setComposeCc('');
      setComposeBcc('');
      const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`${sig}\n\n\nOn ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}, ${email.from?.emailAddress?.name || email.from?.emailAddress?.address} wrote:\n> ${(email.bodyPreview || '').split('\n').join('\n> ')}`);
    } else if (mode === 'replyAll' && email) {
      setComposeTo(email.from?.emailAddress?.address || '');
      setComposeCc(email.toRecipients?.map(r => r.emailAddress?.address).filter(e => e).join(', ') || '');
      setComposeBcc('');
      setShowCc(true);
      const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`${sig}\n\n\nOn ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}, ${email.from?.emailAddress?.name || email.from?.emailAddress?.address} wrote:\n> ${(email.bodyPreview || '').split('\n').join('\n> ')}`);
    } else if (mode === 'forward' && email) {
      setComposeTo('');
      setComposeBcc('');
      const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
      setComposeSubject(`Fwd: ${email.subject || ''}`);
      setComposeBody(`${sig}\n\n\n---------- Forwarded message ---------\nFrom: ${email.from?.emailAddress?.name || ''} <${email.from?.emailAddress?.address || ''}>\nDate: ${format(new Date(email.receivedDateTime), 'EEE, MMM d, yyyy')} at ${format(new Date(email.receivedDateTime), 'h:mm a')}\nSubject: ${email.subject || ''}\n\n${email.bodyPreview || ''}`);
    }
    
    setShowCompose(true);
  };

  // Apply email template
  const applyTemplate = (template) => {
    setComposeSubject(template.subject);
    // Preserve signature when applying template
    const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
    setComposeBody(template.body + sig);
    setShowTemplates(false);
    toast.success(`Applied "${template.name}" template`);
  };
  
  // Save signature to localStorage
  const saveSignature = (sig) => {
    setEmailSignature(sig);
    localStorage.setItem('email_signature', sig);
    toast.success('Signature saved');
    setShowSignatureEditor(false);
  };
  
  // Load signature from localStorage on mount
  useEffect(() => {
    const savedSig = localStorage.getItem('email_signature');
    if (savedSig) {
      setEmailSignature(savedSig);
    }
  }, []);

  // Handle URL params for compose (from Quick Email buttons)
  useEffect(() => {
    const compose = searchParams.get('compose');
    const to = searchParams.get('to');
    const subject = searchParams.get('subject');
    
    if (compose === 'true' && isAuthenticated) {
      setComposeTo(to || '');
      setComposeSubject(subject || '');
      const sig = signatureEnabled && emailSignature ? `\n\n${emailSignature}` : '';
      setComposeBody(sig);
      setShowCompose(true);
      // Clear URL params after using them
      setSearchParams({});
    }
  }, [searchParams, isAuthenticated, emailSignature, signatureEnabled, setSearchParams]);

  // Handle file selection for attachments
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const maxSize = 3 * 1024 * 1024; // 3MB per file (Microsoft Graph limit for inline)
    const newAttachments = [];
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 3MB)`);
        continue;
      }
      
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const base64Data = result.split(',')[1]; // Remove data:...;base64, prefix
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        newAttachments.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBytes: base64,
          size: file.size
        });
      } catch (error) {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Rich text formatting functions
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  // Get editor content as HTML
  const getEditorContent = () => {
    if (useRichText && editorRef.current) {
      return editorRef.current.innerHTML;
    }
    return composeBody.replace(/\n/g, '<br>');
  };

  // Send email
  const handleSend = async () => {
    if (!composeTo.trim()) {
      toast.error('Please specify at least one recipient');
      return;
    }
    
    // Validate scheduled send
    if (showScheduler && scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    }
    
    setSending(true);
    try {
      const emailContent = getEditorContent();
      
      const message = {
        subject: composeSubject,
        body: {
          contentType: 'HTML',
          content: emailContent
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
      
      if (composeBcc) {
        message.bccRecipients = composeBcc.split(',').map(e => e.trim()).filter(e => e).map(email => ({
          emailAddress: { address: email }
        }));
      }
      
      // Add attachments if any
      if (attachments.length > 0) {
        message.attachments = attachments;
      }
      
      // Handle scheduled send - save to our backend for proper scheduling
      if (showScheduler && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const formattedSchedule = format(scheduledDateTime, 'MMM d, yyyy h:mm a');
        
        // Save to our backend scheduled emails table
        const scheduledEmailData = {
          to_recipients: composeTo.split(',').map(e => e.trim()).filter(e => e),
          cc_recipients: composeCc ? composeCc.split(',').map(e => e.trim()).filter(e => e) : [],
          bcc_recipients: composeBcc ? composeBcc.split(',').map(e => e.trim()).filter(e => e) : [],
          subject: composeSubject,
          body: emailContent,
          scheduled_time: scheduledDateTime.toISOString(),
          mailbox: activeMailbox?.email || null,
          attachments: attachments.length > 0 ? attachments : []
        };
        
        await scheduleEmail(scheduledEmailData);
        
        toast.success(`Email scheduled for ${formattedSchedule}`, { duration: 4000 });
        setShowScheduler(false);
        setScheduledDate('');
        setScheduledTime('');
      } else {
        // Send immediately - use shared mailbox if active
        const sendEndpoint = activeMailbox 
          ? `/users/${activeMailbox.email}/sendMail`
          : '/me/sendMail';
        
        await callGraphAPI(sendEndpoint, {
          method: 'POST',
          body: JSON.stringify({ message, saveToSentItems: true })
        });
        toast.success(activeMailbox ? `Message sent from ${activeMailbox.display_name}` : 'Message sent');
        
        // Trigger automation for pipeline auto-advance
        try {
          const recipients = composeData.to.split(',').map(e => e.trim()).filter(e => e);
          for (const recipient of recipients) {
            const automationResult = await api.post('/automations/execute/test_trigger', { contact_email: recipient });
            if (automationResult.data?.trigger_result?.success) {
              toast.info(`✨ Auto-advanced "${automationResult.data.trigger_result.contact_name}" to "${automationResult.data.trigger_result.to_stage}" stage`, {
                duration: 4000
              });
            }
          }
        } catch (autoErr) {
          console.log('Automation trigger skipped:', autoErr.message);
        }
      }
      
      setShowCompose(false);
      setAttachments([]); // Clear attachments after sending
      if (currentFolder === 'sentitems' || currentFolder === 'drafts') fetchEmails();
    } catch (error) {
      console.error('Send email error:', error);
      // More specific error messages
      if (error.message?.includes('Request_EntityTooLarge') || error.message?.includes('413')) {
        toast.error('Attachments too large. Try reducing file sizes or send fewer attachments.');
      } else if (error.message?.includes('InvalidAuthenticationToken')) {
        toast.error('Session expired. Please sign out and sign in again.');
      } else if (error.message?.includes('ErrorSendAsDenied')) {
        toast.error('You do not have permission to send as this user.');
      } else {
        toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
      }
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
    if (emailConnected) {
      fetchEmails();
    }
  }, [emailConnected, fetchEmails]);

  useEffect(() => {
    if (emailConnected) {
      const timer = setTimeout(() => fetchEmails(), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, emailConnected, fetchEmails]);

  const unreadCount = emails.filter(e => !e.isRead).length;

  // Show loading while MSAL is initializing or checking connection
  if (inProgress !== 'none' || checkingConnection) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Checking email connection...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated with email permissions
  if (!emailConnected) {
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
                {folder.id === 'snoozed' && snoozedEmails.length > 0 && (
                  <span className="text-xs font-medium text-amber-600">{snoozedEmails.length}</span>
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
          
          {/* Scheduled & Follow-ups Section */}
          {(scheduledEmails.length > 0 || followUps.length > 0) && (
            <div className="mt-4 pt-2 border-t border-gray-200">
              {scheduledEmails.length > 0 && (
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">Scheduled ({scheduledEmails.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scheduledEmails.slice(0, 3).map(email => (
                      <div key={email.id} className="bg-blue-50 rounded px-2 py-1.5 text-xs group relative">
                        <p className="font-medium text-gray-800 truncate pr-6">{email.subject}</p>
                        <p className="text-gray-500">{format(new Date(email.scheduled_time), 'MMM d, h:mm a')}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 absolute right-1 top-1 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); cancelScheduledEmail(email.id); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {followUps.length > 0 && (
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-gray-700">Follow-ups ({followUps.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {followUps.slice(0, 3).map(f => (
                      <div key={f.id} className="bg-orange-50 rounded px-2 py-1.5 text-xs group relative">
                        <p className="font-medium text-gray-800 truncate pr-6">{f.subject}</p>
                        <p className="text-gray-500">Due: {format(new Date(f.remind_at), 'MMM d, h:mm a')}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 absolute right-1 top-1 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); dismissFollowUp(f.id); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Tracking Stats */}
          {trackingStats && trackingStats.total_emails_tracked > 0 && (
            <div className="mt-4 pt-2 border-t border-gray-200 px-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-gray-700">Email Tracking</span>
              </div>
              <div className="bg-green-50 rounded p-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Rate</span>
                  <span className="font-medium text-green-700">{trackingStats.open_rate}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Click Rate</span>
                  <span className="font-medium text-green-700">{trackingStats.click_rate}%</span>
                </div>
              </div>
            </div>
          )}
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
            {/* Mailbox Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-3 gap-2 hover:bg-gray-100 rounded-full border border-gray-200">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                    activeMailbox ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }`}>
                    {activeMailbox 
                      ? activeMailbox.display_name?.charAt(0) || 'S'
                      : account?.name?.charAt(0) || account?.username?.charAt(0) || 'U'
                    }
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-medium text-gray-800 truncate max-w-32">
                      {activeMailbox ? activeMailbox.display_name : (account?.name || 'My Inbox')}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate max-w-32">
                      {activeMailbox ? activeMailbox.email : account?.username}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal
                </div>
                <DropdownMenuItem 
                  onClick={() => { setActiveMailbox(null); setCurrentFolder('inbox'); }}
                  className={`cursor-pointer ${!activeMailbox ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {account?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{account?.name || 'My Inbox'}</p>
                      <p className="text-xs text-gray-500 truncate">{account?.username}</p>
                    </div>
                    {!activeMailbox && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </div>
                </DropdownMenuItem>
                
                {sharedMailboxes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shared Mailboxes
                    </div>
                    {sharedMailboxes.map(mailbox => (
                      <DropdownMenuItem 
                        key={mailbox.id}
                        onClick={() => { setActiveMailbox(mailbox); setCurrentFolder('inbox'); }}
                        className={`cursor-pointer ${activeMailbox?.id === mailbox.id ? 'bg-purple-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {mailbox.display_name?.charAt(0) || 'S'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{mailbox.display_name}</p>
                            <p className="text-xs text-gray-500 truncate">{mailbox.email}</p>
                          </div>
                          {activeMailbox?.id === mailbox.id && <CheckCircle className="w-4 h-4 text-purple-600" />}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                
                <DropdownMenuSeparator />
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => { 
                                  setSnoozeEmail(email); 
                                  setShowSnoozeModal(true);
                                  // Default to tomorrow 9 AM
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  setSnoozeDate(tomorrow.toISOString().split('T')[0]);
                                  setSnoozeTime('09:00');
                                }}
                                data-testid={`snooze-email-${email.id}`}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Snooze</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => { 
                                  setFollowUpEmail(email); 
                                  setFollowUpHours(48);
                                  setShowFollowUpModal(true); 
                                }}
                                data-testid={`followup-email-${email.id}`}
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Follow-up reminder</TooltipContent>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openTaskModal(fullEmail)}>
                            <ListTodo className="h-4 w-4 mr-2" /> Create Task
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMeetingModal(fullEmail)}>
                            <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting
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
                          <div 
                            key={i} 
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors group"
                            onClick={() => handleDownloadAttachment(att)}
                            data-testid={`attachment-${i}`}
                          >
                            <Paperclip className="h-4 w-4 text-[#5f6368] group-hover:text-blue-600" />
                            <div className="flex flex-col">
                              <span className="text-sm text-[#202124] group-hover:text-blue-600">{att.name}</span>
                              {att.size && (
                                <span className="text-xs text-[#5f6368]">{formatFileSize(att.size)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#5f6368] mt-2">Click to download</p>
                    </div>
                  )}

                  {/* Reply Actions */}
                  <div className="mt-8 flex gap-2 flex-wrap">
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
                    <Button
                      variant="outline"
                      onClick={() => openTaskModal(fullEmail)}
                      className="rounded-full border-[#464EB8] text-[#464EB8] hover:bg-[#464EB8]/10"
                      data-testid="create-task-from-email-btn"
                    >
                      <ListTodo className="h-4 w-4 mr-2" /> Create Task
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openMeetingModal(fullEmail)}
                      className="rounded-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                      data-testid="schedule-meeting-from-email-btn"
                    >
                      <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting
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
                <Button variant="ghost" size="sm" className={`text-sm ${showCc ? 'text-blue-600' : 'text-[#5f6368]'}`} onClick={() => setShowCc(!showCc)}>
                  Cc
                </Button>
                <Button variant="ghost" size="sm" className={`text-sm ${showBcc ? 'text-blue-600' : 'text-[#5f6368]'}`} onClick={() => setShowBcc(!showBcc)}>
                  Bcc
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

              {/* Bcc Field */}
              {showBcc && (
                <div className="flex items-center px-4 py-2 border-b border-gray-200">
                  <span className="text-sm text-[#5f6368] w-12">Bcc</span>
                  <Input
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    placeholder="Bcc (recipients hidden from others)"
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

              {/* Template Selector - API-backed */}
              {showTemplates && (
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#5f6368] uppercase tracking-wide">Email Templates</span>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingTemplate({ name: '', subject: '', body: '', category: 'general' });
                          setShowTemplateManager(true);
                        }}
                        data-testid="new-template-btn"
                      >
                        <Plus className="h-3 w-3 mr-1" /> New
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowTemplates(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {loadingTemplates ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading templates...
                    </div>
                  ) : (
                    <>
                      {/* API Templates */}
                      {apiTemplates.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 block">Your Templates</span>
                          <div className="flex flex-wrap gap-2">
                            {apiTemplates.map((template) => (
                              <div key={template.id} className="group relative">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 pr-7 bg-white"
                                  onClick={() => applyTemplate(template)}
                                  data-testid={`template-${template.id}`}
                                >
                                  {template.name}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-6 p-0 absolute right-0 top-0 opacity-0 group-hover:opacity-100"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingTemplate(template);
                                      setShowTemplateManager(true);
                                    }}>
                                      <PenSquare className="h-3 w-3 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => deleteTemplate(template.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Default Templates */}
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 block">Quick Templates</span>
                        <div className="flex flex-wrap gap-2">
                          {EMAIL_TEMPLATES.map((template) => (
                            <Button
                              key={template.id}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 bg-gray-100 border-gray-200 text-gray-600"
                              onClick={() => applyTemplate(template)}
                              data-testid={`default-template-${template.id}`}
                            >
                              {template.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Signature Manager - API-backed */}
              {showSignatureEditor && (
                <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-[#5f6368] uppercase tracking-wide">Email Signatures</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowSignatureEditor(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {loadingSignatures ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading signatures...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Existing Signatures List */}
                      {signatures.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Select Signature</span>
                          <div className="flex flex-wrap gap-2">
                            {signatures.map((sig) => (
                              <div key={sig.id} className="group relative">
                                <Button
                                  variant={activeSignatureId === sig.id ? "default" : "outline"}
                                  size="sm"
                                  className={`text-xs h-7 pr-7 ${activeSignatureId === sig.id ? 'bg-blue-600' : ''}`}
                                  onClick={() => selectSignature(sig)}
                                >
                                  {sig.name} {sig.is_default && <Star className="h-2.5 w-2.5 ml-1 fill-current" />}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-6 p-0 absolute right-0 top-0 opacity-0 group-hover:opacity-100"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingSignature(sig)}>
                                      <PenSquare className="h-3 w-3 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    {!sig.is_default && (
                                      <DropdownMenuItem onClick={() => updateSignature(sig.id, { ...sig, is_default: true })}>
                                        <Star className="h-3 w-3 mr-2" /> Set as Default
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => deleteSignature(sig.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 border-dashed"
                              onClick={() => setEditingSignature({ name: '', content: '', is_default: false })}
                            >
                              <Plus className="h-3 w-3 mr-1" /> New
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* No Signatures - Create First */}
                      {signatures.length === 0 && !editingSignature && (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 mb-2">No signatures yet</p>
                          <Button
                            size="sm"
                            onClick={() => setEditingSignature({ name: '', content: '', is_default: true })}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Create Signature
                          </Button>
                        </div>
                      )}
                      
                      {/* Signature Editor */}
                      {editingSignature && (
                        <div className="border rounded-lg p-3 bg-white">
                          <Input
                            value={editingSignature.name}
                            onChange={(e) => setEditingSignature({ ...editingSignature, name: e.target.value })}
                            placeholder="Signature name (e.g., Professional, Casual)"
                            className="mb-2 h-8 text-sm"
                          />
                          <Textarea
                            value={editingSignature.content}
                            onChange={(e) => setEditingSignature({ ...editingSignature, content: e.target.value })}
                            placeholder="Enter your signature...&#10;Example:&#10;Best regards,&#10;John Doe&#10;Marketing Manager | Sevora"
                            className="min-h-[80px] text-sm mb-2"
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="sig-default"
                              checked={editingSignature.is_default}
                              onCheckedChange={(checked) => setEditingSignature({ ...editingSignature, is_default: checked })}
                            />
                            <label htmlFor="sig-default" className="text-xs text-gray-600">Set as default</label>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={async () => {
                                if (!editingSignature.name.trim()) {
                                  toast.error('Please enter a signature name');
                                  return;
                                }
                                if (editingSignature.id) {
                                  await updateSignature(editingSignature.id, editingSignature);
                                } else {
                                  await createSignature(editingSignature);
                                }
                                setEditingSignature(null);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" /> {editingSignature.id ? 'Update' : 'Save'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingSignature(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Signature Toggle */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Checkbox
                          id="sig-enabled"
                          checked={signatureEnabled}
                          onCheckedChange={setSignatureEnabled}
                        />
                        <label htmlFor="sig-enabled" className="text-xs text-gray-600">Append signature to emails</label>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Schedule Email */}
              {showScheduler && (
                <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#5f6368] uppercase tracking-wide">Schedule Send</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowScheduler(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-[#5f6368] block mb-1">Date</label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-8 text-sm w-40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#5f6368] block mb-1">Time</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="h-8 text-sm w-32"
                      />
                    </div>
                    {scheduledDate && scheduledTime && (
                      <div className="pt-4">
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          {format(new Date(`${scheduledDate}T${scheduledTime}`), 'MMM d, h:mm a')}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#5f6368] mt-2">
                    Note: Email will be saved as draft with scheduled time. You'll need to manually send at the scheduled time.
                  </p>
                </div>
              )}

              {/* Rich Text Formatting Toolbar */}
              {useRichText && (
                <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('bold')}>
                          <Bold className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('italic')}>
                          <Italic className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('underline')}>
                          <Underline className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Underline (Ctrl+U)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="w-px h-5 bg-gray-300 mx-1" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertLink}>
                          <Link className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Insert Link</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('insertUnorderedList')}>
                          <List className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bullet List</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormat('insertOrderedList')}>
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Numbered List</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Body - Rich Text or Plain */}
              {useRichText ? (
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[200px] border-0 focus:outline-none resize-none text-sm p-4 prose prose-sm max-w-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                  onInput={(e) => setComposeBody(e.currentTarget.textContent || '')}
                  dangerouslySetInnerHTML={{ __html: composeBody.replace(/\n/g, '<br>') }}
                  data-testid="rich-text-editor"
                />
              ) : (
                <Textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Compose email"
                  className="min-h-[200px] border-0 focus-visible:ring-0 resize-none text-sm p-4"
                />
              )}

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm">
                        <Paperclip className="h-3 w-3 text-[#5f6368]" />
                        <span className="text-[#202124] max-w-[150px] truncate">{att.name}</span>
                        <span className="text-xs text-[#5f6368]">({formatFileSize(att.size)})</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 hover:bg-red-100" 
                          onClick={() => removeAttachment(i)}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compose Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full px-6"
                    data-testid="send-email-btn"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send
                  </Button>
                  
                  {/* Attachment Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="attach-file-btn"
                        >
                          <Paperclip className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach files (max 3MB each)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Templates Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowTemplates(!showTemplates)}
                          className={showTemplates ? 'bg-blue-100' : ''}
                          data-testid="templates-btn"
                        >
                          <FileText className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Email templates</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Signature Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowSignatureEditor(!showSignatureEditor)}
                          className={showSignatureEditor ? 'bg-blue-100' : ''}
                          data-testid="signature-btn"
                        >
                          <PenSquare className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{emailSignature ? 'Edit signature' : 'Add signature'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Schedule Send Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowScheduler(!showScheduler)}
                          className={showScheduler ? 'bg-amber-100' : ''}
                          data-testid="schedule-btn"
                        >
                          <CalendarClock className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Schedule send</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Email Tracking Toggle */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEnableTracking(!enableTracking)}
                          className={enableTracking ? 'bg-green-100' : ''}
                          data-testid="tracking-btn"
                        >
                          <BarChart3 className="h-5 w-5 text-[#5f6368]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{enableTracking ? 'Tracking enabled' : 'Enable tracking'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept="*/*"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
                  <Trash2 className="h-5 w-5 text-[#5f6368]" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Task from Email Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[#464EB8]" />
              Create Task from Email
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
                data-testid="task-name-input"
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
                  data-testid="task-type-personal"
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
                  data-testid="task-type-project"
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
                  <SelectTrigger className="border-[#D4BBA6]" data-testid="task-project-select">
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
                <SelectTrigger className="border-[#D4BBA6]" data-testid="task-assignee-select">
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
                  <SelectTrigger className="border-[#D4BBA6]" data-testid="task-priority-select">
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
                  data-testid="task-due-date-input"
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
                data-testid="task-description-input"
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
              onClick={createTaskFromEmail}
              disabled={creatingTask || !taskForm.name.trim() || (taskType === 'project' && !taskForm.project_id)}
              className="bg-gradient-to-r from-[#464EB8] to-[#5B64D4] hover:from-[#3d44a5] hover:to-[#4e56c7] text-white"
              data-testid="create-task-submit-btn"
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

      {/* Schedule Meeting from Email Modal */}
      <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
        <DialogContent className="bg-white border-[#D4BBA6] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Schedule Meeting from Email
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
                data-testid="email-meeting-title-input"
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
                  data-testid="email-meeting-date-input"
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
              onClick={createMeetingFromEmail}
              disabled={creatingMeeting || !meetingForm.title.trim() || !meetingForm.start_date}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              data-testid="email-create-meeting-btn"
            >
              {creatingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Manager Modal */}
      <Dialog open={showTemplateManager} onOpenChange={(open) => {
        setShowTemplateManager(open);
        if (!open) setEditingTemplate(null);
      }}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {editingTemplate?.id ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g., Collaboration Inquiry, Follow-up"
                  data-testid="template-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={editingTemplate.category || 'general'} 
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                >
                  <SelectTrigger data-testid="template-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="pr">PR & Press</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Subject Line *</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Email subject line"
                  data-testid="template-subject-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email Body *</Label>
                <Textarea
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  placeholder="Write your email template content here...&#10;&#10;You can use placeholders like [Name], [Company], etc."
                  className="min-h-[200px]"
                  data-testid="template-body-input"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTemplateManager(false);
                setEditingTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!editingTemplate?.name?.trim() || !editingTemplate?.subject?.trim()) {
                  toast.error('Please fill in template name and subject');
                  return;
                }
                try {
                  if (editingTemplate.id) {
                    await updateTemplate(editingTemplate.id, editingTemplate);
                  } else {
                    await createTemplate(editingTemplate);
                  }
                  setShowTemplateManager(false);
                  setEditingTemplate(null);
                } catch (e) {
                  // Error already handled in the function
                }
              }}
              disabled={savingTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="save-template-btn"
            >
              {savingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {editingTemplate?.id ? 'Update Template' : 'Save Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Modal */}
      <Dialog open={showSnoozeModal} onOpenChange={(open) => {
        setShowSnoozeModal(open);
        if (!open) setSnoozeEmail(null);
      }}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Snooze Email
            </DialogTitle>
          </DialogHeader>
          
          {snoozeEmail && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900 truncate">{snoozeEmail.subject || '(no subject)'}</p>
                <p className="text-xs text-gray-500">From: {snoozeEmail.from?.emailAddress?.name || snoozeEmail.from?.emailAddress?.address}</p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Options</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Later Today', hours: 3 },
                    { label: 'Tomorrow', hours: 24 },
                    { label: 'This Weekend', hours: 72 },
                    { label: 'Next Week', hours: 168 },
                  ].map((opt) => (
                    <Button
                      key={opt.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const snoozeUntil = new Date(Date.now() + opt.hours * 60 * 60 * 1000).toISOString();
                        snoozeEmailAction(snoozeEmail, snoozeUntil);
                      }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Date & Time</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={snoozeDate}
                    onChange={(e) => setSnoozeDate(e.target.value)}
                    className="flex-1"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    type="time"
                    value={snoozeTime}
                    onChange={(e) => setSnoozeTime(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnoozeModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (snoozeDate && snoozeTime) {
                  const snoozeUntil = new Date(`${snoozeDate}T${snoozeTime}`).toISOString();
                  snoozeEmailAction(snoozeEmail, snoozeUntil);
                } else {
                  toast.error('Please select a date and time');
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Reminder Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={(open) => {
        setShowFollowUpModal(open);
        if (!open) setFollowUpEmail(null);
      }}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-600" />
              Set Follow-up Reminder
            </DialogTitle>
          </DialogHeader>
          
          {followUpEmail && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-900 truncate">{followUpEmail.subject || '(no subject)'}</p>
                <p className="text-xs text-gray-500">To: {followUpEmail.from?.emailAddress?.name || followUpEmail.from?.emailAddress?.address}</p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Remind me if no reply in:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '1 Day', hours: 24 },
                    { label: '2 Days', hours: 48 },
                    { label: '3 Days', hours: 72 },
                    { label: '1 Week', hours: 168 },
                  ].map((opt) => (
                    <Button
                      key={opt.label}
                      variant={followUpHours === opt.hours ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs ${followUpHours === opt.hours ? 'bg-orange-600' : ''}`}
                      onClick={() => setFollowUpHours(opt.hours)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  id="enable-tracking"
                  checked={enableTracking}
                  onCheckedChange={setEnableTracking}
                />
                <label htmlFor="enable-tracking" className="text-xs text-gray-600">
                  Enable open/click tracking for future emails to this contact
                </label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createFollowUp(followUpEmail, followUpHours)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Flag className="w-4 h-4 mr-2" />
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailPage;
