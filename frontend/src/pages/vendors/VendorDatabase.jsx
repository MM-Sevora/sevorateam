import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Filter, Phone, Mail, MapPin,
  Edit2, Trash2, Eye, Star, FileText, CheckCircle, XCircle,
  AlertTriangle, Loader2, Settings
} from 'lucide-react';

const VendorDatabase = () => {
  const { api } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    services: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_tax_id: '',
    notes: ''
  });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorsRes, categoriesRes] = await Promise.all([
        api.get('/vendors', { params: { 
          category: filters.category || undefined,
          status: filters.status || undefined,
          search: filters.search || undefined
        }}),
        api.get('/vendors/categories')
      ]);
      setVendors(vendorsRes.data.vendors || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
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
      await api.post('/vendors', {
        ...formData,
        services: formData.services ? formData.services.split(',').map(s => s.trim()) : []
      });
      toast.success('Vendor created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create vendor');
    }
  };

  const handleUpdateVendor = async () => {
    try {
      await api.put(`/vendors/${selectedVendor.id}`, {
        ...formData,
        services: formData.services ? formData.services.split(',').map(s => s.trim()) : []
      });
      toast.success('Vendor updated');
      setShowCreateDialog(false);
      setSelectedVendor(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await api.delete(`/vendors/${vendorId}`);
      toast.success('Vendor deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api.post('/vendors/categories', { name: newCategory.trim() });
      toast.success('Category added');
      setNewCategory('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add category');
    }
  };

  const openEditDialog = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      services: vendor.services?.join(', ') || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gst_tax_id: vendor.gst_tax_id || '',
      notes: vendor.notes || ''
    });
    setShowCreateDialog(true);
  };

  const openViewDialog = async (vendor) => {
    try {
      const res = await api.get(`/vendors/${vendor.id}`);
      setSelectedVendor(res.data);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Failed to load vendor details');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      services: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_tax_id: '',
      notes: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-gray-100 text-gray-700',
      under_review: 'bg-amber-100 text-amber-700',
      blacklisted: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="vendor-database">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Vendor Database</h1>
          <p className="text-[#8B7355]">Manage your vendor profiles and information</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryDialog(true)} className="border-[#D4BBA6]">
            <Settings className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button onClick={() => { resetForm(); setSelectedVendor(null); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Vendor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7355]" />
                <Input
                  placeholder="Search vendors..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({...f, search: e.target.value}))}
                  className="pl-10 bg-white border-[#D4BBA6]"
                />
              </div>
            </div>
            <Select value={filters.category || "all"} onValueChange={(v) => setFilters(f => ({...f, category: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-40 bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-36 bg-white border-[#D4BBA6]">
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
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : vendors.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No vendors found. Add your first vendor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-[#8B7355]">{vendor.vendor_id}</p>
                    <h3 className="font-semibold text-[#4A3728]">{vendor.name}</h3>
                  </div>
                  {getStatusBadge(vendor.status)}
                </div>
                
                <Badge variant="outline" className="mb-3 border-[#D4BBA6] text-[#8B7355]">
                  {vendor.category}
                </Badge>
                
                {vendor.services?.length > 0 && (
                  <p className="text-xs text-[#8B7355] mb-3 line-clamp-1">
                    {vendor.services.join(', ')}
                  </p>
                )}
                
                <div className="space-y-1 text-sm text-[#8B7355] mb-4">
                  {vendor.contact_person && (
                    <p className="flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> {vendor.contact_person}
                    </p>
                  )}
                  {vendor.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {vendor.phone}
                    </p>
                  )}
                  {vendor.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3 h-3" /> {vendor.email}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-[#E8D5C4]">
                  <div className="flex items-center gap-1">
                    {vendor.rating && (
                      <>
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                      </>
                    )}
                    <span className="text-xs text-[#8B7355] ml-2">{vendor.total_work_orders || 0} orders</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openViewDialog(vendor)}>
                      <Eye className="w-4 h-4 text-[#8B7355]" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(vendor)}>
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteVendor(vendor.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">
              {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Vendor Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({...f, name: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Enter vendor name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Category *</label>
                <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">GST/Tax ID</label>
                <Input
                  value={formData.gst_tax_id}
                  onChange={(e) => setFormData(f => ({...f, gst_tax_id: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="GST number"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Services (comma-separated)</label>
              <Input
                value={formData.services}
                onChange={(e) => setFormData(f => ({...f, services: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Printing, Packaging, Design"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Contact Person</label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData(f => ({...f, contact_person: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(f => ({...f, phone: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(f => ({...f, email: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Address</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData(f => ({...f, address: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(f => ({...f, notes: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={selectedVendor ? handleUpdateVendor : handleCreateVendor} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              {selectedVendor ? 'Update' : 'Create'} Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Vendor Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Vendor Details</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8B7355]">{selectedVendor.vendor_id}</p>
                  <h3 className="text-xl font-bold text-[#4A3728]">{selectedVendor.name}</h3>
                </div>
                {getStatusBadge(selectedVendor.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8B7355]">Category</p>
                  <p className="font-medium text-[#4A3728]">{selectedVendor.category}</p>
                </div>
                <div>
                  <p className="text-[#8B7355]">Work Orders</p>
                  <p className="font-medium text-[#4A3728]">{selectedVendor.total_work_orders || 0}</p>
                </div>
                {selectedVendor.contact_person && (
                  <div>
                    <p className="text-[#8B7355]">Contact Person</p>
                    <p className="font-medium text-[#4A3728]">{selectedVendor.contact_person}</p>
                  </div>
                )}
                {selectedVendor.phone && (
                  <div>
                    <p className="text-[#8B7355]">Phone</p>
                    <p className="font-medium text-[#4A3728]">{selectedVendor.phone}</p>
                  </div>
                )}
                {selectedVendor.email && (
                  <div className="col-span-2">
                    <p className="text-[#8B7355]">Email</p>
                    <p className="font-medium text-[#4A3728]">{selectedVendor.email}</p>
                  </div>
                )}
                {selectedVendor.gst_tax_id && (
                  <div className="col-span-2">
                    <p className="text-[#8B7355]">GST/Tax ID</p>
                    <p className="font-medium text-[#4A3728]">{selectedVendor.gst_tax_id}</p>
                  </div>
                )}
              </div>
              
              {selectedVendor.services?.length > 0 && (
                <div>
                  <p className="text-[#8B7355] text-sm mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.services.map((s, i) => (
                      <Badge key={i} variant="outline" className="border-[#D4BBA6]">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedVendor.recent_work_orders?.length > 0 && (
                <div>
                  <p className="text-[#8B7355] text-sm mb-2">Recent Work Orders</p>
                  <div className="space-y-2">
                    {selectedVendor.recent_work_orders.map((wo) => (
                      <div key={wo.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                        <span className="text-sm font-medium text-[#4A3728]">{wo.work_order_id}</span>
                        {getStatusBadge(wo.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Categories Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="bg-white border-[#D4BBA6]"
              />
              <Button onClick={handleAddCategory} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-[#F5EDE5] rounded">
                  <span className="text-sm text-[#4A3728]">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDatabase;
