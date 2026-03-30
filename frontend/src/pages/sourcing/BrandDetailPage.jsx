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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, Trash2, Phone, Mail, Globe, MapPin,
  Calendar, Clock, Users, Plus, ExternalLink, MessageSquare, History,
  Building2, User, Send, ClipboardList, Save, X, FileText, DollarSign, 
  CheckCircle2, Upload, CheckSquare, Circle, AlertCircle, Loader2,
  MoreVertical, ChevronRight
} from 'lucide-react';
import EmailComposer from '../../components/sourcing/EmailComposer';
import CreateTaskDialog from '../../components/shared/CreateTaskDialog';

const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'];
const ONBOARDING_STAGES = [
  { id: 'new_lead', label: 'New Lead', color: 'bg-gray-400' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-yellow-500' },
  { id: 'agreement_sent', label: 'Agreement Sent', color: 'bg-purple-500' },
  { id: 'agreement_signed', label: 'Agreement Signed', color: 'bg-green-500' },
  { id: 'onboarded', label: 'Onboarded', color: 'bg-emerald-600' }
];

const DIVISIONS = ['Apparel', 'Accessories', 'Footwear', 'Home & Living', 'Beauty'];
const SEGMENTS = ['Mass', 'Mass Premium', 'Bridge to Luxury', 'Affordable Luxury', 'Premium', 'Luxury'];

const CATEGORIES_BY_DIVISION = {
  'Apparel': ['Indian / Ethnic Wear', 'Western', 'Indo-Western', 'Festive Wear', 'Party Wear', 'Casual Wear', 'Formal Wear', 'Bridal Wear', 'Sarees', 'Kurta Sets', 'Dresses', 'Suits', 'Loungewear', 'Activewear'],
  'Accessories': ['Bags & Handbags', 'Jewelry', 'Watches', 'Belts', 'Scarves & Stoles', 'Sunglasses', 'Wallets', 'Hair Accessories', 'Hats & Caps', 'Ties & Bowties', 'Cufflinks', 'Brooches'],
  'Footwear': ['Heels', 'Flats', 'Sneakers', 'Boots', 'Sandals', 'Loafers', 'Formal Shoes', 'Ethnic Footwear', 'Sports Shoes', 'Wedges', 'Mules', 'Slippers'],
  'Home & Living': ['Bedding', 'Cushions & Throws', 'Curtains', 'Rugs & Carpets', 'Table Linen', 'Bath Linen', 'Decor', 'Candles & Fragrances', 'Kitchenware', 'Storage & Organization'],
  'Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Nail Care', 'Bath & Body', 'Men\'s Grooming', 'Tools & Accessories', 'Organic & Natural', 'Luxury Beauty']
};

