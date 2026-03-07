import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, Star, MapPin, Instagram, Youtube, Twitter, Linkedin, Mail, Phone,
  MessageSquare, Handshake, FileText, CreditCard, Image, BarChart3, Send,
  Plus, Clock, CheckCircle, XCircle, DollarSign, RefreshCw, Building2, Edit
} from 'lucide-react';

const ContactDetailPage = () => {
  const { contactId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [contact, setContact] = useState(null);
  const [stats, setStats] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ugc, setUgc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Modals
  const [showCommModal, setShowCommModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // New communication form
  const [newComm, setNewComm] = useState({ comm_type: 'email', subject: '', message: '' });
  // New deal form
  const [newDeal, setNewDeal] = useState({ initial_quote: '', our_budget: '', deadline: '', notes: '' });
  // New payment form
  const [newPayment, setNewPayment] = useState({ amount: '', description: '', payment_method: 'bank_transfer' });

  const fetchContact = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}`);
      setContact(response.data);
    } catch (error) {
      toast.error('Failed to load contact');
      navigate('/marketing/contacts');
    }
  }, [api, contactId, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [api, contactId]);

  const fetchCommunications = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}/communications`);
      setCommunications(response.data || []);
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  }, [api, contactId]);

  const fetchDeals = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}/deals`);
      setDeals(response.data || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    }
  }, [api, contactId]);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/contacts/${contactId}/payments`);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  }, [api, contactId]);

  const fetchUGC = useCallback(async () => {
    try {
      const response = await api.get(`/marketing/v2/ugc?contact_id=${contactId}`);
      setUgc(response.data || []);
    } catch (error) {
      console.error('Failed to load UGC:', error);
    }
  }, [api, contactId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchContact();
      await Promise.all([fetchStats(), fetchCommunications(), fetchDeals(), fetchPayments(), fetchUGC()]);
      setLoading(false);
    };
    loadData();
  }, [fetchContact, fetchStats, fetchCommunications, fetchDeals, fetchPayments, fetchUGC]);

  const handleAddCommunication = async () => {
    try {
      await api.post('/marketing/v2/communications', { contact_id: contactId, ...newComm });
      toast.success('Communication logged');
      setShowCommModal(false);
      setNewComm({ comm_type: 'email', subject: '', message: '' });
      fetchCommunications();
      fetchStats();
    } catch (error) {
      toast.error('Failed to log communication');
    }
  };

  const handleAddDeal = async () => {
    try {
      await api.post('/marketing/v2/deals', {
        contact_id: contactId,
        initial_quote: parseFloat(newDeal.initial_quote),
        our_budget: newDeal.our_budget ? parseFloat(newDeal.our_budget) : null,
        deadline: newDeal.deadline || null,
        notes: newDeal.notes,
        deliverables: [],
      });
      toast.success('Deal created');
      setShowDealModal(false);
      setNewDeal({ initial_quote: '', our_budget: '', deadline: '', notes: '' });
      fetchDeals();
      fetchStats();
      fetchContact();
    } catch (error) {
      toast.error('Failed to create deal');
    }
  };

  const handleAddPayment = async () => {
    try {
      await api.post('/marketing/v2/payments', {
        contact_id: contactId,
        amount: parseFloat(newPayment.amount),
        description: newPayment.description,
        payment_method: newPayment.payment_method,
      });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setNewPayment({ amount: '', description: '', payment_method: 'bank_transfer' });
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading || !contact) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" />
      </div>
    );
  }

  const TYPE_CONFIG = {
    influencer: { color: 'bg-purple-100 text-purple-700' },
    journalist: { color: 'bg-blue-100 text-blue-700' },
    blogger: { color: 'bg-green-100 text-green-700' },
    hybrid: { color: 'bg-amber-100 text-amber-700' },
  };

  return (
    <div className="p-8 space-y-6" data-testid="contact-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/marketing/contacts')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      {/* Contact Header Card */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${TYPE_CONFIG[contact.contact_type]?.color || TYPE_CONFIG.influencer.color}`}>
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#4A3728]">{contact.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={TYPE_CONFIG[contact.contact_type]?.color}>{contact.contact_type}</Badge>
                  {contact.tier && <Badge variant="outline">{contact.tier}</Badge>}
                  <Badge variant="outline">{contact.status}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#5D4A3A]">
                  {contact.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {contact.city}</span>}
                  {contact.publication && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {contact.publication}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-2xl font-bold text-amber-600">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                {contact.score}
              </div>
              <div className="text-sm text-[#5D4A3A]">Contact Score</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-[#E8D5C4]">
            {contact.followers > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-[#4A3728]">{formatNumber(contact.followers)}</div>
                <div className="text-xs text-[#5D4A3A]">Followers</div>
              </div>
            )}
            {contact.engagement_rate > 0 && (
              <div className="text-center">
                <div className="text-xl font-bold text-[#4A3728]">{contact.engagement_rate}%</div>
                <div className="text-xs text-[#5D4A3A]">Engagement</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xl font-bold text-[#4A3728]">{stats?.communications || 0}</div>
              <div className="text-xs text-[#5D4A3A]">Communications</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#4A3728]">{stats?.deals || 0}</div>
              <div className="text-xs text-[#5D4A3A]">Deals</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#4A3728]">{formatCurrency(stats?.total_paid)}</div>
              <div className="text-xs text-[#5D4A3A]">Total Paid</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E8D5C4]">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <Mail className="w-4 h-4" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                <Phone className="w-4 h-4" /> {contact.phone}
              </a>
            )}
            {contact.instagram_handle && (
              <a href={`https://instagram.com/${contact.instagram_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-pink-600">
                <Instagram className="w-4 h-4" /> {contact.instagram_handle}
              </a>
            )}
            {contact.youtube_handle && (
              <a href={`https://youtube.com/${contact.youtube_handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-red-600">
                <Youtube className="w-4 h-4" /> {contact.youtube_handle}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="communications">Communications ({communications.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="content">Content ({ugc.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#5D4A3A]">Industry</Label>
                <div className="font-medium text-[#4A3728]">{contact.industry || '-'}</div>
              </div>
              <div>
                <Label className="text-[#5D4A3A]">Primary Platform</Label>
                <div className="font-medium text-[#4A3728]">{contact.primary_platform || '-'}</div>
              </div>
              {contact.rate_per_reel && (
                <div>
                  <Label className="text-[#5D4A3A]">Rate per Reel</Label>
                  <div className="font-medium text-[#4A3728]">{formatCurrency(contact.rate_per_reel)}</div>
                </div>
              )}
              {contact.rate_per_post && (
                <div>
                  <Label className="text-[#5D4A3A]">Rate per Post</Label>
                  <div className="font-medium text-[#4A3728]">{formatCurrency(contact.rate_per_post)}</div>
                </div>
              )}
              {contact.beat && (
                <div>
                  <Label className="text-[#5D4A3A]">Beat/Focus</Label>
                  <div className="font-medium text-[#4A3728]">{contact.beat}</div>
                </div>
              )}
              {contact.editor_level && (
                <div>
                  <Label className="text-[#5D4A3A]">Editor Level</Label>
                  <div className="font-medium text-[#4A3728]">{contact.editor_level}</div>
                </div>
              )}
              {contact.bio && (
                <div className="col-span-2">
                  <Label className="text-[#5D4A3A]">Bio</Label>
                  <div className="font-medium text-[#4A3728]">{contact.bio}</div>
                </div>
              )}
              {contact.notes && (
                <div className="col-span-2">
                  <Label className="text-[#5D4A3A]">Notes</Label>
                  <div className="font-medium text-[#4A3728]">{contact.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#4A3728]">Communications</CardTitle>
              <Dialog open={showCommModal} onOpenChange={setShowCommModal}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" /> Log Communication</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newComm.comm_type} onValueChange={v => setNewComm({...newComm, comm_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="dm">DM</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Input value={newComm.subject} onChange={e => setNewComm({...newComm, subject: e.target.value})} />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea rows={4} value={newComm.message} onChange={e => setNewComm({...newComm, message: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCommModal(false)}>Cancel</Button>
                    <Button onClick={handleAddCommunication} className="bg-amber-700 hover:bg-amber-800">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <div className="text-center py-8 text-[#5D4A3A]">No communications yet</div>
              ) : (
                <div className="space-y-3">
                  {communications.map(comm => (
                    <div key={comm.id} className="p-3 border border-[#E8D5C4] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{comm.comm_type}</Badge>
                          <span className="font-medium text-[#4A3728]">{comm.subject || '(No subject)'}</span>
                        </div>
                        <span className="text-xs text-[#5D4A3A]">{formatDate(comm.sent_at)}</span>
                      </div>
                      <p className="text-sm text-[#5D4A3A] line-clamp-2">{comm.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#4A3728]">Deals & Contracts</CardTitle>
              <Dialog open={showDealModal} onOpenChange={setShowDealModal}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" /> New Deal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Initial Quote (₹)</Label>
                      <Input type="number" value={newDeal.initial_quote} onChange={e => setNewDeal({...newDeal, initial_quote: e.target.value})} />
                    </div>
                    <div>
                      <Label>Our Budget (₹)</Label>
                      <Input type="number" value={newDeal.our_budget} onChange={e => setNewDeal({...newDeal, our_budget: e.target.value})} />
                    </div>
                    <div>
                      <Label>Deadline</Label>
                      <Input type="date" value={newDeal.deadline} onChange={e => setNewDeal({...newDeal, deadline: e.target.value})} />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={newDeal.notes} onChange={e => setNewDeal({...newDeal, notes: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowDealModal(false)}>Cancel</Button>
                    <Button onClick={handleAddDeal} className="bg-amber-700 hover:bg-amber-800">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <div className="text-center py-8 text-[#5D4A3A]">No deals yet</div>
              ) : (
                <div className="space-y-3">
                  {deals.map(deal => (
                    <div key={deal.id} className="p-4 border border-[#E8D5C4] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={deal.status === 'agreed' ? 'default' : 'outline'}>{deal.status}</Badge>
                        <span className="text-xs text-[#5D4A3A]">{formatDate(deal.created_at)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-[#5D4A3A]">Quote:</span>
                          <span className="font-medium ml-1">{formatCurrency(deal.initial_quote)}</span>
                        </div>
                        <div>
                          <span className="text-[#5D4A3A]">Budget:</span>
                          <span className="font-medium ml-1">{formatCurrency(deal.our_budget)}</span>
                        </div>
                        {deal.final_amount && (
                          <div>
                            <span className="text-[#5D4A3A]">Final:</span>
                            <span className="font-medium ml-1 text-green-600">{formatCurrency(deal.final_amount)}</span>
                          </div>
                        )}
                      </div>
                      {deal.notes && <p className="text-xs text-[#5D4A3A] mt-2">{deal.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="border-[#E8D5C4]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#4A3728]">Payments</CardTitle>
              <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-700 hover:bg-amber-800"><Plus className="w-4 h-4 mr-1" /> Record Payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Amount (₹)</Label>
                      <Input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={newPayment.description} onChange={e => setNewPayment({...newPayment, description: e.target.value})} placeholder="Campaign payment, advance, etc." />
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={newPayment.payment_method} onValueChange={v => setNewPayment({...newPayment, payment_method: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                    <Button onClick={handleAddPayment} className="bg-amber-700 hover:bg-amber-800">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-[#5D4A3A]">No payments yet</div>
              ) : (
                <div className="space-y-3">
                  {payments.map(payment => (
                    <div key={payment.id} className="p-3 border border-[#E8D5C4] rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#4A3728]">{payment.description}</div>
                        <div className="text-xs text-[#5D4A3A]">{payment.invoice_number} • {payment.payment_method}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#4A3728]">{formatCurrency(payment.amount)}</div>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'outline'} className={payment.status === 'paid' ? 'bg-green-100 text-green-700' : ''}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <Card className="border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Content (UGC)</CardTitle>
              <CardDescription>Content created by this contact</CardDescription>
            </CardHeader>
            <CardContent>
              {ugc.length === 0 ? (
                <div className="text-center py-8 text-[#5D4A3A]">No content yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {ugc.map(item => (
                    <div key={item.id} className="border border-[#E8D5C4] rounded-lg p-3">
                      <Badge variant="outline">{item.content_type}</Badge>
                      <div className="font-medium text-[#4A3728] mt-2">{item.title}</div>
                      <div className="text-xs text-[#5D4A3A]">{item.platform} • {formatDate(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card className="border-[#E8D5C4]">
            <CardHeader>
              <CardTitle className="text-[#4A3728]">Performance Metrics</CardTitle>
              <CardDescription>ROI and engagement metrics for this contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 border border-[#E8D5C4] rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#4A3728]">{stats?.ugc_items || 0}</div>
                  <div className="text-sm text-[#5D4A3A]">Content Pieces</div>
                </div>
                <div className="p-4 border border-[#E8D5C4] rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#4A3728]">{stats?.deals || 0}</div>
                  <div className="text-sm text-[#5D4A3A]">Total Deals</div>
                </div>
                <div className="p-4 border border-[#E8D5C4] rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#4A3728]">{formatCurrency(stats?.total_paid)}</div>
                  <div className="text-sm text-[#5D4A3A]">Total Investment</div>
                </div>
                <div className="p-4 border border-[#E8D5C4] rounded-lg text-center">
                  <div className="text-2xl font-bold text-amber-600">{contact.score}</div>
                  <div className="text-sm text-[#5D4A3A]">Contact Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactDetailPage;
