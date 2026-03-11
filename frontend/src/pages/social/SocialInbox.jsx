import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Inbox, MessageSquare, AtSign, Star, Archive, Trash2, RefreshCw,
  Search, Filter, ChevronDown, Send, Loader2, CheckCircle, AlertTriangle,
  X, MoreHorizontal, Eye, Reply, Tag, UserPlus, Clock, Sparkles
} from 'lucide-react';
import { FaLinkedin, FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';
import { format } from 'date-fns';

const PLATFORMS = {
  linkedin: { icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  twitter: { icon: FaTwitter, color: '#1DA1F2', label: 'Twitter/X' },
  instagram: { icon: FaInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
  youtube: { icon: FaYoutube, color: '#FF0000', label: 'YouTube' },
};

const MESSAGE_TYPES = {
  comment: { label: 'Comment', icon: MessageSquare, color: 'text-blue-500' },
  direct_message: { label: 'DM', icon: Send, color: 'text-purple-500' },
  mention: { label: 'Mention', icon: AtSign, color: 'text-green-500' },
  reply: { label: 'Reply', icon: Reply, color: 'text-amber-500' },
  review: { label: 'Review', icon: Star, color: 'text-yellow-500' },
};

const SENTIMENTS = {
  positive: { label: 'Positive', color: 'bg-green-100 text-green-700' },
  neutral: { label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
  negative: { label: 'Negative', color: 'bg-red-100 text-red-700' },
  unknown: { label: 'Unknown', color: 'bg-gray-50 text-gray-500' },
};

const STATUS_COLORS = {
  unread: 'bg-blue-500',
  read: 'bg-gray-300',
  replied: 'bg-green-500',
  archived: 'bg-gray-400',
  spam: 'bg-red-400',
};

export default function SocialInbox() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySuggestions, setReplySuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    platform: '',
    message_type: '',
    status: '',
    sentiment: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchInbox();
    fetchStats();
  }, [filters]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.message_type) params.append('message_type', filters.message_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.sentiment) params.append('sentiment', filters.sentiment);
      if (filters.search) params.append('search', filters.search);
      
      const res = await api.get(`/social/inbox/items?${params.toString()}`);
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/social/inbox/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const seedDemoData = async () => {
    try {
      await api.post('/social/inbox/seed-demo');
      fetchInbox();
      fetchStats();
      setSuccess('Demo data loaded');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to load demo data');
    }
  };

  const selectItem = async (item) => {
    setSelectedItem(item);
    setReplyContent('');
    setReplySuggestions([]);
    
    // Mark as read if unread
    if (item.status === 'unread') {
      try {
        await api.put(`/social/inbox/items/${item.item_id}/status?status=read`);
        setItems(prev => prev.map(i => i.item_id === item.item_id ? {...i, status: 'read'} : i));
        fetchStats();
      } catch (err) {
        console.error(err);
      }
    }
    
    // Get reply suggestions
    setLoadingSuggestions(true);
    try {
      const res = await api.get(`/social/auto-reply/suggestions/${item.item_id}`);
      setReplySuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const sendReply = async () => {
    if (!replyContent.trim() || !selectedItem) return;
    
    setSending(true);
    try {
      await api.post(`/social/inbox/items/${selectedItem.item_id}/reply`, {
        content: replyContent,
        auto_generated: false
      });
      setSuccess('Reply sent successfully');
      setReplyContent('');
      setSelectedItem({...selectedItem, status: 'replied', reply_content: replyContent});
      setItems(prev => prev.map(i => i.item_id === selectedItem.item_id ? {...i, status: 'replied'} : i));
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const bulkAction = async (action) => {
    if (selectedItems.length === 0) return;
    try {
      await api.post('/social/inbox/items/bulk-action', {
        item_ids: selectedItems,
        action
      });
      setSelectedItems([]);
      fetchInbox();
      fetchStats();
      setSuccess(`Bulk action completed: ${action}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Bulk action failed');
    }
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(i => i.item_id));
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]" data-testid="social-inbox-page">
      {/* Left Panel - Inbox List */}
      <div className="w-[400px] border-r border-[#E8D5C4] flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-[#E8D5C4]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-[#4A3728]">Social Inbox</h1>
              <p className="text-xs text-[#5D4A3A]">
                {stats.unread || 0} unread • {stats.total || 0} total
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={fetchInbox} className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg ${showFilters ? 'bg-rose-100 text-rose-600' : 'hover:bg-[#F5EDE5] text-[#5D4A3A]'}`}>
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full bg-[#F5EDE5] border-0 rounded-lg pl-10 pr-4 py-2 text-sm text-[#4A3728] placeholder-[#9ca3af]"
            />
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-3 p-3 bg-[#F5EDE5] rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filters.platform}
                  onChange={(e) => setFilters({...filters, platform: e.target.value})}
                  className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1.5 text-xs text-[#4A3728]"
                >
                  <option value="">All Platforms</option>
                  {Object.entries(PLATFORMS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={filters.message_type}
                  onChange={(e) => setFilters({...filters, message_type: e.target.value})}
                  className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1.5 text-xs text-[#4A3728]"
                >
                  <option value="">All Types</option>
                  {Object.entries(MESSAGE_TYPES).map(([key, t]) => (
                    <option key={key} value={key}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1.5 text-xs text-[#4A3728]"
                >
                  <option value="">All Status</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={filters.sentiment}
                  onChange={(e) => setFilters({...filters, sentiment: e.target.value})}
                  className="bg-white border border-[#D4BBA6] rounded-lg px-2 py-1.5 text-xs text-[#4A3728]"
                >
                  <option value="">All Sentiment</option>
                  {Object.entries(SENTIMENTS).map(([key, s]) => (
                    <option key={key} value={key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
            <span className="text-xs text-rose-700">{selectedItems.length} selected</span>
            <div className="flex gap-1">
              <button onClick={() => bulkAction('mark_read')} className="text-xs px-2 py-1 hover:bg-rose-100 rounded text-rose-700">Mark Read</button>
              <button onClick={() => bulkAction('archive')} className="text-xs px-2 py-1 hover:bg-rose-100 rounded text-rose-700">Archive</button>
              <button onClick={() => bulkAction('delete')} className="text-xs px-2 py-1 hover:bg-rose-100 rounded text-rose-700">Delete</button>
            </div>
          </div>
        )}
        
        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Inbox className="w-12 h-12 text-[#9ca3af] mx-auto mb-3" />
              <h3 className="text-sm font-medium text-[#4A3728]">No messages</h3>
              <p className="text-xs text-[#5D4A3A] mt-1">Your inbox is empty or no messages match your filters</p>
              <button
                onClick={seedDemoData}
                className="mt-4 text-xs text-rose-600 hover:text-rose-700 underline"
              >
                Load demo data
              </button>
            </div>
          ) : (
            <div>
              {/* Select All */}
              <div className="px-4 py-2 border-b border-[#E8D5C4] flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded bg-white border-[#D4BBA6] text-rose-500"
                />
                <span className="text-xs text-[#5D4A3A]">Select all</span>
              </div>
              
              {items.map(item => {
                const platform = PLATFORMS[item.platform];
                const PlatformIcon = platform?.icon || MessageSquare;
                const msgType = MESSAGE_TYPES[item.message_type];
                const TypeIcon = msgType?.icon || MessageSquare;
                const sentiment = SENTIMENTS[item.sentiment];
                const isSelected = selectedItem?.item_id === item.item_id;
                
                return (
                  <div
                    key={item.item_id}
                    onClick={() => selectItem(item)}
                    className={`p-3 border-b border-[#E8D5C4] cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50' : item.status === 'unread' ? 'bg-amber-50/50' : 'hover:bg-[#F5EDE5]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.item_id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelectItem(item.item_id); }}
                        className="mt-1 rounded bg-white border-[#D4BBA6] text-rose-500"
                      />
                      <div className="w-8 h-8 rounded-full bg-[#F5EDE5] flex items-center justify-center flex-shrink-0">
                        <PlatformIcon className="w-4 h-4" style={{ color: platform?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#4A3728] truncate">{item.author_name}</span>
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status]}`} />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <TypeIcon className={`w-3 h-3 ${msgType?.color}`} />
                          <span className="text-[10px] text-[#5D4A3A]">{msgType?.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${sentiment?.color}`}>{sentiment?.label}</span>
                        </div>
                        <p className="text-xs text-[#5D4A3A] line-clamp-2">{item.content}</p>
                        <span className="text-[10px] text-[#9ca3af] mt-1 block">
                          {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Right Panel - Message Detail & Reply */}
      <div className="flex-1 flex flex-col bg-[#F5EDE5]/30">
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="m-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}
        
        {selectedItem ? (
          <>
            {/* Message Header */}
            <div className="p-4 bg-white border-b border-[#E8D5C4]">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg">
                    {selectedItem.author_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#4A3728]">{selectedItem.author_name}</h2>
                    {selectedItem.author_handle && (
                      <p className="text-xs text-[#5D4A3A]">@{selectedItem.author_handle}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const P = PLATFORMS[selectedItem.platform];
                        const Icon = P?.icon;
                        return Icon ? <Icon className="w-3 h-3" style={{ color: P.color }} /> : null;
                      })()}
                      <span className="text-xs text-[#5D4A3A]">{PLATFORMS[selectedItem.platform]?.label}</span>
                      <span className="text-xs text-[#9ca3af]">•</span>
                      <span className="text-xs text-[#5D4A3A]">{MESSAGE_TYPES[selectedItem.message_type]?.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-1 rounded-full ${SENTIMENTS[selectedItem.sentiment]?.color}`}>
                    {SENTIMENTS[selectedItem.sentiment]?.label}
                  </span>
                  <button className="p-2 hover:bg-[#F5EDE5] rounded-lg text-[#5D4A3A]">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Message Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-xl p-4 border border-[#E8D5C4] mb-4">
                <p className="text-sm text-[#4A3728] whitespace-pre-wrap">{selectedItem.content}</p>
                {selectedItem.post_content && (
                  <div className="mt-3 p-3 bg-[#F5EDE5] rounded-lg border-l-4 border-amber-400">
                    <p className="text-[10px] text-[#5D4A3A] mb-1">In response to:</p>
                    <p className="text-xs text-[#4A3728]">{selectedItem.post_content}</p>
                  </div>
                )}
                <p className="text-[10px] text-[#9ca3af] mt-3">
                  {selectedItem.created_at ? format(new Date(selectedItem.created_at), 'MMMM d, yyyy h:mm a') : ''}
                </p>
              </div>
              
              {/* Previous Reply */}
              {selectedItem.reply_content && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Your reply</span>
                  </div>
                  <p className="text-sm text-green-800">{selectedItem.reply_content}</p>
                </div>
              )}
              
              {/* Reply Suggestions */}
              {!selectedItem.reply_content && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-[#4A3728]">Suggested Replies</span>
                  </div>
                  {loadingSuggestions ? (
                    <div className="flex items-center gap-2 text-xs text-[#5D4A3A]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading suggestions...
                    </div>
                  ) : replySuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {replySuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setReplyContent(s.content)}
                          className="w-full text-left p-3 bg-white rounded-lg border border-[#E8D5C4] hover:border-amber-300 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.type === 'rule' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                              {s.type === 'rule' ? s.rule_name : 'Quick Reply'}
                            </span>
                            {s.confidence && (
                              <span className="text-[9px] text-[#9ca3af]">{s.confidence} confidence</span>
                            )}
                          </div>
                          <p className="text-xs text-[#4A3728]">{s.content}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9ca3af]">No suggestions available</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Reply Input */}
            {!selectedItem.reply_content && (
              <div className="p-4 bg-white border-t border-[#E8D5C4]">
                <div className="flex gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    className="flex-1 bg-[#F5EDE5] border-0 rounded-lg px-4 py-3 text-sm text-[#4A3728] placeholder-[#9ca3af] resize-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-[#9ca3af]">
                    {replyContent.length}/280 characters
                  </span>
                  <button
                    onClick={sendReply}
                    disabled={!replyContent.trim() || sending}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#4A3728]">Select a message</h3>
              <p className="text-sm text-[#5D4A3A] mt-1">Choose a message from the inbox to view and reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
