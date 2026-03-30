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
  MoreVertical, ChevronRight, Instagram, Linkedin
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
const GENDERS = ['Women', 'Men', 'Unisex'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Gurgaon', 'Noida', 'Kochi', 'Goa', 'Other'];

const CATEGORIES_BY_DIVISION = {
  'Apparel': ['Indian / Ethnic Wear', 'Western', 'Indo-Western', 'Festive Wear', 'Party Wear', 'Casual Wear', 'Formal Wear', 'Bridal Wear', 'Sarees', 'Kurta Sets', 'Dresses', 'Suits', 'Loungewear', 'Activewear'],
  'Accessories': ['Bags & Handbags', 'Jewelry', 'Watches', 'Belts', 'Scarves & Stoles', 'Sunglasses', 'Wallets', 'Hair Accessories', 'Hats & Caps', 'Ties & Bowties', 'Cufflinks', 'Brooches'],
  'Footwear': ['Heels', 'Flats', 'Sneakers', 'Boots', 'Sandals', 'Loafers', 'Formal Shoes', 'Ethnic Footwear', 'Sports Shoes', 'Wedges', 'Mules', 'Slippers'],
  'Home & Living': ['Bedding', 'Cushions & Throws', 'Curtains', 'Rugs & Carpets', 'Table Linen', 'Bath Linen', 'Decor', 'Candles & Fragrances', 'Kitchenware', 'Storage & Organization'],
  'Beauty': ['Skincare', 'Makeup', 'Haircare', 'Fragrances', 'Nail Care', 'Bath & Body', 'Men\'s Grooming', 'Tools & Accessories', 'Organic & Natural', 'Luxury Beauty']
};

// Brand color scheme (matching BrandsPage)
const BRAND_COLORS = {
  primary: '#4A3728',
  primaryHover: '#3A2A1E',
  secondary: '#8B7355',
  background: '#F5EBE0',
  card: '#FFFFFF',
  border: '#E8D5C4',
  text: '#4A3728',
  textMuted: '#9C8C74',
  accent: '#D4BBA6',
  success: '#00B050',
  warning: '#FFCC00',
  danger: '#FF3B30'
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
      <div className="flex items-center justify-center min-h-screen bg-[#F5EBE0]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#4A3728] mx-auto" />
          <p className="text-sm text-[#9C8C74] mt-3">Loading brand details...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5EBE0]">
        <div className="w-16 h-16 rounded-full bg-[#E8D5C4] flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-[#9C8C74]" />
        </div>
        <p className="text-[#4A3728] font-medium mb-2">Brand not found</p>
        <p className="text-sm text-[#9C8C74] mb-4">The brand you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/sourcing/brands')} className="bg-[#4A3728] hover:bg-[#3A2A1E] rounded-lg">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Brands
        </Button>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="min-h-screen bg-[#F5EBE0] p-6" data-testid="brand-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-[#9C8C74] mb-6">
        <Link to="/sourcing" className="hover:text-[#4A3728] transition-colors">Sourcing</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/sourcing/brands" className="hover:text-[#4A3728] transition-colors">Brands</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#4A3728]">{brand.name}</span>
      </nav>

      {/* Hero Header Card */}
      <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* Brand Logo */}
            <div className="w-24 h-24 bg-gradient-to-br from-[#4A3728] to-[#8B7355] rounded-xl flex items-center justify-center overflow-hidden shadow-md">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white">{brand.name?.charAt(0)?.toUpperCase() || 'B'}</span>
              )}
            </div>
            {/* Brand Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-[#4A3728]">{brand.name}</h1>
                <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${
                  brand.status === 'active' ? 'bg-green-100 text-green-800' : 
                  brand.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {brand.status || 'Pending'}
                </Badge>
                {brand.inventory_model && (
                  <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-[#4A3728] text-white">
                    {brand.inventory_model === 'sor' ? 'SOR Model' : 'Outright Purchase'}
                  </Badge>
                )}
              </div>
              
              {/* Division, Segment, Categories */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {brand.division && (
                  <Badge variant="outline" className="rounded-full text-xs border-[#D4BBA6] text-[#4A3728] bg-[#F5EBE0]">
                    {brand.division}
                  </Badge>
                )}
                {brand.segment && (
                  <Badge variant="outline" className="rounded-full text-xs border-[#D4BBA6] text-[#4A3728]">
                    {brand.segment}
                  </Badge>
                )}
                {brand.categories?.slice(0, 3).map((cat, idx) => (
                  <Badge key={idx} className="rounded-full text-xs bg-[#F5EBE0] text-[#8B7355]">
                    {cat}
                  </Badge>
                ))}
                {brand.categories?.length > 3 && (
                  <Badge className="rounded-full text-xs bg-gray-100 text-gray-600">
                    +{brand.categories.length - 3} more
                  </Badge>
                )}
              </div>

              {/* Quick Info Row */}
              <div className="flex items-center gap-6 text-sm text-[#9C8C74]">
                {brand.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {brand.city}
                  </span>
                )}
                {brand.founded_year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> Est. {brand.founded_year}
                  </span>
                )}
                {brand.price_range && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" /> {brand.price_range}
                  </span>
                )}
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-3 mt-4">
                {brand.website && (
                  <a 
                    href={brand.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5EBE0] text-[#4A3728] hover:bg-[#E8D5C4] transition-colors text-sm font-medium"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {brand.instagram && (
                  <a 
                    href={`https://instagram.com/${brand.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity text-sm font-medium"
                  >
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                )}
                {brand.linkedin && (
                  <a 
                    href={brand.linkedin.startsWith('http') ? brand.linkedin : `https://linkedin.com/company/${brand.linkedin}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0077B5] text-white hover:opacity-90 transition-opacity text-sm font-medium"
                  >
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
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
              className="rounded-lg border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
              data-testid="create-task-btn"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Task
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setEditForm(brand); setShowEditModal(true); }}
              className="rounded-lg border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0]"
              data-testid="edit-brand-btn"
            >
              <Edit2 className="h-4 w-4 mr-1.5" /> Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border-red-300 text-red-600 hover:bg-red-50"
              data-testid="delete-brand-btn"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E8D5C4] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Contacts</p>
              <p className="text-2xl font-bold text-[#4A3728] mt-1">{contacts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Tasks</p>
              <p className="text-2xl font-bold text-[#4A3728] mt-1">{brandTasks.length}</p>
              <p className="text-xs text-[#9C8C74]">{brandTasks.filter(t => t.status === 'completed').length} completed</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Emails Sent</p>
              <p className="text-2xl font-bold text-[#4A3728] mt-1">{activityLogs.filter(l => l.event_type === 'email_sent').length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E8D5C4] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Notes</p>
              <p className="text-2xl font-bold text-[#4A3728] mt-1">{notes.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-[#9C8C74] mb-5">
          <span>Onboarding Pipeline</span>
          {updatingStage && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <div className="flex items-center justify-between">
          {ONBOARDING_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1">
              <button
                onClick={() => !updatingStage && handleUpdateOnboardingStage(stage.id)}
                disabled={updatingStage}
                className={`flex flex-col items-center gap-2.5 flex-1 group ${updatingStage ? 'cursor-wait' : 'cursor-pointer'}`}
                data-testid={`stage-${stage.id}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all shadow-sm ${
                  index <= currentStageIndex 
                    ? 'bg-[#4A3728] text-white' 
                    : 'bg-[#F5EBE0] text-[#9C8C74] group-hover:bg-[#4A3728] group-hover:text-white'
                }`}>
                  {index < currentStageIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs font-medium transition-colors ${
                  index <= currentStageIndex ? 'text-[#4A3728]' : 'text-[#9C8C74] group-hover:text-[#4A3728]'
                }`}>
                  {stage.label}
                </span>
              </button>
              {index < ONBOARDING_STAGES.length - 1 && (
                <div className={`h-1 flex-1 mx-3 rounded-full transition-colors ${
                  index < currentStageIndex ? 'bg-[#4A3728]' : 'bg-[#E8D5C4]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: 4 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Company Details + Contacts */}
        <div className="col-span-1 space-y-6">
          {/* Company Details */}
          <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C8C74] mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Company Details
            </h3>
            <div className="space-y-4">
              {brand.website && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EBE0] flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-[#4A3728]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9C8C74] uppercase tracking-wider">Website</p>
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4A3728] hover:underline truncate block">
                      {brand.website.replace(/https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
              {brand.city && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EBE0] flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-[#4A3728]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9C8C74] uppercase tracking-wider">Location</p>
                    <p className="text-sm text-[#4A3728]">{brand.city}</p>
                  </div>
                </div>
              )}
              {brand.founded_year && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EBE0] flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-[#4A3728]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9C8C74] uppercase tracking-wider">Founded</p>
                    <p className="text-sm text-[#4A3728]">{brand.founded_year}</p>
                  </div>
                </div>
              )}
              {brand.price_range && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EBE0] flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-[#4A3728]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9C8C74] uppercase tracking-wider">Price Range</p>
                    <p className="text-sm text-[#4A3728]">{brand.price_range}</p>
                  </div>
                </div>
              )}
              {(brand.min_price || brand.max_price) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EBE0] flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-[#4A3728]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9C8C74] uppercase tracking-wider">Price Range</p>
                    <p className="text-sm text-[#4A3728]">
                      ₹{brand.min_price?.toLocaleString() || '0'} - ₹{brand.max_price?.toLocaleString() || '∞'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {brand.description && (
              <div className="mt-5 pt-5 border-t border-[#E8D5C4]">
                <p className="text-xs text-[#9C8C74] uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-[#4A3728] leading-relaxed">{brand.description}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C8C74] flex items-center gap-2">
                <Users className="h-4 w-4" /> Contacts ({contacts.length})
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowContactModal(true)}
                className="h-8 px-2.5 text-[#4A3728] hover:bg-[#F5EBE0] rounded-lg"
                data-testid="add-contact-btn"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-[#9C8C74]" />
                  </div>
                  <p className="text-sm text-[#9C8C74]">No contacts yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowContactModal(true)}
                    className="mt-3 rounded-lg border-[#D4BBA6] text-[#4A3728] text-xs"
                  >
                    Add First Contact
                  </Button>
                </div>
              ) : (
                contacts.slice(0, 5).map((contact, idx) => (
                  <div key={contact.id || idx} className="flex items-center gap-3 p-3 hover:bg-[#F5EBE0] rounded-lg transition-colors group">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4A3728] to-[#8B7355] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                      {contact.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#4A3728] truncate">{contact.name}</p>
                      <p className="text-xs text-[#9C8C74] truncate">{contact.designation || contact.role || contact.email || contact.business_email}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedContact(contact); setShowEmailComposer(true); }}
                      className="p-2 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      data-testid={`email-contact-${idx}`}
                    >
                      <Mail className="h-4 w-4 text-[#4A3728]" />
                    </button>
                  </div>
                ))
              )}
              {contacts.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#4A3728] hover:bg-[#F5EBE0] rounded-lg">
                  View all {contacts.length} contacts
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Agreement + Tabbed Content */}
        <div className="col-span-2 space-y-6">
          {/* Agreement & Financial Terms */}
          <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C8C74] flex items-center gap-2">
                <FileText className="h-4 w-4" /> Agreement & Financial Terms
              </h3>
              <div className="flex items-center gap-2">
                {brand.inventory_model && (brand.agreement_status !== 'sent' && brand.agreement_status !== 'signed') && (
                  <Button 
                    size="sm" 
                    onClick={handleSendAgreement}
                    className="h-8 rounded-lg bg-[#4A3728] hover:bg-[#3A2A1E] text-white text-xs"
                    data-testid="send-agreement-btn"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Send Agreement
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAgreementModal(true)}
                  className="h-8 rounded-lg border-[#D4BBA6] text-[#4A3728] hover:bg-[#F5EBE0] text-xs"
                  data-testid="edit-agreement-btn"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            </div>
            
            {!brand.inventory_model ? (
              <div className="text-center py-10 bg-[#F5EBE0] rounded-lg">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText className="h-7 w-7 text-[#9C8C74]" />
                </div>
                <p className="text-sm text-[#9C8C74] mb-4">No agreement configured yet</p>
                <Button 
                  onClick={() => setShowAgreementModal(true)} 
                  className="rounded-lg bg-[#4A3728] hover:bg-[#3A2A1E]"
                  data-testid="add-agreement-btn"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Agreement Details
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div className="p-4 bg-[#F5EBE0] rounded-lg">
                    <span className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Inventory Model</span>
                    <p className="text-lg font-semibold text-[#4A3728] mt-1">
                      {brand.inventory_model === 'sor' ? 'Sale or Return (SOR)' : 'Outright Purchase'}
                    </p>
                  </div>
                  {brand.inventory_model === 'sor' ? (
                    <>
                      {brand.commission_rate && (
                        <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                          <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Commission</span>
                          <span className="text-lg font-semibold text-[#4A3728]">{brand.commission_rate}%</span>
                        </div>
                      )}
                      {brand.payout_terms && (
                        <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                          <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Payout Terms</span>
                          <span className="text-sm font-medium text-[#4A3728]">{brand.payout_terms}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {brand.margin && (
                        <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                          <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Margin</span>
                          <span className="text-lg font-semibold text-[#4A3728]">{brand.margin}%</span>
                        </div>
                      )}
                      {brand.payment_terms && (
                        <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                          <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Payment Terms</span>
                          <span className="text-sm font-medium text-[#4A3728]">{brand.payment_terms}</span>
                        </div>
                      )}
                      {brand.credit_limit && (
                        <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                          <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Credit Limit</span>
                          <span className="text-lg font-semibold text-[#4A3728]">₹{brand.credit_limit.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-5">
                  {brand.contract_start_date && (
                    <div className="p-4 bg-[#F5EBE0] rounded-lg">
                      <span className="text-xs text-[#9C8C74] uppercase tracking-wider font-medium">Contract Period</span>
                      <p className="text-sm font-medium text-[#4A3728] mt-1">
                        {new Date(brand.contract_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {brand.contract_end_date && (
                          <> → {new Date(brand.contract_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                  )}
                  {brand.stock_correction && (
                    <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                      <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Stock Correction</span>
                      <span className="text-sm text-[#4A3728]">{brand.stock_correction}</span>
                    </div>
                  )}
                  {brand.agreement_status && (
                    <div className="flex items-center justify-between p-3 border border-[#E8D5C4] rounded-lg">
                      <span className="text-xs text-[#9C8C74] uppercase tracking-wider">Agreement Status</span>
                      <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${
                        brand.agreement_status === 'signed' ? 'bg-green-100 text-green-800' :
                        brand.agreement_status === 'sent' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {brand.agreement_status.charAt(0).toUpperCase() + brand.agreement_status.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabbed Content: Activity, Emails, Notes */}
          <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm overflow-hidden">
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <div className="border-b border-[#E8D5C4] px-5 bg-[#F5EBE0]/50">
                <TabsList className="h-12 bg-transparent gap-8">
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#4A3728] data-[state=active]:text-[#4A3728] rounded-none text-xs uppercase tracking-wider font-semibold text-[#9C8C74] px-0 pb-3 hover:text-[#4A3728]"
                  >
                    <History className="h-4 w-4 mr-1.5" /> Activity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="emails" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#4A3728] data-[state=active]:text-[#4A3728] rounded-none text-xs uppercase tracking-wider font-semibold text-[#9C8C74] px-0 pb-3 hover:text-[#4A3728]"
                  >
                    <Mail className="h-4 w-4 mr-1.5" /> Emails
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#4A3728] data-[state=active]:text-[#4A3728] rounded-none text-xs uppercase tracking-wider font-semibold text-[#9C8C74] px-0 pb-3 hover:text-[#4A3728]"
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Notes
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Activity Tab */}
              <TabsContent value="activity" className="p-5">
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-3">
                        <History className="h-6 w-6 text-[#9C8C74]" />
                      </div>
                      <p className="text-sm text-[#9C8C74]">No activity recorded yet</p>
                    </div>
                  ) : (
                    activityLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 pb-4 border-b border-[#E8D5C4] last:border-0">
                        <div className="w-9 h-9 bg-[#F5EBE0] rounded-full flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4 text-[#4A3728]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#4A3728]">{log.action || log.event_type}</p>
                          <p className="text-xs text-[#9C8C74] mt-1">
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
              <TabsContent value="emails" className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button 
                      variant={mailboxTab === 'sent' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setMailboxTab('sent')}
                      className={`rounded-lg text-xs ${mailboxTab === 'sent' ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6] text-[#4A3728]'}`}
                    >
                      Sent
                    </Button>
                    <Button 
                      variant={mailboxTab === 'inbox' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => { setMailboxTab('inbox'); if (inboxEmails.length === 0) fetchInboxEmails(); }}
                      className={`rounded-lg text-xs ${mailboxTab === 'inbox' ? 'bg-[#4A3728] text-white' : 'border-[#D4BBA6] text-[#4A3728]'}`}
                    >
                      Inbox
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowEmailComposer(true)}
                    className="rounded-lg bg-[#4A3728] hover:bg-[#3A2A1E] text-xs"
                    data-testid="compose-email-btn"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" /> Compose
                  </Button>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {mailboxTab === 'sent' ? (
                    activityLogs.filter(l => l.event_type === 'email_sent').length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-3">
                          <Send className="h-6 w-6 text-[#9C8C74]" />
                        </div>
                        <p className="text-sm text-[#9C8C74]">No emails sent yet</p>
                      </div>
                    ) : (
                      activityLogs.filter(l => l.event_type === 'email_sent').map((email, idx) => (
                        <div key={idx} className="p-4 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EBE0] transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#4A3728]">{email.subject || 'No subject'}</span>
                            <span className="text-xs text-[#9C8C74]">
                              {new Date(email.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#9C8C74]">To: {email.recipient_email}</p>
                        </div>
                      ))
                    )
                  ) : (
                    loadingInbox ? (
                      <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#9C8C74]" /></div>
                    ) : inboxEmails.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-3">
                          <Mail className="h-6 w-6 text-[#9C8C74]" />
                        </div>
                        <p className="text-sm text-[#9C8C74]">No emails received</p>
                      </div>
                    ) : (
                      inboxEmails.map((email, idx) => (
                        <div key={idx} className="p-4 border border-[#E8D5C4] rounded-lg hover:bg-[#F5EBE0] transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#4A3728]">{email.subject}</span>
                            <span className="text-xs text-[#9C8C74]">
                              {new Date(email.received_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#9C8C74]">From: {email.from_email}</p>
                        </div>
                      ))
                    )
                  )}
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#9C8C74] font-medium">{notes.length} notes</span>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNoteModal(true)}
                    className="rounded-lg bg-[#4A3728] hover:bg-[#3A2A1E] text-xs"
                    data-testid="add-note-btn"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Note
                  </Button>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="h-6 w-6 text-[#9C8C74]" />
                      </div>
                      <p className="text-sm text-[#9C8C74]">No notes yet</p>
                    </div>
                  ) : (
                    notes.map((note, idx) => (
                      <div key={idx} className="p-4 border border-[#E8D5C4] rounded-lg bg-[#F5EBE0]/30">
                        <p className="text-sm text-[#4A3728] whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-[#9C8C74] mt-3 pt-2 border-t border-[#E8D5C4]">
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
          <div className="bg-white border border-[#E8D5C4] rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C8C74] flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Tasks ({brandTasks.length})
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCreateTask(true)}
                className="h-8 px-2.5 text-[#4A3728] hover:bg-[#F5EBE0] rounded-lg"
                data-testid="add-task-btn"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {loadingTasks ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#9C8C74]" /></div>
              ) : brandTasks.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-[#F5EBE0] flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="h-7 w-7 text-[#9C8C74]" />
                  </div>
                  <p className="text-sm text-[#9C8C74] mb-4">No tasks yet</p>
                  <Button 
                    onClick={() => setShowCreateTask(true)} 
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-[#D4BBA6] text-[#4A3728] text-xs"
                  >
                    Create First Task
                  </Button>
                </div>
              ) : (
                brandTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-4 border rounded-lg transition-all ${
                      task.status === 'completed' 
                        ? 'bg-[#F5EBE0]/50 border-[#E8D5C4]' 
                        : 'border-[#E8D5C4] hover:border-[#4A3728] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className="mt-0.5 flex-shrink-0"
                        data-testid={`toggle-task-${task.id}`}
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-[#9C8C74] hover:text-[#4A3728] transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-[#9C8C74]' : 'text-[#4A3728]'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              new Date(task.due_date) < new Date() && task.status !== 'completed'
                                ? 'bg-red-100 text-red-700' : 'bg-[#F5EBE0] text-[#9C8C74]'
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Brand</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Brand Name *</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter brand name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Website</Label>
                <Input
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Division & Segment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Division *</Label>
                <Select 
                  value={editForm.division || ''} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, division: v, categories: [] }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Segment</Label>
                <Select 
                  value={editForm.segment || ''} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, segment: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select segment" /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Categories (Select Multiple)</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {(CATEGORIES_BY_DIVISION[editForm.division] || []).map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-cat-${cat}`}
                      checked={(editForm.categories || []).includes(cat)}
                      onCheckedChange={() => {
                        const cats = editForm.categories || [];
                        setEditForm(prev => ({
                          ...prev,
                          categories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat]
                        }));
                      }}
                    />
                    <label htmlFor={`edit-cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Gender (Select Multiple)</Label>
              <div className="flex gap-4">
                {GENDERS.map(g => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-gender-${g}`}
                      checked={(editForm.genders || editForm.gender || []).includes(g)}
                      onCheckedChange={() => {
                        const genders = editForm.genders || editForm.gender || [];
                        setEditForm(prev => ({
                          ...prev,
                          genders: genders.includes(g) ? genders.filter(x => x !== g) : [...genders, g]
                        }));
                      }}
                    />
                    <label htmlFor={`edit-gender-${g}`} className="text-sm cursor-pointer">{g}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Min Price (₹)</Label>
                <Input
                  type="number"
                  value={editForm.min_price || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, min_price: e.target.value }))}
                  placeholder="5000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Max Price (₹)</Label>
                <Input
                  type="number"
                  value={editForm.max_price || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, max_price: e.target.value }))}
                  placeholder="60000"
                  className="mt-1"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">City *</Label>
              <Select 
                value={editForm.city || ''} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, city: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Brand Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@brand.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={editForm.phone_number || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Full Address</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter complete address..."
                  className="pl-10 min-h-[80px]"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Instagram</Label>
                <div className="relative mt-1">
                  <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={editForm.instagram || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@brandname"
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">LinkedIn</Label>
                <div className="relative mt-1">
                  <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={editForm.linkedin || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, linkedin: e.target.value }))}
                    placeholder="linkedin.com/company/brand"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Brand Description</Label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the brand..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            {/* Pipeline Stage */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Pipeline Stage</Label>
              <Select 
                value={editForm.pipeline_stage || ''} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, pipeline_stage: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-[#002FA7] hover:bg-[#001f7a]">
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
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