export default function BrandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newNote, setNewNote] = useState('');
  const [newContact, setNewContact] = useState({ name: '', role: '', business_email: '', phone: '' });
  const [updatingStage, setUpdatingStage] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    inventory_model: '',
    commission_rate: '',
    payout_terms: '',
    custom_payout_terms: '',
    margin: '',
    payment_terms: '',
    credit_limit: '',
    stock_correction: '',
    contract_start_date: '',
    contract_end_date: '',
    agreement_notes: '',
    agreement_attachment_url: ''
  });
  const [savingAgreement, setSavingAgreement] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [mailboxTab, setMailboxTab] = useState('sent');
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [brandTasks, setBrandTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [inboxEmails, setInboxEmails] = useState([]);
  const [contentTab, setContentTab] = useState('activity');

  useEffect(() => {
    if (id) {
      fetchBrandDetails();
    }
    if (location.hash === '#mailbox') {
      setContentTab('emails');
    }
  }, [id, location.hash]);

  const fetchBrandDetails = async () => {
    setLoading(true);
    try {
      const [brandRes, contactsRes, notesRes, logsRes] = await Promise.all([
        api.get(`/sourcing/brands/${id}`),
        api.get(`/sourcing/brands/${id}/contacts`).catch(() => ({ data: [] })),
        api.get(`/sourcing/brands/${id}/notes`).catch(() => ({ data: [] })),
        api.get(`/sourcing/campaigns/logs/brand/${id}`).catch(() => ({ data: [] }))
      ]);
      setBrand(brandRes.data);
      setContacts(contactsRes.data || []);
      setNotes(notesRes.data || []);
      setActivityLogs(logsRes.data || []);
      fetchBrandTasks();
    } catch (error) {
      toast.error('Failed to load brand details');
      navigate('/sourcing/brands');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await api.get(`/tasks?source_module=sourcing&source_entity_id=${id}`);
      setBrandTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Failed to fetch brand tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Task updated');
      fetchBrandTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  useEffect(() => {
    if (brand) {
      const standardPayoutTerms = ['Weekly', 'Bi-Weekly', 'Monthly', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];
      const isCustomPayout = brand.payout_terms && !standardPayoutTerms.includes(brand.payout_terms);
      
      setAgreementForm({
        inventory_model: brand.inventory_model || '',
        commission_rate: brand.commission_rate || '',
        payout_terms: isCustomPayout ? 'Custom' : (brand.payout_terms || ''),
        custom_payout_terms: isCustomPayout ? brand.payout_terms : '',
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

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAgreementForm(prev => ({ ...prev, agreement_attachment_url: response.data.url }));
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingAttachment(false);
    }
  };

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
        onboarding_stage: brand?.onboarding_stage === 'new_lead' || brand?.onboarding_stage === 'contacted' 
          ? 'negotiating' 
          : brand?.onboarding_stage
      };
      
      if (agreementForm.inventory_model === 'sor') {
        updateData.commission_rate = agreementForm.commission_rate ? parseFloat(agreementForm.commission_rate) : null;
        updateData.payout_terms = agreementForm.payout_terms === 'Custom' 
          ? agreementForm.custom_payout_terms 
          : agreementForm.payout_terms || null;
        updateData.margin = null;
        updateData.payment_terms = null;
        updateData.credit_limit = null;
      } else if (agreementForm.inventory_model === 'outright_purchase') {
        updateData.margin = agreementForm.margin ? parseFloat(agreementForm.margin) : null;
        updateData.payment_terms = agreementForm.payment_terms || null;
        updateData.credit_limit = agreementForm.credit_limit ? parseFloat(agreementForm.credit_limit) : null;
        updateData.commission_rate = null;
        updateData.payout_terms = null;
      }
      
      await api.put(`/sourcing/brands/${id}`, updateData);
      setBrand(prev => ({ ...prev, ...updateData }));
      toast.success('Agreement details saved');
      setShowAgreementModal(false);
    } catch (error) {
      toast.error('Failed to save agreement details');
    } finally {
      setSavingAgreement(false);
    }
  };

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

  const handleUpdateOnboardingStage = async (newStage) => {
    setUpdatingStage(true);
    try {
      await api.put(`/sourcing/brands/${id}`, { onboarding_stage: newStage });
      setBrand(prev => ({ ...prev, onboarding_stage: newStage }));
      toast.success(`Stage updated to ${newStage.replace(/_/g, ' ')}`);
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/sourcing/brands/${id}`, editForm);
      setBrand(prev => ({ ...prev, ...editForm }));
      setShowEditModal(false);
      toast.success('Brand updated');
    } catch (error) {
      toast.error('Failed to update brand');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/sourcing/brands/${id}`);
      toast.success('Brand deleted');
      navigate('/sourcing/brands');
    } catch (error) {
      toast.error('Failed to delete brand');
    }
  };

  const handleAddContact = async () => {
    try {
      const contactData = {
        name: newContact.name,
        designation: newContact.role,
        email: newContact.business_email,
        phone: newContact.phone,
        is_primary: false
      };
      const response = await api.post(`/sourcing/brands/${id}/contacts`, contactData);
      setContacts(prev => [...prev, response.data]);
      setShowContactModal(false);
      setNewContact({ name: '', role: '', business_email: '', phone: '' });
      toast.success('Contact added');
    } catch (error) {
      console.error('Failed to add contact:', error);
      toast.error('Failed to add contact');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api.post(`/sourcing/brands/${id}/notes`, { content: newNote });
      setNotes(prev => [{ content: newNote, created_at: new Date().toISOString() }, ...prev]);
      setNewNote('');
      setShowNoteModal(false);
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const fetchInboxEmails = async () => {
    setLoadingInbox(true);
    try {
      const response = await api.get(`/sourcing/brands/${id}/inbox`);
      setInboxEmails(response.data || []);
    } catch (error) {
      console.error('Failed to fetch inbox');
    } finally {
      setLoadingInbox(false);
    }
  };

  const getCurrentStageIndex = () => {
    const stage = brand?.onboarding_stage || 'new_lead';
    return ONBOARDING_STAGES.findIndex(s => s.id === stage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#002FA7]" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5F5]">
        <p className="text-[#555555]">Brand not found</p>
        <Button onClick={() => navigate('/sourcing/brands')} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6" data-testid="brand-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-[#555555] mb-6">
        <Link to="/sourcing" className="hover:text-[#002FA7]">Sourcing</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/sourcing/brands" className="hover:text-[#002FA7]">Brands</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#111111]">{brand.name}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white border border-[#E5E5E5] rounded-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Brand Logo */}
            <div className="w-20 h-20 bg-[#F5F5F5] border border-[#E5E5E5] rounded-sm flex items-center justify-center overflow-hidden">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-[#555555]" />
              )}
            </div>
            {/* Brand Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-medium tracking-tight text-[#111111]">{brand.name}</h1>
                <Badge className={`rounded-sm text-xs ${
                  brand.status === 'active' ? 'bg-[#00B050] text-white' : 
                  brand.status === 'pending' ? 'bg-[#FFCC00] text-[#111111]' : 'bg-[#E5E5E5] text-[#111111]'
                }`}>
                  {brand.status || 'Pending'}
                </Badge>
                {brand.inventory_model && (
                  <Badge className="rounded-sm text-xs bg-[#002FA7] text-white">
                    {brand.inventory_model === 'sor' ? 'SOR' : 'Outright'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[#555555]">
                {brand.category && (
                  <span className="flex items-center gap-1">
                    <span className="text-[#111111] font-medium">{brand.division}</span>
                    <span>/</span>
                    <span>{brand.category}</span>
                  </span>
                )}
                {brand.segment && (
                  <Badge variant="outline" className="rounded-sm text-xs border-[#E5E5E5]">{brand.segment}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#555555]">
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#002FA7]">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {brand.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {brand.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCreateTask(true)}
              className="rounded-sm border-[#111111] text-[#111111] hover:bg-[#E5E5E5]"
              data-testid="create-task-btn"
            >
              <Plus className="h-4 w-4 mr-1" /> Task
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setEditForm(brand); setShowEditModal(true); }}
              className="rounded-sm border-[#111111] text-[#111111] hover:bg-[#E5E5E5]"
              data-testid="edit-brand-btn"
            >
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-sm border-[#FF3B30] text-[#FF3B30] hover:bg-red-50"
              data-testid="delete-brand-btn"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white border border-[#E5E5E5] rounded-sm p-6 mb-6">
        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.15em] text-[#555555] mb-4">
          <span>Onboarding Pipeline</span>
        </div>
        <div className="flex items-center justify-between">
          {ONBOARDING_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1">
              <button
                onClick={() => !updatingStage && handleUpdateOnboardingStage(stage.id)}
                disabled={updatingStage}
                className={`flex flex-col items-center gap-2 flex-1 group ${updatingStage ? 'cursor-wait' : 'cursor-pointer'}`}
                data-testid={`stage-${stage.id}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  index <= currentStageIndex 
                    ? 'bg-[#002FA7] text-white' 
                    : 'bg-[#E5E5E5] text-[#555555] group-hover:bg-[#002FA7] group-hover:text-white'
                }`}>
                  {index < currentStageIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  index <= currentStageIndex ? 'text-[#111111]' : 'text-[#555555]'
                }`}>
                  {stage.label}
                </span>
              </button>
              {index < ONBOARDING_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${
                  index < currentStageIndex ? 'bg-[#002FA7]' : 'bg-[#E5E5E5]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Company Details + Contacts */}
        <div className="col-span-1 space-y-6">
          {/* Company Details */}
          <div className="bg-white border border-[#E5E5E5] rounded-sm p-6">
            <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#555555] mb-4">Company Details</h3>
            <div className="space-y-3">
              {brand.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-[#555555]" />
                  <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#002FA7] hover:underline truncate">
                    {brand.website.replace(/https?:\/\//, '')}
                  </a>
                </div>
              )}
              {brand.city && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#555555]" />
                  <span className="text-sm text-[#111111]">{brand.city}</span>
                </div>
              )}
              {brand.founded_year && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[#555555]" />
                  <span className="text-sm text-[#111111]">Founded {brand.founded_year}</span>
                </div>
              )}
              {brand.price_range && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-[#555555]" />
                  <span className="text-sm text-[#111111]">{brand.price_range}</span>
                </div>
              )}
            </div>
            {brand.description && (
              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-[#555555] leading-relaxed">{brand.description}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="bg-white border border-[#E5E5E5] rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#555555]">Contacts ({contacts.length})</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowContactModal(true)}
                className="h-7 px-2 text-[#002FA7] hover:bg-[#E5E5E5]"
                data-testid="add-contact-btn"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-[#555555] text-center py-4">No contacts yet</p>
              ) : (
                contacts.slice(0, 4).map((contact, idx) => (
                  <div key={contact.id || idx} className="flex items-center gap-3 p-2 hover:bg-[#F5F5F5] rounded-sm transition-colors">
                    <div className="w-8 h-8 bg-[#002FA7] rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {contact.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111] truncate">{contact.name}</p>
                      <p className="text-xs text-[#555555] truncate">{contact.designation || contact.role || contact.email || contact.business_email}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedContact(contact); setShowEmailComposer(true); }}
                      className="p-1.5 hover:bg-[#E5E5E5] rounded-sm"
                      data-testid={`email-contact-${idx}`}
                    >
                      <Mail className="h-4 w-4 text-[#555555]" />
                    </button>
                  </div>
                ))
              )}
              {contacts.length > 4 && (
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#002FA7]">
                  View all {contacts.length} contacts
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Agreement + Tabbed Content */}
        <div className="col-span-2 space-y-6">
          {/* Agreement & Financial Terms */}
          <div className="bg-white border border-[#E5E5E5] rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#555555]">Agreement & Financial Terms</h3>
              <div className="flex items-center gap-2">
                {brand.inventory_model && (brand.agreement_status !== 'sent' && brand.agreement_status !== 'signed') && (
                  <Button 
                    size="sm" 
                    onClick={handleSendAgreement}
                    className="h-7 rounded-sm bg-[#002FA7] hover:bg-[#001f7a] text-white"
                    data-testid="send-agreement-btn"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Send Agreement
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAgreementModal(true)}
                  className="h-7 rounded-sm border-[#E5E5E5] hover:bg-[#F5F5F5]"
                  data-testid="edit-agreement-btn"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>
            
            {!brand.inventory_model ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-[#E5E5E5] mx-auto mb-3" />
                <p className="text-sm text-[#555555] mb-3">No agreement configured</p>
                <Button 
                  onClick={() => setShowAgreementModal(true)} 
                  className="rounded-sm bg-[#002FA7] hover:bg-[#001f7a]"
                  data-testid="add-agreement-btn"
                >
                  Add Agreement Details
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-[#555555] uppercase tracking-wider">Model</span>
                    <p className="text-sm font-medium text-[#111111] mt-1">
                      {brand.inventory_model === 'sor' ? 'Sale or Return (SOR)' : 'Outright Purchase'}
                    </p>
                  </div>
                  {brand.inventory_model === 'sor' ? (
                    <>
                      {brand.commission_rate && (
                        <div>
                          <span className="text-xs text-[#555555] uppercase tracking-wider">Commission</span>
                          <p className="text-sm font-medium text-[#111111] mt-1">{brand.commission_rate}%</p>
                        </div>
                      )}
                      {brand.payout_terms && (
                        <div>
                          <span className="text-xs text-[#555555] uppercase tracking-wider">Payout Terms</span>
                          <p className="text-sm font-medium text-[#111111] mt-1">{brand.payout_terms}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {brand.margin && (
                        <div>
                          <span className="text-xs text-[#555555] uppercase tracking-wider">Margin</span>
                          <p className="text-sm font-medium text-[#111111] mt-1">{brand.margin}%</p>
                        </div>
                      )}
                      {brand.payment_terms && (
                        <div>
                          <span className="text-xs text-[#555555] uppercase tracking-wider">Payment Terms</span>
                          <p className="text-sm font-medium text-[#111111] mt-1">{brand.payment_terms}</p>
                        </div>
                      )}
                      {brand.credit_limit && (
                        <div>
                          <span className="text-xs text-[#555555] uppercase tracking-wider">Credit Limit</span>
                          <p className="text-sm font-medium text-[#111111] mt-1">₹{brand.credit_limit.toLocaleString()}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-4">
                  {brand.contract_start_date && (
                    <div>
                      <span className="text-xs text-[#555555] uppercase tracking-wider">Contract Period</span>
                      <p className="text-sm font-medium text-[#111111] mt-1">
                        {new Date(brand.contract_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {brand.contract_end_date && (
                          <> - {new Date(brand.contract_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                  )}
                  {brand.stock_correction && (
                    <div>
                      <span className="text-xs text-[#555555] uppercase tracking-wider">Stock Correction</span>
                      <p className="text-sm text-[#111111] mt-1">{brand.stock_correction}</p>
                    </div>
                  )}
                  {brand.agreement_status && (
                    <div>
                      <span className="text-xs text-[#555555] uppercase tracking-wider">Agreement Status</span>
                      <Badge className={`mt-1 rounded-sm text-xs ${
                        brand.agreement_status === 'signed' ? 'bg-[#00B050] text-white' :
                        brand.agreement_status === 'sent' ? 'bg-[#FFCC00] text-[#111111]' :
                        'bg-[#E5E5E5] text-[#555555]'
                      }`}>
                        {brand.agreement_status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabbed Content: Activity, Emails, Notes */}
          <div className="bg-white border border-[#E5E5E5] rounded-sm">
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <div className="border-b border-[#E5E5E5] px-6">
                <TabsList className="h-12 bg-transparent gap-6">
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#111111] data-[state=active]:text-[#111111] rounded-none text-xs uppercase tracking-wider font-medium text-[#555555] px-0 pb-3"
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="emails" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#111111] data-[state=active]:text-[#111111] rounded-none text-xs uppercase tracking-wider font-medium text-[#555555] px-0 pb-3"
                  >
                    Emails
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#111111] data-[state=active]:text-[#111111] rounded-none text-xs uppercase tracking-wider font-medium text-[#555555] px-0 pb-3"
                  >
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Activity Tab */}
              <TabsContent value="activity" className="p-6 pt-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-[#555555] text-center py-8">No activity yet</p>
                  ) : (
                    activityLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 pb-4 border-b border-[#E5E5E5] last:border-0">
                        <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4 text-[#555555]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#111111]">{log.action || log.event_type}</p>
                          <p className="text-xs text-[#555555] mt-1">
                            {new Date(log.created_at || log.timestamp).toLocaleDateString('en-IN', { 
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Emails Tab */}
              <TabsContent value="emails" className="p-6 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={mailboxTab === 'sent' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setMailboxTab('sent')}
                      className={`rounded-sm text-xs ${mailboxTab === 'sent' ? 'bg-[#111111] text-white' : 'border-[#E5E5E5]'}`}
                    >
                      Sent
                    </Button>
                    <Button 
                      variant={mailboxTab === 'inbox' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => { setMailboxTab('inbox'); if (inboxEmails.length === 0) fetchInboxEmails(); }}
                      className={`rounded-sm text-xs ${mailboxTab === 'inbox' ? 'bg-[#111111] text-white' : 'border-[#E5E5E5]'}`}
                    >
                      Inbox
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowEmailComposer(true)}
                    className="rounded-sm bg-[#002FA7] hover:bg-[#001f7a] text-xs"
                    data-testid="compose-email-btn"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" /> Compose
                  </Button>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {mailboxTab === 'sent' ? (
                    activityLogs.filter(l => l.event_type === 'email_sent').length === 0 ? (
                      <p className="text-sm text-[#555555] text-center py-8">No emails sent yet</p>
                    ) : (
                      activityLogs.filter(l => l.event_type === 'email_sent').map((email, idx) => (
                        <div key={idx} className="p-3 border border-[#E5E5E5] rounded-sm hover:bg-[#F5F5F5]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#111111]">{email.subject || 'No subject'}</span>
                            <span className="text-xs text-[#555555]">
                              {new Date(email.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#555555]">To: {email.recipient_email}</p>
                        </div>
                      ))
                    )
                  ) : (
                    loadingInbox ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
                    ) : inboxEmails.length === 0 ? (
                      <p className="text-sm text-[#555555] text-center py-8">No emails received</p>
                    ) : (
                      inboxEmails.map((email, idx) => (
                        <div key={idx} className="p-3 border border-[#E5E5E5] rounded-sm hover:bg-[#F5F5F5]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#111111]">{email.subject}</span>
                            <span className="text-xs text-[#555555]">
                              {new Date(email.received_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#555555]">From: {email.from_email}</p>
                        </div>
                      ))
                    )
                  )}
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="p-6 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#555555]">{notes.length} notes</span>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNoteModal(true)}
                    className="rounded-sm bg-[#002FA7] hover:bg-[#001f7a] text-xs"
                    data-testid="add-note-btn"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
                  </Button>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-sm text-[#555555] text-center py-8">No notes yet</p>
                  ) : (
                    notes.map((note, idx) => (
                      <div key={idx} className="p-3 border border-[#E5E5E5] rounded-sm">
                        <p className="text-sm text-[#111111] whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-[#555555] mt-2">
                          {new Date(note.created_at).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column: Tasks */}
        <div className="col-span-1">
          <div className="bg-white border border-[#E5E5E5] rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-[#555555]">Tasks ({brandTasks.length})</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCreateTask(true)}
                className="h-7 px-2 text-[#002FA7] hover:bg-[#E5E5E5]"
                data-testid="add-task-btn"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {loadingTasks ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#555555]" /></div>
              ) : brandTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-8 w-8 text-[#E5E5E5] mx-auto mb-2" />
                  <p className="text-sm text-[#555555]">No tasks yet</p>
                  <Button 
                    onClick={() => setShowCreateTask(true)} 
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-sm border-[#E5E5E5] text-xs"
                  >
                    Create First Task
                  </Button>
                </div>
              ) : (
                brandTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-3 border rounded-sm transition-colors ${
                      task.status === 'completed' ? 'bg-[#F5F5F5] border-[#E5E5E5]' : 'border-[#E5E5E5] hover:border-[#002FA7]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className="mt-0.5 flex-shrink-0"
                        data-testid={`toggle-task-${task.id}`}
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="h-4 w-4 text-[#00B050]" />
                        ) : (
                          <Circle className="h-4 w-4 text-[#555555] hover:text-[#002FA7]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.status === 'completed' ? 'line-through text-[#555555]' : 'text-[#111111]'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`rounded-sm text-[10px] ${
                            task.priority === 'urgent' ? 'bg-[#FF3B30] text-white' :
                            task.priority === 'high' ? 'bg-[#FFCC00] text-[#111111]' :
                            'bg-[#E5E5E5] text-[#555555]'
                          }`}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className={`text-[10px] flex items-center gap-1 ${
                              new Date(task.due_date) < new Date() && task.status !== 'completed'
                                ? 'text-[#FF3B30]' : 'text-[#555555]'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      
      {/* Edit Brand Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Division</Label>
                <Select value={editForm.division || ''} onValueChange={(v) => setEditForm(prev => ({ ...prev, division: v, category: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editForm.category || ''} onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(CATEGORIES_BY_DIVISION[editForm.division] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={editForm.website || ''} onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={editForm.city || ''} onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-[#002FA7] hover:bg-[#001f7a]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={newContact.name} onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={newContact.role} onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g., Sales Manager" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newContact.business_email} onChange={(e) => setNewContact(prev => ({ ...prev, business_email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newContact.phone} onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button>
            <Button onClick={handleAddContact} className="bg-[#002FA7] hover:bg-[#001f7a]">Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea 
            value={newNote} 
            onChange={(e) => setNewNote(e.target.value)} 
            placeholder="Enter your note..."
            rows={4}
            className="mt-4"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNoteModal(false)}>Cancel</Button>
            <Button onClick={handleAddNote} className="bg-[#002FA7] hover:bg-[#001f7a]">Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-[#555555]">Are you sure you want to delete <strong>{brand.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-[#FF3B30] hover:bg-red-600 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agreement Modal */}
      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agreement Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Inventory Model</Label>
              <Select value={agreementForm.inventory_model} onValueChange={(v) => setAgreementForm(prev => ({ ...prev, inventory_model: v }))}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sor">Sale or Return (SOR)</SelectItem>
                  <SelectItem value="outright_purchase">Outright Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {agreementForm.inventory_model === 'sor' && (
              <div className="p-4 bg-blue-50 rounded-sm border border-blue-200 space-y-4">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">SOR Terms</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Commission (%)</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={agreementForm.commission_rate} onChange={(e) => setAgreementForm(prev => ({ ...prev, commission_rate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Payout Terms</Label>
                    <Select value={agreementForm.payout_terms} onValueChange={(v) => setAgreementForm(prev => ({ ...prev, payout_terms: v, custom_payout_terms: v !== 'Custom' ? '' : prev.custom_payout_terms }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {agreementForm.payout_terms === 'Custom' && (
                      <Input className="mt-2" value={agreementForm.custom_payout_terms} onChange={(e) => setAgreementForm(prev => ({ ...prev, custom_payout_terms: e.target.value }))} placeholder="e.g., Net 7, Every 10 days" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {agreementForm.inventory_model === 'outright_purchase' && (
              <div className="p-4 bg-green-50 rounded-sm border border-green-200 space-y-4">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Outright Purchase Terms</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Margin (%)</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={agreementForm.margin} onChange={(e) => setAgreementForm(prev => ({ ...prev, margin: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Select value={agreementForm.payment_terms} onValueChange={(v) => setAgreementForm(prev => ({ ...prev, payment_terms: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Input type="number" min="0" value={agreementForm.credit_limit} onChange={(e) => setAgreementForm(prev => ({ ...prev, credit_limit: e.target.value }))} />
                </div>
              </div>
            )}

            <div>
              <Label>Stock Correction Policy</Label>
              <Textarea value={agreementForm.stock_correction} onChange={(e) => setAgreementForm(prev => ({ ...prev, stock_correction: e.target.value }))} rows={2} placeholder="Return policies, damage handling..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Start</Label>
                <Input type="date" value={agreementForm.contract_start_date} onChange={(e) => setAgreementForm(prev => ({ ...prev, contract_start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Contract End</Label>
                <Input type="date" value={agreementForm.contract_end_date} onChange={(e) => setAgreementForm(prev => ({ ...prev, contract_end_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Special Terms / Notes</Label>
              <Textarea value={agreementForm.agreement_notes} onChange={(e) => setAgreementForm(prev => ({ ...prev, agreement_notes: e.target.value }))} rows={2} />
            </div>

            <div>
              <Label>Agreement Document</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input type="file" accept=".pdf,.doc,.docx" onChange={handleAttachmentUpload} className="flex-1" disabled={uploadingAttachment} />
                {uploadingAttachment && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {agreementForm.agreement_attachment_url && (
                <a href={agreementForm.agreement_attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#002FA7] mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> View uploaded document
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgreementModal(false)}>Cancel</Button>
            <Button onClick={handleSaveAgreement} disabled={savingAgreement} className="bg-[#002FA7] hover:bg-[#001f7a]">
              {savingAgreement ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save Agreement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Composer */}
      {showEmailComposer && (
        <EmailComposer
          brand={brand}
          contacts={contacts}
          selectedContact={selectedContact}
          onClose={() => { setShowEmailComposer(false); setSelectedContact(null); }}
          onSent={() => { fetchBrandDetails(); }}
          api={api}
        />
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        api={api}
        sourceModule="sourcing"
        sourceEntityType="brand"
        sourceEntityId={id}
        sourceEntityName={brand?.name || 'Brand'}
        onTaskCreated={fetchBrandTasks}
      />
    </div>
  );
}
