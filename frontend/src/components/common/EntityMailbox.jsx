import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Mail, Send, History, Loader2 } from 'lucide-react';
import UniversalEmailComposer from './UniversalEmailComposer';

/**
 * Universal Mailbox Component for entity detail pages
 * Shows sent emails and inbox (conversation) for an entity
 * 
 * @param {string} entityType - 'brand' | 'supplier' | 'manufacturer' | 'influencer' | 'contact'
 * @param {string} entityId - The entity's ID
 * @param {string} entityName - Display name of the entity
 * @param {string} entityEmail - Email address of the entity
 * @param {Array} activityLogs - Previously sent emails (optional, fetched if not provided)
 * @param {Function} onRefresh - Callback to refresh parent data
 */
const EntityMailbox = ({ 
  entityType,
  entityId, 
  entityName, 
  entityEmail,
  activityLogs = [],
  onRefresh
}) => {
  const { api } = useAuth();
  const [mailboxTab, setMailboxTab] = useState('sent');
  const [inboxEmails, setInboxEmails] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailReplyData, setEmailReplyData] = useState({ subject: '', quotedContent: '', isReply: false });
  const [emailRecipient, setEmailRecipient] = useState({ email: '', name: '' });

  const getEntityEndpoint = () => {
    const endpoints = {
      brand: `/sourcing/brands/${entityId}/inbox`,
      supplier: `/sourcing/suppliers/${entityId}/inbox`,
      manufacturer: `/sourcing/manufacturers/${entityId}/inbox`,
      influencer: `/marketing/influencers/${entityId}/inbox`,
      contact: `/marketing/contacts/${entityId}/inbox`
    };
    return endpoints[entityType] || null;
  };

  const fetchInboxEmails = async () => {
    if (!entityEmail) return;
    
    const endpoint = getEntityEndpoint();
    if (!endpoint) return;
    
    setLoadingInbox(true);
    try {
      const res = await api.get(endpoint);
      setInboxEmails(res.data || []);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoadingInbox(false);
    }
  };

  const openEmailComposer = (email, name, replyData = null) => {
    setEmailRecipient({ email: email || entityEmail, name: name || entityName });
    
    if (replyData) {
      const subject = replyData.subject?.startsWith('Re:') 
        ? replyData.subject 
        : `Re: ${replyData.subject || ''}`;
      
      const date = replyData.date ? new Date(replyData.date).toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      
      const quotedContent = `

---
On ${date}, ${replyData.fromName || replyData.fromEmail} wrote:

${replyData.bodyPreview || ''}`;
      
      setEmailReplyData({ subject, quotedContent, isReply: true });
    } else {
      setEmailReplyData({ subject: '', quotedContent: '', isReply: false });
    }
    
    setShowEmailComposer(true);
  };

  const handleEmailSuccess = () => {
    fetchInboxEmails();
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Mailbox
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openEmailComposer(entityEmail, entityName)}
            >
              <Send className="h-4 w-4 mr-2" /> Compose
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              if (onRefresh) onRefresh();
              if (mailboxTab === 'inbox') fetchInboxEmails();
            }}>
              <History className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mailbox Tabs */}
          <div className="flex gap-1 mb-4 border-b">
            <button
              onClick={() => setMailboxTab('sent')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mailboxTab === 'sent' 
                  ? 'border-orange-600 text-orange-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sent ({activityLogs.length})
            </button>
            <button
              onClick={() => {
                setMailboxTab('inbox');
                if (inboxEmails.length === 0) fetchInboxEmails();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mailboxTab === 'inbox' 
                  ? 'border-orange-600 text-orange-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Conversation ({inboxEmails.length})
            </button>
          </div>

          {/* Sent Tab */}
          {mailboxTab === 'sent' && (
            <>
              {activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No emails sent yet</p>
                  <p className="text-sm text-gray-400 mb-4">Start a conversation with {entityName}</p>
                  <Button 
                    onClick={() => openEmailComposer(entityEmail, entityName)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="h-4 w-4 mr-2" /> Send First Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {activityLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} 
                              className="text-xs"
                            >
                              {log.status === 'sent' ? 'Sent' : log.status === 'failed' ? 'Failed' : log.status}
                            </Badge>
                            {log.opened_at && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                Opened
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 truncate">{log.subject || '(No subject)'}</p>
                          <p className="text-sm text-gray-500 mt-1">To: {log.to_email}</p>
                          {log.content && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {log.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {log.sent_at ? new Date(log.sent_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            }) : '-'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {log.sent_at ? new Date(log.sent_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            }) : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Inbox/Conversation Tab */}
          {mailboxTab === 'inbox' && (
            <>
              {loadingInbox ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 text-orange-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500">Loading conversation...</p>
                </div>
              ) : inboxEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No email conversation yet</p>
                  <p className="text-sm text-gray-400">Send an email to start a conversation with {entityName}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {inboxEmails.map((email, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                        email.direction === 'incoming' && !email.is_read ? 'bg-blue-50 border-blue-200' : ''
                      } ${email.direction === 'outgoing' ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-blue-400'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {email.direction === 'incoming' ? (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                ↙ Received
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                ↗ Sent
                              </Badge>
                            )}
                            {email.direction === 'incoming' && !email.is_read && (
                              <Badge className="text-xs bg-blue-600">New</Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 truncate">{email.subject || '(No subject)'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {email.direction === 'incoming' 
                              ? `From: ${email.from_name || email.from_email}` 
                              : `To: ${email.to_emails?.[0] || entityEmail}`}
                          </p>
                          {email.body_preview && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{email.body_preview}</p>
                          )}
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {(email.received_at || email.sent_at) ? new Date(email.received_at || email.sent_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            }) : '-'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(email.received_at || email.sent_at) ? new Date(email.received_at || email.sent_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            }) : ''}
                          </p>
                          {email.direction === 'incoming' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2 text-orange-600"
                              onClick={() => openEmailComposer(email.from_email, email.from_name || entityName, {
                                subject: email.subject,
                                bodyPreview: email.body_preview,
                                fromEmail: email.from_email,
                                fromName: email.from_name,
                                date: email.received_at || email.sent_at
                              })}
                            >
                              Reply
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Composer */}
      <UniversalEmailComposer
        isOpen={showEmailComposer}
        onClose={() => {
          setShowEmailComposer(false);
          setEmailReplyData({ subject: '', quotedContent: '', isReply: false });
        }}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        defaultEmail={emailRecipient.email}
        defaultRecipientName={emailRecipient.name}
        replyData={emailReplyData}
        onSuccess={handleEmailSuccess}
      />
    </>
  );
};

export default EntityMailbox;
