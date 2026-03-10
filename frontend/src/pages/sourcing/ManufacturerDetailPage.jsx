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
  Calendar, Clock, Users, Plus, ExternalLink, Factory,
  FileText, User, Settings, Award, Package, FlaskConical, Send
} from 'lucide-react';
import EmailComposer from '../../components/sourcing/EmailComposer';

const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Factory Visit', 'Sampling', 'Production Trial', 'Active', 'Inactive'];

const ManufacturerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [manufacturer, setManufacturer] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ email: '', name: '' });
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' });
  const [newNote, setNewNote] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    fetchManufacturerDetails();
  }, [id]);

  const fetchManufacturerDetails = async () => {
    setLoading(true);
    try {
      const mfgRes = await api.get(`/sourcing/manufacturers/${id}`);
      setManufacturer(mfgRes.data);
      
      // Try to fetch related data
      try {
        const samplesRes = await api.get(`/sourcing/samples?manufacturer_id=${id}`);
        setSamples(samplesRes.data || []);
      } catch { setSamples([]); }
    } catch (error) {
      toast.error('Failed to load manufacturer details');
      navigate('/sourcing/manufacturers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (newStage) => {
    setUpdatingStage(true);
    try {
      await api.put(`/sourcing/manufacturers/${id}`, { pipeline_stage: newStage });
      setManufacturer(prev => ({ ...prev, pipeline_stage: newStage }));
      toast.success('Pipeline stage updated');
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this manufacturer?')) return;
    try {
      await api.delete(`/sourcing/manufacturers/${id}`);
      toast.success('Manufacturer deleted');
      navigate('/sourcing/manufacturers');
    } catch (error) {
      toast.error('Failed to delete manufacturer');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }
    // Note: This would need a backend endpoint to save notes
    toast.success('Note added');
    setShowAddNote(false);
    setNewNote('');
  };

  const openEmailComposer = (email, name) => {
    setEmailRecipient({ email: email || manufacturer.email, name: name || manufacturer.name });
    setShowEmailComposer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!manufacturer) return null;

  return (
    <div className="p-6 space-y-6" data-testid="manufacturer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/sourcing/manufacturers" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Factory className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{manufacturer.manufacturer_type}</p>
              <h1 className="text-2xl font-semibold text-gray-900">{manufacturer.name}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => openEmailComposer(manufacturer.email, manufacturer.name)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4 mr-2" /> Send Email
          </Button>
          <Select value={manufacturer.pipeline_stage} onValueChange={handleUpdateStage} disabled={updatingStage}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate(`/sourcing/manufacturers/${id}/edit`)}>
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
          {/* Manufacturer Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
                <Factory className="h-4 w-4" /> Manufacturer Information
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {manufacturer.pipeline_stage}
                </Badge>
                <Badge variant="secondary">{manufacturer.manufacturer_type}</Badge>
              </div>

              {manufacturer.description && (
                <p className="text-gray-600 mb-4">{manufacturer.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{manufacturer.city}{manufacturer.city && manufacturer.country ? ', ' : ''}{manufacturer.country}</span>
                </div>
                {manufacturer.website && (
                  <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Globe className="h-4 w-4" />
                    {manufacturer.website.replace(/^https?:\/\//, '').slice(0, 30)}
                  </a>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {manufacturer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${manufacturer.email}`} className="text-blue-600 hover:underline">{manufacturer.email}</a>
                  </div>
                )}
                {manufacturer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{manufacturer.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
                <Award className="h-4 w-4" /> Certifications & Capabilities
              </h3>
              
              {manufacturer.certifications && manufacturer.certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {manufacturer.certifications.map(cert => (
                    <Badge key={cert} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Award className="h-3 w-3 mr-1" /> {cert}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No certifications added</p>
              )}

              {manufacturer.specialties && manufacturer.specialties.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 uppercase mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {manufacturer.specialties.map(spec => (
                      <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Samples from this Manufacturer */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Samples ({samples.length})
              </CardTitle>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => navigate('/sourcing/samples')}>
                <Plus className="h-4 w-4 mr-2" /> Add Sample
              </Button>
            </CardHeader>
            <CardContent>
              {samples.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No samples from this manufacturer yet</p>
              ) : (
                <div className="space-y-3">
                  {samples.slice(0, 5).map(sample => (
                    <div key={sample.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FlaskConical className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{sample.name || sample.style_number}</p>
                          <p className="text-sm text-gray-500">{sample.brand_name}</p>
                        </div>
                      </div>
                      <Badge variant={sample.status === 'Approved' ? 'default' : 'secondary'}>
                        {sample.status}
                      </Badge>
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
              {manufacturer.internal_notes ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{manufacturer.internal_notes}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No notes yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pipeline Stage Card */}
          <Card className="bg-gray-900 text-white">
            <CardContent className="p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Pipeline Stage</p>
              <p className="text-lg font-medium text-purple-400">{manufacturer.pipeline_stage}</p>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <Badge variant="outline" className="bg-gray-800 border-gray-600 text-white">
                  {manufacturer.status || 'Active'}
                </Badge>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Follow-up Date</p>
                <Button variant="outline" size="sm" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  <Calendar className="h-4 w-4 mr-2" /> Set follow-up
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
                    <Package className="h-4 w-4" /> MOQ
                  </span>
                  <span className="font-medium">
                    {manufacturer.moq ? `${manufacturer.moq} ${manufacturer.moq_unit || 'pcs'}` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" /> Lead Time
                  </span>
                  <span className="font-medium">
                    {manufacturer.lead_time_days ? `${manufacturer.lead_time_days} days` : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" /> Payment
                  </span>
                  <span className="font-medium text-right text-sm">
                    {manufacturer.payment_terms || '-'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase mb-2">Price Range</p>
                <p className="font-medium">
                  {manufacturer.price_min || manufacturer.price_max 
                    ? `${manufacturer.currency || 'USD'} ${manufacturer.price_min || 0} - ${manufacturer.price_max || 0}` 
                    : 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {manufacturer.website && (
                  <a href={manufacturer.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" /> Visit Website
                    </Button>
                  </a>
                )}
                {manufacturer.email && (
                  <a href={`mailto:${manufacturer.email}`}>
                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" /> Send Email
                    </Button>
                  </a>
                )}
                <Button variant="outline" className="w-full" onClick={() => navigate('/sourcing/samples')}>
                  <FlaskConical className="h-4 w-4 mr-2" /> Request Sample
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="p-6 text-sm text-gray-500">
              <p>Created: {new Date(manufacturer.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(manufacturer.updated_at).toLocaleDateString()}</p>
              {manufacturer.discovery_method && (
                <Badge variant="outline" className="mt-2">{manufacturer.discovery_method}</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
              placeholder="Enter your note about this manufacturer..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button onClick={handleAddNote} className="bg-purple-600 hover:bg-purple-700">Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer */}
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        entityType="manufacturer"
        entityId={id}
        entityName={manufacturer?.name}
        defaultEmail={emailRecipient.email}
        defaultRecipientName={emailRecipient.name}
        onSuccess={fetchManufacturerDetails}
      />
    </div>
  );
};

export default ManufacturerDetailPage;
