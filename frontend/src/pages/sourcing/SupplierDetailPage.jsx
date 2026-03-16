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
  ArrowLeft, Edit2, Trash2, Phone, Mail, Globe, MapPin,
  Calendar, Clock, Users, Plus, ExternalLink, Package,
  FileText, User, Settings, Send, ClipboardList
} from 'lucide-react';
import EntityMailbox from '../../components/common/EntityMailbox';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';

const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Sampling', 'Evaluation', 'Negotiation', 'Active', 'Inactive'];

const SupplierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [supplier, setSupplier] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ email: '', name: '' });
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' });
  const [newNote, setNewNote] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    fetchSupplierDetails();
  }, [id]);

  const fetchSupplierDetails = async () => {
    setLoading(true);
    try {
      const supplierRes = await api.get(`/sourcing/suppliers/${id}`);
      setSupplier(supplierRes.data);
      // Try to fetch contacts and notes (may not exist yet)
      try {
        const contactsRes = await api.get(`/sourcing/suppliers/${id}/contacts`);
        setContacts(contactsRes.data || []);
      } catch { setContacts([]); }
      try {
        const notesRes = await api.get(`/sourcing/suppliers/${id}/notes`);
        setNotes(notesRes.data || []);
      } catch { setNotes([]); }
    } catch (error) {
      toast.error('Failed to load supplier details');
      navigate('/sourcing/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (newStage) => {
    setUpdatingStage(true);
    try {
      await api.put(`/sourcing/suppliers/${id}`, { pipeline_stage: newStage });
      setSupplier(prev => ({ ...prev, pipeline_stage: newStage }));
      toast.success('Pipeline stage updated');
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/sourcing/suppliers/${id}`);
      toast.success('Supplier deleted');
      navigate('/sourcing/suppliers');
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const openEmailComposer = (email, name) => {
    setEmailRecipient({ email: email || supplier.email, name: name || supplier.name });
    setShowEmailComposer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="p-6 space-y-6" data-testid="supplier-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/sourcing/suppliers" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{supplier.supplier_type}</p>
              <h1 className="text-2xl font-semibold text-gray-900">{supplier.name}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => openEmailComposer(supplier.email, supplier.name)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" /> Send Email
          </Button>
          <Select value={supplier.pipeline_stage} onValueChange={handleUpdateStage} disabled={updatingStage}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={supplier.status || 'New'}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowCreateTask(true)} className="border-teal-200 text-teal-700 hover:bg-teal-50">
            <ClipboardList className="h-4 w-4 mr-2" /> Create Task
          </Button>
          <Button variant="outline" onClick={() => navigate(`/sourcing/suppliers/${id}/edit`)}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" /> Supplier Information
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{supplier.pipeline_stage}</Badge>
                <Badge variant="secondary">{supplier.status || 'New'}</Badge>
              </div>

              {supplier.description && (
                <p className="text-gray-600 mb-4">{supplier.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {supplier.city}{supplier.city && supplier.country ? ', ' : ''}{supplier.country}
                </span>
                {supplier.website && (
                  <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <ExternalLink className="h-4 w-4" />
                    {supplier.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories & Certifications */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" /> Categories & Certifications
              </h3>
              
              {supplier.fabric_categories && supplier.fabric_categories.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 uppercase mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.fabric_categories.map(cat => (
                      <Badge key={cat} variant="outline">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {supplier.certifications && supplier.certifications.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.certifications.map(cert => (
                      <Badge key={cert} variant="secondary">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(!supplier.fabric_categories || supplier.fabric_categories.length === 0) && 
               (!supplier.certifications || supplier.certifications.length === 0) && (
                <p className="text-gray-400">No categories or certifications added</p>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Contacts ({contacts.length})
              </CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setShowAddContact(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No contacts added yet</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.email && <Mail className="h-4 w-4 text-gray-400" />}
                        {contact.phone && <Phone className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Notes
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddNote(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(note.created_at).toLocaleDateString()} by {note.created_by_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Mailbox */}
          <EntityMailbox
            entityType="supplier"
            entityId={id}
            entityName={supplier.name}
            entityEmail={supplier.email}
            activityLogs={[]}
            onRefresh={fetchSupplierDetails}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pipeline Stage Card */}
          <Card className="bg-gray-900 text-white">
            <CardContent className="p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Pipeline Stage</p>
              <p className="text-lg font-medium text-red-400">{supplier.pipeline_stage}</p>
              <p className="text-sm text-gray-400">{supplier.status || 'New'}</p>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Follow-up Date</p>
                <Button variant="outline" size="sm" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  <Calendar className="h-4 w-4 mr-2" /> Set follow-up date
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Business Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Settings className="h-4 w-4" /> MOQ
                  </span>
                  <span className="font-medium">{supplier.moq_meters ? `${supplier.moq_meters} meters` : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" /> Lead Time
                  </span>
                  <span className="font-medium">{supplier.lead_time_days ? `${supplier.lead_time_days} days` : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" /> Payment
                  </span>
                  <span className="font-medium">{supplier.payment_terms || '-'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase mb-2">Price Range (per meter)</p>
                <p className="font-medium">
                  {supplier.price_min || supplier.price_max 
                    ? `${supplier.currency || 'USD'} ${supplier.price_min || 0} - ${supplier.price_max || 0}` 
                    : 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Quick Actions</h3>
              {supplier.website && (
                <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full mb-2">
                    <ExternalLink className="h-4 w-4 mr-2" /> Visit Website
                  </Button>
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`}>
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" /> Send Email
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="p-6 text-sm text-gray-500">
              <p>Created: {new Date(supplier.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(supplier.updated_at).toLocaleDateString()}</p>
              {supplier.discovery_method && (
                <Badge variant="outline" className="mt-2">{supplier.discovery_method}</Badge>
              )}
            </CardContent>
          </Card>
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
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
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
            <Button className="bg-gray-900 hover:bg-gray-800">Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button className="bg-gray-900 hover:bg-gray-800">Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        api={api}
        sourceModule="sourcing"
        sourceEntityType="supplier"
        sourceEntityId={id}
        sourceEntityName={supplier?.name || 'Supplier'}
      />
    </div>
  );
};

export default SupplierDetailPage;
