import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, Trash2, Sparkles, Phone, Mail, Globe, MapPin,
  Calendar, Clock, Users, Plus, ExternalLink, MessageSquare, History,
  Building2, User, Send, ClipboardList, Save, X, FileText, DollarSign, CheckCircle2, Upload
} from 'lucide-react';
import EmailComposer from '../../components/sourcing/EmailComposer';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';

const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'];
const DIVISIONS = ['Apparel', 'Accessories', 'Footwear', 'Home & Living', 'Beauty'];
const SEGMENTS = ['Mass', 'Mass Premium', 'Bridge to Luxury', 'Affordable Luxury', 'Premium', 'Luxury'];

// Division-specific categories
const CATEGORIES_BY_DIVISION = {
  'Apparel': [
    'Indian / Ethnic Wear', 'Western', 'Indo-Western', 'Festive Wear', 'Party Wear', 'Casual Wear',
    'Formal Wear', 'Bridal Wear', 'Sarees', 'Kurta Sets', 'Dresses', 'Suits', 'Loungewear', 'Activewear'
  ],
  'Accessories': [
    'Bags & Handbags', 'Jewelry', 'Watches', 'Belts', 'Scarves & Stoles', 'Sunglasses', 'Wallets',
    'Hair Accessories', 'Hats & Caps', 'Ties & Bowties', 'Cufflinks', 'Brooches'
  ],
  'Footwear': [
    'Heels', 'Flats', 'Sneakers', 'Boots', 'Sandals', 'Loafers', 'Formal Shoes', 'Ethnic Footwear',
    'Sports Shoes', 'Wedges', 'Mules', 'Slippers'
  ],
  'Home & Living': [
    'Bedding', 'Cushions & Throws', 'Curtains', 'Rugs & Carpets', 'Table Linen', 'Bath Linen',
    'Decor', 'Candles & Fragrances', 'Kitchenware', 'Storage & Organization'
  ],
  'Beauty': [
    'Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Nail Care', 'Bath & Body', 
    'Men\'s Grooming', 'Tools & Accessories', 'Organic & Natural', 'Luxury Beauty'
  ]
};

