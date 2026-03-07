import React, { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Mail, Search, Star, Flag, Archive, Trash2, Reply, ReplyAll, Forward,
  RefreshCw, Send, Paperclip, MoreVertical, ChevronLeft, X, AlertCircle,
  Inbox, Send as SendIcon, FileText, ArchiveIcon
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { microsoftAPI } from '../../lib/api';

const EmailPage = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState('new'); // new, reply, replyAll, forward
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, emailId: null });

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: Inbox },
    { id: 'sentitems', name: 'Sent', icon: SendIcon },
    { id: 'drafts', name: 'Drafts', icon: FileText },
    { id: 'archive', name: 'Archive', icon: ArchiveIcon },
  ];

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const response = await microsoftAPI.getStatus();
      setConnectionStatus(response.data);
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus({ connected: false, status: 'error', message: 'Failed to check connection' });
    }
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await microsoftAPI.getEmails(currentFolder, 50, 0, searchQuery || null);
      setEmails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      toast.error('Failed to fetch emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, searchQuery]);

  // Sync emails
  const handleSync = async () => {
    setSyncing(true);
    await fetchEmails();
    setSyncing(false);
    toast.success('Emails synced');
  };

  // Load full email content
  const loadFullEmail = async (messageId) => {
    try {
      const response = await microsoftAPI.getMessage(messageId);
      setFullEmail(response.data);
      // Mark as read if unread
      const email = emails.find(e => e.id === messageId);
      if (email && !email.isRead) {
        await microsoftAPI.markAsRead(messageId, true);
        setEmails(prev => prev.map(e => e.id === messageId ? { ...e, isRead: true } : e));
      }
    } catch (error) {
      console.error('Failed to load email:', error);
      toast.error('Failed to load email content');
    }
  };

  // Handle email selection
  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    loadFullEmail(email.id);
  };

  // Toggle flag
  const handleToggleFlag = async (emailId, currentFlag) => {
    const newFlag = currentFlag === 'flagged' ? 'notFlagged' : 'flagged';
    try {
      await microsoftAPI.setFlag(emailId, newFlag);
      setEmails(prev => prev.map(e => 
        e.id === emailId ? { ...e, flag: { flagStatus: newFlag } } : e
      ));
      toast.success(newFlag === 'flagged' ? 'Email flagged' : 'Flag removed');
    } catch (error) {
      toast.error('Failed to update flag');
    }
  };

  // Archive email
  const handleArchive = async (emailId) => {
    try {
      await microsoftAPI.archiveMessage(emailId);
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
        setFullEmail(null);
      }
      toast.success('Email archived');
    } catch (error) {
      toast.error('Failed to archive email');
    }
  };

  // Delete email
  const handleDelete = async () => {
    if (!deleteDialog.emailId) return;
    try {
      await microsoftAPI.deleteMessage(deleteDialog.emailId);
      setEmails(prev => prev.filter(e => e.id !== deleteDialog.emailId));
      if (selectedEmail?.id === deleteDialog.emailId) {
        setSelectedEmail(null);
        setFullEmail(null);
      }
      toast.success('Email deleted');
    } catch (error) {
      toast.error('Failed to delete email');
    } finally {
      setDeleteDialog({ open: false, emailId: null });
    }
  };

  // Open compose
  const openCompose = (mode = 'new', email = null) => {
    setComposeMode(mode);
    
    if (mode === 'new') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
    } else if (mode === 'reply' && email) {
      const fromEmail = email.from?.emailAddress?.address || '';
      setComposeTo(fromEmail);
      setComposeCc('');
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`\n\n---\nOn ${format(new Date(email.receivedDateTime), 'PPpp')}, ${fromEmail} wrote:\n${email.bodyPreview || ''}`);
    } else if (mode === 'replyAll' && email) {
      const fromEmail = email.from?.emailAddress?.address || '';
      const ccEmails = email.toRecipients?.map(r => r.emailAddress?.address).filter(e => e) || [];
      setComposeTo(fromEmail);
      setComposeCc(ccEmails.join(', '));
      setComposeSubject(`Re: ${email.subject || ''}`);
      setComposeBody(`\n\n---\nOn ${format(new Date(email.receivedDateTime), 'PPpp')}, ${fromEmail} wrote:\n${email.bodyPreview || ''}`);
    } else if (mode === 'forward' && email) {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject(`Fwd: ${email.subject || ''}`);
      setComposeBody(`\n\n---\nForwarded message:\nFrom: ${email.from?.emailAddress?.address || ''}\nDate: ${format(new Date(email.receivedDateTime), 'PPpp')}\nSubject: ${email.subject || ''}\n\n${email.bodyPreview || ''}`);
    }
    
    setShowCompose(true);
  };

  // Send email
  const handleSend = async () => {
    if (!composeTo.trim()) {
      toast.error('Please enter a recipient');
      return;
    }
    
    setSending(true);
    try {
      const data = {
        to_recipients: composeTo.split(',').map(e => e.trim()).filter(e => e),
        subject: composeSubject,
        body: composeBody.replace(/\n/g, '<br>'),
        is_html: true,
        cc_recipients: composeCc ? composeCc.split(',').map(e => e.trim()).filter(e => e) : null,
      };
      
      if (composeMode === 'reply' || composeMode === 'replyAll') {
        data.reply_to_message_id = selectedEmail?.id;
        data.is_reply_all = composeMode === 'replyAll';
      }
      
      await microsoftAPI.sendEmail(data);
      toast.success('Email sent successfully');
      setShowCompose(false);
      
      // Refresh if we're in sent folder
      if (currentFolder === 'sentitems') {
        fetchEmails();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Format date
  const formatEmailDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffDays < 7) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  useEffect(() => {
    checkConnection();
    fetchEmails();
  }, [checkConnection, fetchEmails]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmails();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="email-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Email</h1>
          <p className="text-[#5D4A3A] text-sm">Microsoft 365 Email Integration</p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              connectionStatus.connected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {connectionStatus.connected ? 'Connected' : 'Limited Access'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-[#E8D5C4]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            onClick={() => openCompose('new')}
            className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            data-testid="compose-email-btn"
          >
            <Mail className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar - Folders */}
        <div className="w-48 flex-shrink-0">
          <Card className="h-full border-[#E8D5C4]">
            <CardContent className="p-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentFolder === folder.id
                      ? 'bg-[#E8D5C4] text-[#4A3728]'
                      : 'text-[#5D4A3A] hover:bg-[#F5EDE5]'
                  }`}
                  data-testid={`folder-${folder.id}`}
                >
                  <folder.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{folder.name}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Email List */}
        <div className="w-96 flex-shrink-0 flex flex-col">
          <Card className="flex-1 border-[#E8D5C4] flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#5D4A3A]" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-[#E8D5C4]"
                  data-testid="email-search"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#4A3728]" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-[#5D4A3A]">
                  <Mail className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No emails found</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8D5C4]">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedEmail?.id === email.id
                          ? 'bg-[#E8D5C4]'
                          : email.isRead
                          ? 'bg-white hover:bg-[#F5EDE5]'
                          : 'bg-[#F5EDE5] hover:bg-[#E8D5C4]'
                      }`}
                      data-testid={`email-item-${email.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-[#4A3728]' : 'text-[#5D4A3A]'}`}>
                              {email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown'}
                            </span>
                            <span className="text-xs text-[#5D4A3A] flex-shrink-0">
                              {formatEmailDate(email.receivedDateTime)}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-[#4A3728]' : 'text-[#5D4A3A]'}`}>
                            {email.subject || '(No subject)'}
                          </p>
                          <p className="text-xs text-[#5D4A3A] truncate">
                            {email.bodyPreview || ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {email.hasAttachments && (
                            <Paperclip className="h-3 w-3 text-[#5D4A3A]" />
                          )}
                          {email.flag?.flagStatus === 'flagged' && (
                            <Flag className="h-3 w-3 text-red-500 fill-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Detail */}
        <div className="flex-1 min-w-0">
          <Card className="h-full border-[#E8D5C4] flex flex-col">
            {selectedEmail && fullEmail ? (
              <>
                <CardHeader className="flex-shrink-0 border-b border-[#E8D5C4]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg text-[#4A3728] truncate">
                        {fullEmail.subject || '(No subject)'}
                      </CardTitle>
                      <p className="text-sm text-[#5D4A3A] mt-1">
                        From: {fullEmail.from?.emailAddress?.name || fullEmail.from?.emailAddress?.address}
                        {fullEmail.from?.emailAddress?.name && (
                          <span className="text-xs ml-1">
                            &lt;{fullEmail.from?.emailAddress?.address}&gt;
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#5D4A3A]">
                        To: {fullEmail.toRecipients?.map(r => r.emailAddress?.address).join(', ')}
                      </p>
                      <p className="text-xs text-[#5D4A3A]">
                        {fullEmail.receivedDateTime && format(new Date(fullEmail.receivedDateTime), 'PPpp')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCompose('reply', selectedEmail)}
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCompose('replyAll', selectedEmail)}
                        title="Reply All"
                      >
                        <ReplyAll className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCompose('forward', selectedEmail)}
                        title="Forward"
                      >
                        <Forward className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleFlag(selectedEmail.id, selectedEmail.flag?.flagStatus)}>
                            <Flag className="h-4 w-4 mr-2" />
                            {selectedEmail.flag?.flagStatus === 'flagged' ? 'Remove Flag' : 'Flag'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(selectedEmail.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteDialog({ open: true, emailId: selectedEmail.id })}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {fullEmail.body?.contentType === 'html' ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: fullEmail.body?.content || '' }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-[#4A3728]">
                      {fullEmail.body?.content || fullEmail.bodyPreview || ''}
                    </pre>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#5D4A3A]">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Select an email to view</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {composeMode === 'new' ? 'New Email' : 
               composeMode === 'reply' ? 'Reply' :
               composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#4A3728]">To</label>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="recipient@example.com"
                className="border-[#E8D5C4]"
                data-testid="compose-to"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">CC</label>
              <Input
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
                placeholder="cc@example.com"
                className="border-[#E8D5C4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Subject</label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Email subject"
                className="border-[#E8D5C4]"
                data-testid="compose-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Message</label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                rows={10}
                className="border-[#E8D5C4]"
                data-testid="compose-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending}
              className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
              data-testid="send-email-btn"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailPage;
