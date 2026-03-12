import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Loader2, ArrowLeft, Phone, Mail, Star,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Eye, Edit, Trash2
} from 'lucide-react';

const CATEGORIES = ['Technology', 'Marketing', 'Operations', 'HR Services', 'Finance', 'Legal', 'Logistics', 'Manufacturing', 'Consulting', 'Other'];
const VENDOR_TYPES = ['vendor', 'freelancer', 'influencer'];

const VendorDatabase = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '', vendor_type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [formData, setFormData] = useState({
    name: '', category: '', vendor_type: 'vendor', contact_person: '',
    phone: '', email: '', address: '', gst_tax_id: '', services: '', notes: ''
  });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendors');
      setVendors(res.data.vendors || []);
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    try {
      if (!formData.name || !formData.category) {
        toast.error('Name and category are required');
        return;
      }
      const payload = { ...formData, services: formData.services ? formData.services.split(',').map(s => s.trim()) : [] };
      await api.post('/vendors', payload);
      toast.success('Vendor created');
      setShowCreateDialog(false);
      resetForm();
      fetchVendors();
    } catch (error) {
      toast.error('Failed to create vendor');
    }
  };

  const handleUpdateVendor = async () => {
    try {
      const payload = { ...formData, services: formData.services ? formData.services.split(',').map(s => s.trim()) : [] };
      await api.put(`/vendors/${selectedVendor.id}`, payload);
      toast.success('Vendor updated');
      setShowEditDialog(false);
      fetchVendors();
    } catch (error) {
      toast.error('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (vendor) => {
    if (!confirm(`Delete vendor "${vendor.name}"?`)) return;
    try {
      await api.delete(`/vendors/${vendor.id}`);
      toast.success('Vendor deleted');
      fetchVendors();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const openEditDialog = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name || '', category: vendor.category || '', vendor_type: vendor.vendor_type || 'vendor',
      contact_person: vendor.contact_person || '', phone: vendor.phone || '', email: vendor.email || '',
      address: vendor.address || '', gst_tax_id: vendor.gst_tax_id || '',
      services: vendor.services?.join(', ') || '', notes: vendor.notes || ''
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', category: '', vendor_type: 'vendor', contact_person: '', phone: '', email: '', address: '', gst_tax_id: '', services: '', notes: '' });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedVendors = useMemo(() => {
    let result = [...vendors];
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.name?.toLowerCase().includes(q) || 
        v.vendor_id?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
      );
    }
    
    // Apply filters
    if (filters.status) result = result.filter(v => v.status === filters.status);
    if (filters.category) result = result.filter(v => v.category === filters.category);
    if (filters.vendor_type) result = result.filter(v => v.vendor_type === filters.vendor_type);
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [vendors, searchQuery, filters, sortConfig]);

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-gray-100 text-gray-600',
      under_review: 'bg-amber-100 text-amber-700',
      blacklisted: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getTypeBadge = (type) => {
    const styles = {
      vendor: 'bg-blue-100 text-blue-700',
      freelancer: 'bg-purple-100 text-purple-700',
      influencer: 'bg-pink-100 text-pink-700'
    };
    return <Badge className={styles[type] || 'bg-gray-100'}>{type}</Badge>;
  };

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (
          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-400" />
        )}
      </div>
    </TableHead>
  );

  const clearFilters = () => {
    setFilters({ status: '', category: '', vendor_type: '' });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.status || filters.category || filters.vendor_type || searchQuery;

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="vendor-database">
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Vendor Database</h1>
          <p className="text-[#8B7355]">{filteredAndSortedVendors.length} of {vendors.length} vendors</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-[#D4BBA6]"
              />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category || "all"} onValueChange={(v) => setFilters(f => ({...f, category: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.vendor_type || "all"} onValueChange={(v) => setFilters(f => ({...f, vendor_type: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[140px] bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {VENDOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#8B7355]">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
            </div>
          ) : filteredAndSortedVendors.length === 0 ? (
            <div className="text-center py-12 text-[#8B7355]">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
              <p>No vendors found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <SortHeader column="vendor_id" label="ID" />
                  <SortHeader column="name" label="Name" />
                  <SortHeader column="vendor_type" label="Type" />
                  <SortHeader column="category" label="Category" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="total_work_orders" label="Orders" />
                  <SortHeader column="rating" label="Rating" />
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedVendors.map((vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => navigate(`/vendors/details/${vendor.id}`)}>
                    <TableCell className="font-mono text-xs text-[#8B7355]">{vendor.vendor_id}</TableCell>
                    <TableCell className="font-medium text-[#4A3728]">{vendor.name}</TableCell>
                    <TableCell>{getTypeBadge(vendor.vendor_type)}</TableCell>
                    <TableCell className="text-[#8B7355]">{vendor.category}</TableCell>
                    <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    <TableCell className="text-center">{vendor.total_work_orders || 0}</TableCell>
                    <TableCell>
                      {vendor.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{vendor.rating.toFixed(1)}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-[#8B7355]">
                        {vendor.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</div>}
                        {vendor.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/vendors/details/${vendor.id}`)}>
                          <Eye className="w-4 h-4 text-[#8B7355]" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(vendor)}>
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteVendor(vendor)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Category *</label>
                <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Type</label>
                <Select value={formData.vendor_type} onValueChange={(v) => setFormData(f => ({...f, vendor_type: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Contact Person</label>
              <Input value={formData.contact_person} onChange={(e) => setFormData(f => ({...f, contact_person: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Phone</label>
                <Input value={formData.phone} onChange={(e) => setFormData(f => ({...f, phone: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(f => ({...f, email: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Address</label>
              <Textarea value={formData.address} onChange={(e) => setFormData(f => ({...f, address: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">GST/Tax ID</label>
              <Input value={formData.gst_tax_id} onChange={(e) => setFormData(f => ({...f, gst_tax_id: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Services (comma separated)</label>
              <Input value={formData.services} onChange={(e) => setFormData(f => ({...f, services: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="Web Design, SEO, Marketing" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(f => ({...f, notes: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreateVendor} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Create Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Category *</label>
                <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Type</label>
                <Select value={formData.vendor_type} onValueChange={(v) => setFormData(f => ({...f, vendor_type: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Contact Person</label>
              <Input value={formData.contact_person} onChange={(e) => setFormData(f => ({...f, contact_person: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Phone</label>
                <Input value={formData.phone} onChange={(e) => setFormData(f => ({...f, phone: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(f => ({...f, email: e.target.value}))} className="bg-white border-[#D4BBA6]" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Address</label>
              <Textarea value={formData.address} onChange={(e) => setFormData(f => ({...f, address: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">GST/Tax ID</label>
              <Input value={formData.gst_tax_id} onChange={(e) => setFormData(f => ({...f, gst_tax_id: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Services (comma separated)</label>
              <Input value={formData.services} onChange={(e) => setFormData(f => ({...f, services: e.target.value}))} className="bg-white border-[#D4BBA6]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#4A3728]">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(f => ({...f, notes: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleUpdateVendor} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDatabase;