const BrandDetailPage = ({ editMode: initialEditMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  const [brand, setBrand] = useState(null);
  const [editedBrand, setEditedBrand] = useState(null);
  const [isEditMode, setIsEditMode] = useState(initialEditMode || location.pathname.endsWith('/edit'));
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [inboxEmails, setInboxEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ email: '', name: '' });
  const [emailReplyData, setEmailReplyData] = useState({ subject: '', quotedContent: '', isReply: false });
  const [newContact, setNewContact] = useState({ name: '', role: '', business_email: '', phone: '' });
  const [updatingStage, setUpdatingStage] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    inventory_model: '', // 'outright_purchase' or 'sor'
    commission_rate: '',  // For SOR
    payout_terms: '',     // For SOR
    margin: '',           // For Outright Purchase
    payment_terms: '',    // For Outright Purchase
    credit_limit: '',     // For Outright Purchase
    stock_correction: '',
    contract_start_date: '',
    contract_end_date: '',
    agreement_notes: '',
    agreement_attachment_url: ''
  });
  const [savingAgreement, setSavingAgreement] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [mailboxTab, setMailboxTab] = useState('sent'); // 'sent' or 'inbox'
  const [loadingInbox, setLoadingInbox] = useState(false);

  useEffect(() => {
    fetchBrandDetails();
  }, [id]);

  useEffect(() => {
    // Update edit mode based on URL
    setIsEditMode(location.pathname.endsWith('/edit'));
  }, [location.pathname]);

  useEffect(() => {
    // Initialize edited brand when entering edit mode
    if (isEditMode && brand && !editedBrand) {
      setEditedBrand({ ...brand });
    }
  }, [isEditMode, brand]);

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

  const handleSaveBrand = async () => {
    if (!editedBrand.name) {
      toast.error('Brand name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/sourcing/brands/${id}`, editedBrand);
      setBrand(editedBrand);
      toast.success('Brand updated successfully');
      navigate(`/sourcing/brands/${id}`);
    } catch (error) {
      toast.error('Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedBrand(null);
    navigate(`/sourcing/brands/${id}`);
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

  // Fetch inbox emails for this brand
  const fetchInboxEmails = async () => {
    if (!brand?.email) return;
    setLoadingInbox(true);
    try {
      const res = await api.get(`/sourcing/brands/${id}/inbox`);
      setInboxEmails(res.data || []);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
      // Silently fail - inbox is optional
    } finally {
      setLoadingInbox(false);
    }
  };

  // Initialize agreement form when brand loads
  useEffect(() => {
    if (brand) {
      setAgreementForm({
        inventory_model: brand.inventory_model || '',
        commission_rate: brand.commission_rate || '',
        payout_terms: brand.payout_terms || '',
        margin: brand.margin || '',
        payment_terms: brand.payment_terms || '',
        credit_limit: brand.credit_limit || '',
        stock_correction: brand.stock_correction || '',
        contract_start_date: brand.contract_start_date ? brand.contract_start_date.split('T')[0] : '',
        contract_end_date: brand.contract_end_date ? brand.contract_end_date.split('T')[0] : '',
        agreement_notes: brand.agreement_notes || '',
        agreement_attachment_url: brand.agreement_attachment_url || ''
      });
    }
  }, [brand]);

  // Handle file upload for agreement attachment
  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post(`/sourcing/brands/${id}/upload-agreement`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setAgreementForm(prev => ({ ...prev, agreement_attachment_url: res.data.url }));
      toast.success('Attachment uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Save agreement details
  const handleSaveAgreement = async () => {
    if (!agreementForm.inventory_model) {
      toast.error('Please select an inventory model');
      return;
    }
    
    setSavingAgreement(true);
    try {
      const updateData = {
        inventory_model: agreementForm.inventory_model,
        stock_correction: agreementForm.stock_correction || null,
        contract_start_date: agreementForm.contract_start_date || null,
        contract_end_date: agreementForm.contract_end_date || null,
        agreement_notes: agreementForm.agreement_notes || null,
        agreement_attachment_url: agreementForm.agreement_attachment_url || null,
        // Auto-update pipeline stage to Negotiating if adding agreement details
        onboarding_stage: brand?.onboarding_stage === 'new_lead' || brand?.onboarding_stage === 'contacted' 
          ? 'negotiating' 
          : brand?.onboarding_stage
      };
      
      // Add model-specific fields
      if (agreementForm.inventory_model === 'sor') {
        updateData.commission_rate = agreementForm.commission_rate ? parseFloat(agreementForm.commission_rate) : null;
        updateData.payout_terms = agreementForm.payout_terms || null;
        // Clear outright fields
        updateData.margin = null;
        updateData.payment_terms = null;
        updateData.credit_limit = null;
      } else if (agreementForm.inventory_model === 'outright_purchase') {
        updateData.margin = agreementForm.margin ? parseFloat(agreementForm.margin) : null;
        updateData.payment_terms = agreementForm.payment_terms || null;
        updateData.credit_limit = agreementForm.credit_limit ? parseFloat(agreementForm.credit_limit) : null;
        // Clear SOR fields
        updateData.commission_rate = null;
        updateData.payout_terms = null;
      }
      
      await api.put(`/sourcing/brands/${id}`, updateData);
      setBrand(prev => ({ ...prev, ...updateData }));
      toast.success('Agreement details saved successfully');
      setShowAgreementModal(false);
    } catch (error) {
      toast.error('Failed to save agreement details');
    } finally {
      setSavingAgreement(false);
    }
  };

  // Send agreement to brand
  const handleSendAgreement = async () => {
    try {
      await api.post(`/sourcing/brands/${id}/agreement/send`);
      setBrand(prev => ({ 
        ...prev, 
        agreement_status: 'sent',
        onboarding_stage: 'agreement_sent'
      }));
      toast.success('Agreement sent to brand');
    } catch (error) {
      toast.error('Failed to send agreement');
    }
  };

  // Mark agreement as signed
  const handleMarkSigned = async () => {
    try {
      await api.post(`/sourcing/brands/${id}/agreement/sign`);
      setBrand(prev => ({ 
        ...prev, 
        agreement_status: 'signed',
        onboarding_stage: 'agreement_signed'
      }));
      toast.success('Agreement marked as signed');
    } catch (error) {
      toast.error('Failed to update agreement status');
    }
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openEmailComposer = (email, name, replyData = null) => {
    setEmailRecipient({ email: email || brand.email, name: name || brand.founder_name || brand.name });
    
    if (replyData) {
      // This is a reply - set subject with "Re:" and include quoted content
      const subject = replyData.subject?.startsWith('Re:') 
        ? replyData.subject 
        : `Re: ${replyData.subject || ''}`;
      
      // Format quoted content
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
      
      setEmailReplyData({ 
        subject, 
        quotedContent, 
        isReply: true 
      });
    } else {
      // New email - clear reply data
      setEmailReplyData({ subject: '', quotedContent: '', isReply: false });
    }
    
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

  // Edit Mode Render
  if (isEditMode && editedBrand) {
    return (
      <div className="p-6 space-y-6" data-testid="brand-edit-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={handleCancelEdit} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to Brand
            </button>
            <h1 className="text-3xl font-serif text-gray-900">Edit Brand</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSaveBrand} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand Name *</Label>
                <Input
                  value={editedBrand.name || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Brand name"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editedBrand.website || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Division, Segment, Stage */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Division</Label>
                <Select 
                  value={editedBrand.division || 'Apparel'} 
                  onValueChange={(v) => setEditedBrand(prev => ({ ...prev, division: v, categories: [] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select 
                  value={editedBrand.segment || ''} 
                  onValueChange={(v) => setEditedBrand(prev => ({ ...prev, segment: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pipeline Stage</Label>
                <Select 
                  value={editedBrand.pipeline_stage || 'Discovery'} 
                  onValueChange={(v) => setEditedBrand(prev => ({ ...prev, pipeline_stage: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="grid grid-cols-4 gap-2">
                {(CATEGORIES_BY_DIVISION[editedBrand.division] || CATEGORIES_BY_DIVISION['Apparel']).map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-cat-${cat}`}
                      checked={(editedBrand.categories || []).includes(cat)}
                      onCheckedChange={(checked) => {
                        const categories = editedBrand.categories || [];
                        if (checked) {
                          setEditedBrand(prev => ({ ...prev, categories: [...categories, cat] }));
                        } else {
                          setEditedBrand(prev => ({ ...prev, categories: categories.filter(c => c !== cat) }));
                        }
                      }}
                    />
                    <label htmlFor={`edit-cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={editedBrand.email || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@brand.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editedBrand.phone || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Founder Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Founder Name</Label>
                <Input
                  value={editedBrand.founder_name || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, founder_name: e.target.value }))}
                  placeholder="Founder name"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editedBrand.city || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editedBrand.description || ''}
                onChange={(e) => setEditedBrand(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brand description..."
                rows={4}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={editedBrand.notes || ''}
                onChange={(e) => setEditedBrand(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes about this brand..."
                rows={3}
              />
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram Handle</Label>
                <Input
                  value={editedBrand.instagram || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@brandhandle"
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={editedBrand.linkedin || ''}
                  onChange={(e) => setEditedBrand(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="LinkedIn URL"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail Mode Render
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

          {/* Agreement & Onboarding */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Agreement & Onboarding
              </CardTitle>
              {brand?.agreement_status && (
                <Badge className={
                  brand.agreement_status === 'signed' ? 'bg-green-100 text-green-700' :
                  brand.agreement_status === 'sent' ? 'bg-amber-100 text-amber-700' :
                  brand.agreement_status === 'expired' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }>
                  {brand.agreement_status.charAt(0).toUpperCase() + brand.agreement_status.slice(1)}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Onboarding Stage</Label>
                      <Select
                        value={editedBrand?.onboarding_stage || 'new_lead'}
                        onValueChange={(v) => setEditedBrand({...editedBrand, onboarding_stage: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_lead">New Lead</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="negotiating">Negotiating</SelectItem>
                          <SelectItem value="agreement_sent">Agreement Sent</SelectItem>
                          <SelectItem value="agreement_signed">Agreement Signed</SelectItem>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                          <SelectItem value="active_partner">Active Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Agreement Status</Label>
                      <Select
                        value={editedBrand?.agreement_status || ''}
                        onValueChange={(v) => setEditedBrand({...editedBrand, agreement_status: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="signed">Signed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Commission Rate (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 15"
                        value={editedBrand?.commission_rate || ''}
                        onChange={(e) => setEditedBrand({...editedBrand, commission_rate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Payment Terms</Label>
                      <Select
                        value={editedBrand?.payment_terms || ''}
                        onValueChange={(v) => setEditedBrand({...editedBrand, payment_terms: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="net_15">Net 15</SelectItem>
                          <SelectItem value="net_30">Net 30</SelectItem>
                          <SelectItem value="net_45">Net 45</SelectItem>
                          <SelectItem value="net_60">Net 60</SelectItem>
                          <SelectItem value="cod">Cash on Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contract Start Date</Label>
                      <Input
                        type="date"
                        value={editedBrand?.contract_start_date || ''}
                        onChange={(e) => setEditedBrand({...editedBrand, contract_start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Contract End Date</Label>
                      <Input
                        type="date"
                        value={editedBrand?.contract_end_date || ''}
                        onChange={(e) => setEditedBrand({...editedBrand, contract_end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Agreement Notes / Special Terms</Label>
                    <Textarea
                      placeholder="Any special terms, exclusivity clauses, etc."
                      value={editedBrand?.agreement_notes || ''}
                      onChange={(e) => setEditedBrand({...editedBrand, agreement_notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Onboarding Stage */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Onboarding Stage</span>
                    <Badge variant="outline" className="capitalize">
                      {(brand?.onboarding_stage || 'new_lead').replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  {/* Agreement Details */}
                  {brand?.inventory_model ? (
                    <div className="space-y-4">
                      {/* Inventory Model Badge */}
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 text-orange-700 text-xs mb-1">
                          <Building2 className="h-3 w-3" /> Inventory Model
                        </div>
                        <p className="font-semibold text-orange-800 capitalize">
                          {brand.inventory_model === 'sor' ? 'SOR (Sale or Return)' : 'Outright Purchase'}
                        </p>
                      </div>
                      
                      {/* Model-specific fields */}
                      <div className="grid grid-cols-2 gap-4">
                        {brand.inventory_model === 'sor' ? (
                          <>
                            {brand?.commission_rate && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                  <DollarSign className="h-3 w-3" /> Commission
                                </div>
                                <p className="font-medium">{brand.commission_rate}%</p>
                              </div>
                            )}
                            {brand?.payout_terms && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                  <Clock className="h-3 w-3" /> Payout Terms
                                </div>
                                <p className="font-medium capitalize">{brand.payout_terms.replace(/_/g, ' ')}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {brand?.margin && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                  <DollarSign className="h-3 w-3" /> Margin
                                </div>
                                <p className="font-medium">{brand.margin}%</p>
                              </div>
                            )}
                            {brand?.payment_terms && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                  <Clock className="h-3 w-3" /> Payment Terms
                                </div>
                                <p className="font-medium capitalize">{brand.payment_terms.replace(/_/g, ' ')}</p>
                              </div>
                            )}
                            {brand?.credit_limit && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                  <DollarSign className="h-3 w-3" /> Credit Limit
                                </div>
                                <p className="font-medium">₹{brand.credit_limit.toLocaleString()}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Stock Correction */}
                      {brand?.stock_correction && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-gray-500 text-xs mb-1">Stock Correction Policy</div>
                          <p className="text-sm">{brand.stock_correction}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  
                  {/* Contract Dates */}
                  {(brand?.contract_start_date || brand?.contract_end_date) && (
                    <div className="grid grid-cols-2 gap-4">
                      {brand?.contract_start_date && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Calendar className="h-3 w-3" /> Contract Start
                          </div>
                          <p className="font-medium">{new Date(brand.contract_start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {brand?.contract_end_date && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Calendar className="h-3 w-3" /> Contract End
                          </div>
                          <p className="font-medium">{new Date(brand.contract_end_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Agreement Notes */}
                  {brand?.agreement_notes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-gray-500 text-xs mb-1">Special Terms</div>
                      <p className="text-sm">{brand.agreement_notes}</p>
                    </div>
                  )}
                  
                  {/* Agreement Attachment */}
                  {brand?.agreement_attachment_url && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">Agreement Document</span>
                        </div>
                        <a 
                          href={brand.agreement_attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* No Agreement Data */}
                  {!brand?.inventory_model && (
                    <div className="text-center py-4 text-gray-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No agreement details added yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAgreementModal(true)}>
                        Add Agreement Details
                      </Button>
                    </div>
                  )}
                  
                  {/* Edit/Action Buttons when data exists */}
                  {brand?.inventory_model && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setShowAgreementModal(true)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Edit Details
                      </Button>
                      {brand?.agreement_status !== 'sent' && brand?.agreement_status !== 'signed' && (
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={handleSendAgreement}>
                          <Send className="h-3 w-3 mr-1" /> Send Agreement
                        </Button>
                      )}
                      {brand?.agreement_status === 'sent' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleMarkSigned}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Mark as Signed
                        </Button>
                      )}
                    </div>
                  )}
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

          {/* Brand Mailbox - Full Email View with Tabs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-gray-500 uppercase tracking-wider font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Brand Mailbox
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEmailComposer(brand.email, brand.founder_name || brand.name)}
                >
                  <Send className="h-4 w-4 mr-2" /> Compose
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  fetchBrandDetails();
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
                  Inbox ({inboxEmails.length})
                </button>
              </div>

              {/* Sent Tab Content */}
              {mailboxTab === 'sent' && (
                <>
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No emails sent yet</p>
                      <p className="text-sm text-gray-400 mb-4">Start a conversation with this brand</p>
                      <Button 
                        onClick={() => openEmailComposer(brand.email, brand.founder_name || brand.name)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Send className="h-4 w-4 mr-2" /> Send First Email
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {activityLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
                                {log.replied_at && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                    Replied
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
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '-'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {log.sent_at ? new Date(log.sent_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : ''}
                              </p>
                              {log.campaign_name && (
                                <p className="text-xs text-orange-600 mt-1">via {log.campaign_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Inbox Tab Content */}
              {mailboxTab === 'inbox' && (
                <>
                  {loadingInbox ? (
                    <div className="text-center py-12">
                      <div className="animate-spin h-8 w-8 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-gray-500">Loading conversation...</p>
                    </div>
                  ) : inboxEmails.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No email conversation yet</p>
                      <p className="text-sm text-gray-400">Send an email to start a conversation with {brand?.name || 'this brand'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {inboxEmails.map((email, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
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
                                  : `To: ${email.to_emails?.[0] || brand?.email}`}
                              </p>
                              {email.body_preview && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {email.body_preview}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <p className="text-xs text-gray-400">
                                {(email.received_at || email.sent_at) ? new Date(email.received_at || email.sent_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '-'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {(email.received_at || email.sent_at) ? new Date(email.received_at || email.sent_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : ''}
                              </p>
                              {email.direction === 'incoming' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-2 text-orange-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEmailComposer(email.from_email, email.from_name || brand?.name, {
                                      subject: email.subject,
                                      bodyPreview: email.body_preview,
                                      fromEmail: email.from_email,
                                      fromName: email.from_name,
                                      date: email.received_at || email.sent_at
                                    });
                                  }}
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
        onClose={() => {
          setShowEmailComposer(false);
          setEmailReplyData({ subject: '', quotedContent: '', isReply: false });
        }}
        entityType="brand"
        entityId={id}
        entityName={brand?.name}
        defaultEmail={emailRecipient.email}
        defaultRecipientName={emailRecipient.name}
        replyData={emailReplyData}
        onSuccess={() => {
          fetchBrandDetails();
          fetchInboxEmails();
        }}
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

      {/* Agreement Details Modal */}
      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Agreement Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Inventory Model Selection */}
            <div>
              <Label className="text-sm font-medium">Inventory Model *</Label>
              <Select 
                value={agreementForm.inventory_model}
                onValueChange={(v) => setAgreementForm(prev => ({ ...prev, inventory_model: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select inventory model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sor">SOR (Sale or Return)</SelectItem>
                  <SelectItem value="outright_purchase">Outright Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* SOR Fields */}
            {agreementForm.inventory_model === 'sor' && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                <p className="text-xs text-blue-600 font-medium uppercase">SOR Terms</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Commission (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={agreementForm.commission_rate}
                      onChange={(e) => setAgreementForm(prev => ({ ...prev, commission_rate: e.target.value }))}
                      placeholder="e.g., 15"
                    />
                  </div>
                  <div>
                    <Label>Payout Terms</Label>
                    <Select 
                      value={agreementForm.payout_terms}
                      onValueChange={(v) => setAgreementForm(prev => ({ ...prev, payout_terms: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payout terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Outright Purchase Fields */}
            {agreementForm.inventory_model === 'outright_purchase' && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-4">
                <p className="text-xs text-green-600 font-medium uppercase">Outright Purchase Terms</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={agreementForm.margin}
                      onChange={(e) => setAgreementForm(prev => ({ ...prev, margin: e.target.value }))}
                      placeholder="e.g., 40"
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Select 
                      value={agreementForm.payment_terms}
                      onValueChange={(v) => setAgreementForm(prev => ({ ...prev, payment_terms: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Advance">Advance</SelectItem>
                        <SelectItem value="COD">Cash on Delivery</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Credit Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={agreementForm.credit_limit}
                    onChange={(e) => setAgreementForm(prev => ({ ...prev, credit_limit: e.target.value }))}
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>
            )}
            
            {/* Stock Correction */}
            <div>
              <Label>Stock Correction Policy</Label>
              <Textarea
                value={agreementForm.stock_correction}
                onChange={(e) => setAgreementForm(prev => ({ ...prev, stock_correction: e.target.value }))}
                placeholder="Define stock correction terms, return policies, damage handling..."
                rows={2}
              />
            </div>
            
            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Start Date</Label>
                <Input
                  type="date"
                  value={agreementForm.contract_start_date}
                  onChange={(e) => setAgreementForm(prev => ({ ...prev, contract_start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contract End Date</Label>
                <Input
                  type="date"
                  value={agreementForm.contract_end_date}
                  onChange={(e) => setAgreementForm(prev => ({ ...prev, contract_end_date: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Special Terms */}
            <div>
              <Label>Special Terms / Notes</Label>
              <Textarea
                value={agreementForm.agreement_notes}
                onChange={(e) => setAgreementForm(prev => ({ ...prev, agreement_notes: e.target.value }))}
                placeholder="Any special terms, exclusivity clauses, or notes..."
                rows={2}
              />
            </div>
            
            {/* Attachment Upload */}
            <div>
              <Label>Agreement Document</Label>
              <div className="mt-1">
                {agreementForm.agreement_attachment_url ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-700">Document attached</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={agreementForm.agreement_attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 h-auto p-1"
                        onClick={() => setAgreementForm(prev => ({ ...prev, agreement_attachment_url: '' }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleAttachmentUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingAttachment}
                    />
                    <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                      {uploadingAttachment ? (
                        <span className="text-sm text-gray-500">Uploading...</span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload agreement document</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgreementModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveAgreement} 
              disabled={savingAgreement || !agreementForm.inventory_model}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {savingAgreement ? 'Saving...' : 'Save Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandDetailPage;
