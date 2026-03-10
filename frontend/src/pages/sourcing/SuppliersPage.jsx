import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Package, Plus, Search, MoreVertical, Edit2, Trash2, Eye, Mail, Phone, Globe, MapPin, MessageCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';

const SUPPLIER_TYPES = ['Fabric Distributor', 'Mill / Manufacturer', 'Print & Dye House', 'Trim Supplier', 'Packaging', 'Other'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Sampling', 'Evaluation', 'Negotiation', 'Active', 'Inactive'];
const FABRIC_CATEGORIES = [
  'Cotton', 'Silk', 'Linen', 'Wool', 'Polyester', 'Nylon', 'Rayon', 'Viscose',
  'Cotton Blend', 'Poly-Cotton', 'Silk Blend', 'Brocade', 'Jacquard', 'Embroidered', 'Printed', 'Dyed'
];
const COUNTRIES = ['India', 'China', 'Bangladesh', 'Vietnam', 'Thailand', 'Indonesia', 'Pakistan', 'Turkey'];
const CITIES = {
  'India': ['Delhi', 'Mumbai', 'Surat', 'Ahmedabad', 'Bengaluru', 'Jaipur', 'Chennai', 'Kolkata', 'Ludhiana', 'Tirupur', 'Coimbatore'],
  'China': ['Guangzhou', 'Shanghai', 'Hangzhou', 'Shaoxing', 'Suzhou'],
  'Bangladesh': ['Dhaka', 'Chittagong'],
  'Vietnam': ['Ho Chi Minh City', 'Hanoi'],
  'Thailand': ['Bangkok'],
  'Indonesia': ['Jakarta', 'Bandung'],
  'Pakistan': ['Karachi', 'Lahore', 'Faisalabad'],
  'Turkey': ['Istanbul', 'Bursa']
};
const CURRENCIES = ['USD', 'INR', 'CNY', 'BDT', 'EUR'];

const SuppliersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ supplier_type: '', pipeline_stage: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntegrationCheck, setShowIntegrationCheck] = useState(false);
  const [createdEntity, setCreatedEntity] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    supplier_type: 'Fabric Distributor',
    country: 'India',
    city: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    whatsapp: '',
    fabric_categories: [],
    moq_meters: '',
    lead_time_days: '30',
    payment_terms: '',
    price_min: '',
    price_max: '',
    currency: 'USD',
    description: ''
  });

  useEffect(() => { fetchSuppliers(); }, [filters]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(filters.supplier_type && { supplier_type: filters.supplier_type }),
        ...(filters.pipeline_stage && { pipeline_stage: filters.pipeline_stage })
      });
      const response = await api.get(`/sourcing/suppliers?${params}`);
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const toggleFabricCategory = (cat) => {
    setNewSupplier(prev => ({
      ...prev,
      fabric_categories: prev.fabric_categories.includes(cat)
        ? prev.fabric_categories.filter(c => c !== cat)
        : [...prev.fabric_categories, cat]
    }));
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.country) {
      toast.error('Name and country are required');
      return;
    }
    try {
      const response = await api.post('/sourcing/suppliers', {
        ...newSupplier,
        moq_meters: parseInt(newSupplier.moq_meters) || 0,
        lead_time_days: parseInt(newSupplier.lead_time_days) || 0,
        price_min: parseFloat(newSupplier.price_min) || 0,
        price_max: parseFloat(newSupplier.price_max) || 0
      });
      const createdSupplier = response.data;
      toast.success('Supplier added successfully');
      setShowAddModal(false);
      
      // Show integration check dialog
      setCreatedEntity({
        id: createdSupplier.id,
        name: newSupplier.name
      });
      setShowIntegrationCheck(true);
      
      setNewSupplier({
        name: '', supplier_type: 'Fabric Distributor', country: 'India', city: '', address: '',
        website: '', email: '', phone: '', whatsapp: '', fabric_categories: [],
        moq_meters: '', lead_time_days: '30', payment_terms: '', price_min: '', price_max: '', currency: 'USD', description: ''
      });
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to add supplier');
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/sourcing/suppliers/${id}`);
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const getStageColor = (stage) => ({
    'Discovery': 'bg-gray-100 text-gray-700',
    'Contacted': 'bg-amber-100 text-amber-700',
    'Sampling': 'bg-blue-100 text-blue-700',
    'Evaluation': 'bg-purple-100 text-purple-700',
    'Negotiation': 'bg-orange-100 text-orange-700',
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-red-100 text-red-700'
  }[stage] || 'bg-gray-100 text-gray-700');

  const availableCities = CITIES[newSupplier.country] || [];

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="suppliers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728]">Supplier Database</h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E]">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border-[#E8D5C4] bg-white/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()} placeholder="Search suppliers..." className="pl-10 border-[#E8D5C4] focus:border-[#D4BBA6] focus:ring-[#D4BBA6]" />
            </div>
            <Select value={filters.supplier_type || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, supplier_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No suppliers found.</TableCell></TableRow>
              ) : suppliers.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.email && <Mail className="h-3 w-3" />}
                      {s.phone && <Phone className="h-3 w-3" />}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.supplier_type}</Badge></TableCell>
                  <TableCell>{s.city}{s.city && s.country ? ', ' : ''}{s.country}</TableCell>
                  <TableCell><Badge className={getStageColor(s.pipeline_stage)}>{s.pipeline_stage}</Badge></TableCell>
                  <TableCell>{s.moq_meters ? `${s.moq_meters}m` : '-'}</TableCell>
                  <TableCell>{s.lead_time_days ? `${s.lead_time_days} days` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/sourcing/suppliers/${s.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteSupplier(s.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Supplier Modal - Enhanced */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Supplier</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Basic Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Supplier Name *</Label>
                  <Input value={newSupplier.name} onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Surat Silk Mills" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Supplier Type *</Label>
                  <Select value={newSupplier.supplier_type} onValueChange={(v) => setNewSupplier(prev => ({ ...prev, supplier_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
                  <Select value={newSupplier.country} onValueChange={(v) => setNewSupplier(prev => ({ ...prev, country: v, city: '' }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">City</Label>
                  <Select value={newSupplier.city} onValueChange={(v) => setNewSupplier(prev => ({ ...prev, city: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {availableCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Address</Label>
                  <Input value={newSupplier.address} onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))} placeholder="Full address" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Contact Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Website</Label>
                  <Input value={newSupplier.website} onChange={(e) => setNewSupplier(prev => ({ ...prev, website: e.target.value }))} placeholder="https://" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@supplier.com" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-sm">Phone (+91)</Label>
                  <Input value={newSupplier.phone} onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))} placeholder="+91" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">WhatsApp (+91)</Label>
                  <Input value={newSupplier.whatsapp} onChange={(e) => setNewSupplier(prev => ({ ...prev, whatsapp: e.target.value }))} placeholder="+91" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Fabric Categories */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Fabric Categories</p>
              <div className="flex flex-wrap gap-2">
                {FABRIC_CATEGORIES.map(cat => (
                  <Badge
                    key={cat}
                    variant={newSupplier.fabric_categories.includes(cat) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleFabricCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Business Details */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Business Details</p>
              <p className="text-xs text-gray-400 mb-3">For Fabric Distributor: Pricing per meter, MOQ in meters</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">MOQ (meters)</Label>
                  <Input type="number" value={newSupplier.moq_meters} onChange={(e) => setNewSupplier(prev => ({ ...prev, moq_meters: e.target.value }))} placeholder="e.g., 500" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Lead Time (days)</Label>
                  <Input type="number" value={newSupplier.lead_time_days} onChange={(e) => setNewSupplier(prev => ({ ...prev, lead_time_days: e.target.value }))} placeholder="e.g., 30" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Payment Terms</Label>
                  <Input value={newSupplier.payment_terms} onChange={(e) => setNewSupplier(prev => ({ ...prev, payment_terms: e.target.value }))} placeholder="e.g., LC, TT 30%" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label className="text-sm">Price Min (USD) <span className="text-xs text-gray-400">(per meter)</span></Label>
                  <Input type="number" step="0.01" value={newSupplier.price_min} onChange={(e) => setNewSupplier(prev => ({ ...prev, price_min: e.target.value }))} placeholder="per meter" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Price Max (USD) <span className="text-xs text-gray-400">(per meter)</span></Label>
                  <Input type="number" step="0.01" value={newSupplier.price_max} onChange={(e) => setNewSupplier(prev => ({ ...prev, price_max: e.target.value }))} placeholder="per meter" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Currency</Label>
                  <Select value={newSupplier.currency} onValueChange={(v) => setNewSupplier(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm">Description / Notes</Label>
              <Textarea value={newSupplier.description} onChange={(e) => setNewSupplier(prev => ({ ...prev, description: e.target.value }))} placeholder="Additional notes about this supplier..." className="mt-1 min-h-[80px]" />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier} className="bg-gray-900 hover:bg-gray-800">Add Supplier</Button>
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
          entityType="supplier"
          entityId={createdEntity.id}
          entityName={createdEntity.name}
          onComplete={() => setCreatedEntity(null)}
        />
      )}
    </div>
  );
};

export default SuppliersPage;
