import React, { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Mail, Star, Flag, Archive, Trash2, Reply, ReplyAll, Forward,
  RefreshCw, Send, Paperclip, MoreVertical, ChevronLeft, X, AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { microsoftAPI } from '../../lib/api';

/**
 * Email History Tab Component
 * Displays email history for a specific contact with full email management capabilities
 * 
 * @param {string} contactEmail - Primary email address of the contact
 * @param {string[]} contactEmails - Additional email addresses to track
 * @param {string} contactName - Display name of the contact
 * @param {string} entityType - Type of entity (brand, supplier, manufacturer, lead, influencer)
 */
const EmailHistoryTab = ({ 
  contactEmail, 
  contactEmails = [], 
  contactName = 'Contact',
  entityType = 'contact' 
}) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [fullEmail, setFullEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, emailId: null });

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const response = await microsoftAPI.getStatus();
      setConnectionStatus(response.data);
    } catch (error) {
      setConnectionStatus({ connected: false, status: 'error' });
    }
  }, []);

  // Fetch emails for contact
  const fetchEmails = useCallback(async () => {
    if (!contactEmail) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const allEmails = [contactEmail, ...contactEmails].filter(e => e);
      const response = await microsoftAPI.getEmailsForContact(
        contactEmail, 
        contactEmails.length > 0 ? contactEmails : null
      );
      setEmails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [contactEmail, contactEmails]);

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
      setComposeTo(contactEmail);
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
      
      // Refresh emails
      setTimeout(() => fetchEmails(), 2000);
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
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  useEffect(() => {
    checkConnection();
    fetchEmails();
  }, [checkConnection, fetchEmails]);

  if (!contactEmail) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5D4A3A]">
        <p>No email address available for this contact</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="email-history-tab">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-[#4A3728]">Email History</h3>
          <p className="text-sm text-[#5D4A3A]">
            Conversations with {contactName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus && !connectionStatus.connected && (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
              Limited Access
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-[#E8D5C4]"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => openCompose('new')}
            size="sm"
            className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
            data-testid="compose-email-btn"
          >
            <Mail className="h-4 w-4 mr-2" />
            New Email
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Email List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border border-[#E8D5C4] rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-[#4A3728]" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#5D4A3A] p-4">
              <Mail className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm text-center">No email history with this contact</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => openCompose('new')}
                className="text-[#4A3728] mt-2"
              >
                Send first email
              </Button>
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
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${
                          email._folder === 'sentitems' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {email._folder === 'sentitems' ? 'Sent' : 'Received'}
                        </span>
                        <span className="text-xs text-[#5D4A3A]">
                          {formatEmailDate(email.receivedDateTime || email.sentDateTime)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-[#4A3728]' : 'text-[#5D4A3A]'}`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-[#5D4A3A] truncate mt-1">
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
        </div>

        {/* Email Detail */}
        <div className="flex-1 min-w-0 border border-[#E8D5C4] rounded-lg flex flex-col overflow-hidden">
          {selectedEmail && fullEmail ? (
            <>
              <div className="p-4 border-b border-[#E8D5C4] flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-md font-semibold text-[#4A3728] truncate">
                      {fullEmail.subject || '(No subject)'}
                    </h4>
                    <p className="text-sm text-[#5D4A3A] mt-1">
                      From: {fullEmail.from?.emailAddress?.name || fullEmail.from?.emailAddress?.address}
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
              </div>
              <div className="flex-1 overflow-y-auto p-4">
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
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#5D4A3A]">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select an email to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {composeMode === 'new' ? `Email to ${contactName}` : 
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
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Message</label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                rows={8}
                className="border-[#E8D5C4]"
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

export default EmailHistoryTab;
