import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, Trash2, Sparkles, Phone, Mail, Globe, MapPin,
  Calendar, Clock, Users, Plus, ExternalLink, MessageSquare, History,
  Building2, User, Send, ClipboardList
} from 'lucide-react';
import EmailComposer from '../../components/sourcing/EmailComposer';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';

const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'];

const BrandDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [brand, setBrand] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ email: '', name: '' });
  const [newContact, setNewContact] = useState({ name: '', role: '', business_email: '', phone: '' });
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    fetchBrandDetails();
  }, [id]);

  const fetchBrandDetails = async () => {
    setLoading(true);
    try {
      const [brandRes, contactsRes, notesRes, logsRes] = await Promise.all([
        api.get(`/sourcing/brands/${id}`),
        api.get(`/sourcing/contacts/brand/${id}`).catch(() => ({ data: [] })),
        api.get(`/sourcing/brands/${id}/notes`).catch(() => ({ data: [] })),
        api.get(`/sourcing/campaigns/logs/brand/${id}`).catch(() => ({ data: [] }))
      ]);
      setBrand(brandRes.data);
      setContacts(contactsRes.data || []);
      setNotes(notesRes.data || []);
      setActivityLogs(logsRes.data || []);
    } catch (error) {
      toast.error('Failed to load brand details');
      navigate('/sourcing/brands');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (newStage) => {
    setUpdatingStage(true);
    try {
      await api.put(`/sourcing/brands/${id}`, { pipeline_stage: newStage });
      setBrand(prev => ({ ...prev, pipeline_stage: newStage }));
      toast.success('Pipeline stage updated');
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.business_email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await api.post('/sourcing/contacts', { ...newContact, brand_id: id });
      toast.success('Contact added');
      setShowAddContact(false);
      setNewContact({ name: '', role: '', business_email: '', phone: '' });
      fetchBrandDetails();
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await api.delete(`/sourcing/brands/${id}`);
      toast.success('Brand deleted');
      navigate('/sourcing/brands');
    } catch (error) {
      toast.error('Failed to delete brand');
    }
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openEmailComposer = (email, name) => {
    setEmailRecipient({ email: email || brand.email, name: name || brand.founder_name || brand.name });
    setShowEmailComposer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!brand) return null;

  return (
    <div className="p-6 space-y-6" data-testid="brand-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/sourcing/brands" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Brands
          </Link>
          <h1 className="text-3xl font-serif text-gray-900">{brand.name}</h1>
          <Badge variant="outline" className="mt-1">{brand.match_status || 'Pending'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => openEmailComposer(brand.email, brand.founder_name || brand.name)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Send className="h-4 w-4 mr-2" /> Send Email
          </Button>
          <Button variant="outline" onClick={() => setShowCreateTask(true)} className="border-teal-200 text-teal-700 hover:bg-teal-50">
            <ClipboardList className="h-4 w-4 mr-2" /> Create Task
          </Button>
          <Button variant="outline" onClick={() => navigate(`/sourcing/brands/${id}/edit`)}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="bg-gray-900 text-white hover:bg-gray-800">
            <Sparkles className="h-4 w-4 mr-2" /> AI Score
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Brand Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Division</p>
                  <p className="font-medium">{brand.division || 'Apparel'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Segment</p>
                  <p className="font-medium">{brand.segment || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">City</p>
                  <p className="font-medium">{brand.city || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Price Range</p>
                  <p className="font-medium">
                    {brand.min_price || brand.max_price 
                      ? `₹${brand.min_price || 0} - ₹${brand.max_price || 0}` 
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-gray-500 uppercase mb-2">Phone</p>
                <div className="flex items-center gap-3">
                  {brand.phone_number ? (
                    <>
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {brand.phone_number}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-green-600 border-green-200"
                        onClick={() => openWhatsApp(brand.phone_number)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                      </Button>
                    </>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </div>
              </div>

              {/* Source & Dates */}
              <div className="mt-6 pt-6 border-t flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Source:</span>
                  <Badge variant="outline">{brand.discovery_method || 'Manual'}</Badge>
                </div>
                <span>Added: {new Date(brand.created_at).toLocaleDateString()}</span>
                <span>Updated: {new Date(brand.updated_at).toLocaleDateString()} by {brand.updated_by_name || 'System'}</span>
              </div>

              {/* Recent Activity */}
              {activityLogs.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-3">Recent Activity</p>
                  <div className="space-y-2">
                    {activityLogs.slice(0, 5).map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="font-medium">{log.sent_by_name || 'User'}</span>
                        <span className="text-gray-500">sent email to {log.to_name || log.to_email}</span>
                        <span className="text-gray-400">{new Date(log.sent_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Contacts ({contacts.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {contacts.length > 0 && (
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" /> Email All
                  </Button>
                )}
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setShowAddContact(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No contacts added yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contacts.map(contact => (
                    <div key={contact.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{contact.name || contact.founder_name}</p>
                            <p className="text-sm text-gray-500">{contact.role || contact.designation || 'Contact'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm"><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        {contact.business_email}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 w-full"
                        onClick={() => openEmailComposer(contact.business_email, contact.name || contact.founder_name)}
                      >
                        <Mail className="h-4 w-4 mr-2" /> Email
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Email History ({activityLogs.length})
              </CardTitle>
              <Button variant="ghost" size="sm">
                Show <History className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No emails sent yet</p>
              ) : (
                <div className="space-y-2">
                  {activityLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{log.subject || 'No subject'}</p>
                        <p className="text-xs text-gray-500">To: {log.to_email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === 'sent' ? 'default' : 'secondary'} className="text-xs">
                          {log.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">{new Date(log.sent_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pipeline Stage Card */}
          <Card className="bg-gray-900 text-white">
            <CardContent className="p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Pipeline Stage</p>
              <Select 
                value={brand.pipeline_stage} 
                onValueChange={handleUpdateStage}
                disabled={updatingStage}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Outreach Status</p>
                <p className={`font-medium ${brand.last_contacted_at ? 'text-green-400' : 'text-gray-400'}`}>
                  {brand.last_contacted_at ? 'Contacted' : 'Not Contacted'}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Follow-up Date</p>
                <p className="font-medium">{brand.follow_up_date || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {brand.website && (
            <Card>
              <CardContent className="p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
                <a href={brand.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" /> Visit Website
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Fit Score */}
          {brand.fit_score && (
            <Card>
              <CardContent className="p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">AI Fit Score</p>
                <div className="text-4xl font-bold text-center">
                  <span className={brand.fit_score >= 70 ? 'text-green-600' : brand.fit_score >= 50 ? 'text-amber-600' : 'text-gray-500'}>
                    {brand.fit_score}
                  </span>
                  <span className="text-gray-400 text-lg">/100</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contact name"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={newContact.role}
                onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g., Founder, Sales Manager"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newContact.business_email}
                onChange={(e) => setNewContact(prev => ({ ...prev, business_email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
            <Button onClick={handleAddContact} className="bg-gray-900 hover:bg-gray-800">Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer */}
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        entityType="brand"
        entityId={id}
        entityName={brand?.name}
        defaultEmail={emailRecipient.email}
        defaultRecipientName={emailRecipient.name}
        onSuccess={fetchBrandDetails}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        api={api}
        sourceModule="sourcing"
        sourceEntityType="brand"
        sourceEntityId={id}
        sourceEntityName={brand?.name || 'Brand'}
      />
    </div>
  );
};

export default BrandDetailPage;
