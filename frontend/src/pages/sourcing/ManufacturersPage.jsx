import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Factory, Plus, Search, MoreVertical, Edit2, Trash2, Eye, Mail, Phone, Globe, MapPin, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';

const MANUFACTURER_TYPES = ['CMT (Cut, Make, Trim)', 'Full Package / FOB', 'Embroidery Unit', 'Print House', 'Accessory Manufacturer', 'Other'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Factory Visit', 'Sampling', 'Production Trial', 'Active', 'Inactive'];
const CERTIFICATIONS = ['OEKO-TEX', 'GOTS', 'ISO 9001', 'ISO 14001', 'BCI', 'WRAP', 'SA8000', 'Fair Trade'];
const COUNTRIES = ['India', 'China', 'Bangladesh', 'Vietnam', 'Thailand', 'Indonesia', 'Pakistan', 'Turkey'];
const CITIES = {
  'India': ['Delhi', 'Mumbai', 'Noida', 'Gurgaon', 'Bengaluru', 'Jaipur', 'Chennai', 'Kolkata', 'Tirupur', 'Ludhiana'],
  'China': ['Guangzhou', 'Shanghai', 'Shenzhen', 'Dongguan', 'Hangzhou'],
  'Bangladesh': ['Dhaka', 'Chittagong', 'Gazipur'],
  'Vietnam': ['Ho Chi Minh City', 'Hanoi'],
  'Thailand': ['Bangkok'],
  'Indonesia': ['Jakarta', 'Bandung'],
  'Pakistan': ['Karachi', 'Lahore', 'Sialkot'],
  'Turkey': ['Istanbul', 'Bursa', 'Izmir']
};
const CURRENCIES = ['USD', 'INR', 'CNY', 'BDT', 'EUR'];

const ManufacturersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ manufacturer_type: '', pipeline_stage: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntegrationCheck, setShowIntegrationCheck] = useState(false);
  const [createdEntity, setCreatedEntity] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    manufacturer_type: 'CMT (Cut, Make, Trim)',
    country: 'India',
    city: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    whatsapp: '',
    certifications: [],
    moq: '',
    lead_time_days: '15',
    price_min: '',
    price_max: '',
    payment_terms: '',
    currency: 'USD',
    description: '',
    internal_notes: ''
  });

  useEffect(() => { fetchManufacturers(); }, [filters]);

  const fetchManufacturers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(filters.manufacturer_type && { manufacturer_type: filters.manufacturer_type }),
        ...(filters.pipeline_stage && { pipeline_stage: filters.pipeline_stage })
      });
      const response = await api.get(`/sourcing/manufacturers?${params}`);
      setManufacturers(response.data);
    } catch (error) {
      toast.error('Failed to fetch manufacturers');
    } finally {
      setLoading(false);
    }
  };

  const toggleCertification = (cert) => {
    setNewItem(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const handleAdd = async () => {
    if (!newItem.name || !newItem.country) {
      toast.error('Name and country are required');
      return;
    }
    try {
      const response = await api.post('/sourcing/manufacturers', {
        ...newItem,
        moq: parseInt(newItem.moq) || 0,
        moq_unit: 'pieces',
        lead_time_days: parseInt(newItem.lead_time_days) || 0,
        price_min: parseFloat(newItem.price_min) || 0,
        price_max: parseFloat(newItem.price_max) || 0
      });
      const createdManufacturer = response.data;
      toast.success('Manufacturer added');
      setShowAddModal(false);
      
      // Show integration check dialog
      setCreatedEntity({
        id: createdManufacturer.id,
        name: newItem.name
      });
      setShowIntegrationCheck(true);
      
      setNewItem({
        name: '', manufacturer_type: 'CMT (Cut, Make, Trim)', country: 'India', city: '', address: '',
        website: '', email: '', phone: '', whatsapp: '', certifications: [],
        moq: '', lead_time_days: '15', price_min: '', price_max: '', payment_terms: '', currency: 'USD', description: '', internal_notes: ''
      });
      fetchManufacturers();
    } catch (error) {
      toast.error('Failed to add manufacturer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this manufacturer?')) return;
    try {
      await api.delete(`/sourcing/manufacturers/${id}`);
      toast.success('Manufacturer deleted');
      fetchManufacturers();
    } catch (error) {
      toast.error('Failed to delete manufacturer');
    }
  };

  const getStageColor = (stage) => ({
    'Discovery': 'bg-gray-100 text-gray-700',
    'Contacted': 'bg-amber-100 text-amber-700',
    'Factory Visit': 'bg-blue-100 text-blue-700',
    'Sampling': 'bg-purple-100 text-purple-700',
    'Production Trial': 'bg-orange-100 text-orange-700',
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-red-100 text-red-700'
  }[stage] || 'bg-gray-100 text-gray-700');

  const availableCities = CITIES[newItem.country] || [];

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="manufacturers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728]">Manufacturer Database</h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E]">
          <Plus className="h-4 w-4 mr-2" /> Add Manufacturer
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border-[#E8D5C4] bg-white/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchManufacturers()} placeholder="Search manufacturers..." className="pl-10 border-[#E8D5C4] focus:border-[#D4BBA6] focus:ring-[#D4BBA6]" />
            </div>
            <Select value={filters.manufacturer_type || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, manufacturer_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MANUFACTURER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.pipeline_stage || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, pipeline_stage: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                </TableCell></TableRow>
              ) : manufacturers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No manufacturers found.</TableCell></TableRow>
              ) : manufacturers.map((m) => (
                <TableRow key={m.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {m.email && <Mail className="h-3 w-3" />}
                      {m.phone && <Phone className="h-3 w-3" />}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{m.manufacturer_type}</Badge></TableCell>
                  <TableCell>{m.city}{m.city && m.country ? ', ' : ''}{m.country}</TableCell>
                  <TableCell><Badge className={getStageColor(m.pipeline_stage)}>{m.pipeline_stage}</Badge></TableCell>
                  <TableCell>{m.moq ? `${m.moq} ${m.moq_unit || 'pcs'}` : '-'}</TableCell>
                  <TableCell>{m.lead_time_days ? `${m.lead_time_days} days` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/sourcing/manufacturers/${m.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(m.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Manufacturer Modal - Enhanced */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Manufacturer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Basic Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Manufacturer Name *</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., ABC Manufacturing" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Manufacturer Type *</Label>
                  <Select value={newItem.manufacturer_type} onValueChange={(v) => setNewItem(prev => ({ ...prev, manufacturer_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{MANUFACTURER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Location</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Country *</Label>
                  <Select value={newItem.country} onValueChange={(v) => setNewItem(prev => ({ ...prev, country: v, city: '' }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">City</Label>
                  <Select value={newItem.city} onValueChange={(v) => setNewItem(prev => ({ ...prev, city: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {availableCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Address</Label>
                  <Input value={newItem.address} onChange={(e) => setNewItem(prev => ({ ...prev, address: e.target.value }))} placeholder="Full address" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Contact Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Website</Label>
                  <Input value={newItem.website} onChange={(e) => setNewItem(prev => ({ ...prev, website: e.target.value }))} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={newItem.email} onChange={(e) => setNewItem(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@example.com" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-sm">Phone</Label>
                  <Input value={newItem.phone} onChange={(e) => setNewItem(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone number" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">WhatsApp</Label>
                  <Input value={newItem.whatsapp} onChange={(e) => setNewItem(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="WhatsApp number" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Business Details</p>
              <div>
                <Label className="text-sm mb-2 block">Certifications</Label>
                <div className="flex flex-wrap gap-3">
                  {CERTIFICATIONS.map(cert => (
                    <div key={cert} className="flex items-center gap-2">
                      <Checkbox
                        id={`cert-${cert}`}
                        checked={newItem.certifications.includes(cert)}
                        onCheckedChange={() => toggleCertification(cert)}
                      />
                      <label htmlFor={`cert-${cert}`} className="text-sm cursor-pointer">{cert}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">MOQ</Label>
                <Input type="number" value={newItem.moq} onChange={(e) => setNewItem(prev => ({ ...prev, moq: e.target.value }))} placeholder="Minimum order" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Lead Time (days)</Label>
                <Input type="number" value={newItem.lead_time_days} onChange={(e) => setNewItem(prev => ({ ...prev, lead_time_days: e.target.value }))} placeholder="15" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Min Price</Label>
                <Input type="number" step="0.01" value={newItem.price_min} onChange={(e) => setNewItem(prev => ({ ...prev, price_min: e.target.value }))} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Max Price</Label>
                <Input type="number" step="0.01" value={newItem.price_max} onChange={(e) => setNewItem(prev => ({ ...prev, price_max: e.target.value }))} placeholder="100" className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Payment Terms</Label>
                <Input value={newItem.payment_terms} onChange={(e) => setNewItem(prev => ({ ...prev, payment_terms: e.target.value }))} placeholder="e.g., 50% advance, 50% on delivery" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Currency</Label>
                <Select value={newItem.currency} onValueChange={(v) => setNewItem(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Additional Info</p>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={newItem.description} onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description of the manufacturer..." className="mt-1 min-h-[80px]" />
              </div>
              <div className="mt-4">
                <Label className="text-sm">Internal Notes</Label>
                <Textarea value={newItem.internal_notes} onChange={(e) => setNewItem(prev => ({ ...prev, internal_notes: e.target.value }))} placeholder="Private notes..." className="mt-1 min-h-[60px]" />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-gray-900 hover:bg-gray-800">Add Manufacturer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Check Dialog */}
      {createdEntity && (
        <EntityIntegrationCheck
          open={showIntegrationCheck}
          onOpenChange={setShowIntegrationCheck}
          api={api}
          module="sourcing"
          entityType="manufacturer"
          entityId={createdEntity.id}
          entityName={createdEntity.name}
          onComplete={() => setCreatedEntity(null)}
        />
      )}
    </div>
  );
};

export default ManufacturersPage;
