import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
import { 
  Building2, Plus, Search, Filter, ExternalLink, Mail, Phone,
  MoreVertical, Edit2, Trash2, Eye, ChevronLeft, ChevronRight,
  Instagram, Linkedin, MapPin, Sparkles, Globe
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import EntityIntegrationCheck from '../../components/shared/EntityIntegrationCheck';

const DIVISIONS = ['Apparel', 'Accessories', 'Footwear', 'Home & Living', 'Beauty'];
const SEGMENTS = ['Mass', 'Mass Premium', 'Bridge to Luxury', 'Affordable Luxury', 'Premium', 'Luxury'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'];
const CATEGORIES = [
  'Indian / Ethnic Wear', 'Western', 'Indo-Western', 'Festive Wear', 'Party Wear', 'Casual Wear',
  'Formal Wear', 'Bridal Wear', 'Sarees', 'Kurta Sets', 'Dresses', 'Suits'
];
const GENDERS = ['Women', 'Men', 'Unisex'];
const CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Kolkata', 'Chennai', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Lucknow', 'Chandigarh', 'Surat', 'Indore', 'Kochi'
];

const BrandsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ segment: '', pipeline_stage: '', city: '' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntegrationCheck, setShowIntegrationCheck] = useState(false);
  const [createdEntity, setCreatedEntity] = useState(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [newBrand, setNewBrand] = useState({
    name: '',
    website: '',
    instagram: '',
    division: 'Apparel',
    segment: '',
    categories: [],
    genders: [],
    min_price: '',
    max_price: '',
    city: '',
    email: '',
    phone_number: '',
    address: '',
    linkedin: '',
    description: ''
  });

  useEffect(() => {
    fetchBrands();
  }, [pagination.page, filters]);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        page_size: pagination.pageSize,
        ...(search && { search }),
        ...(filters.segment && { segment: filters.segment }),
        ...(filters.pipeline_stage && { pipeline_stage: filters.pipeline_stage }),
        ...(filters.city && { city: filters.city })
      });
      const response = await api.get(`/sourcing/brands/paginated?${params}`);
      setBrands(response.data.brands);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages
      }));
    } catch (error) {
      toast.error('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchBrands();
  };

  const handleAutoFill = async () => {
    if (!newBrand.name && !newBrand.website && !newBrand.instagram) {
      toast.error('Enter brand name, website, or Instagram to auto-fill');
      return;
    }
    setAutoFilling(true);
    toast.info('AI Auto-fill feature coming soon!');
    setTimeout(() => setAutoFilling(false), 1000);
  };

  const toggleCategory = (cat) => {
    setNewBrand(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const toggleGender = (gender) => {
    setNewBrand(prev => ({
      ...prev,
      genders: prev.genders.includes(gender)
        ? prev.genders.filter(g => g !== gender)
        : [...prev.genders, gender]
    }));
  };

  const handleAddBrand = async () => {
    if (!newBrand.name || !newBrand.city || !newBrand.segment) {
      toast.error('Brand name, city, and segment are required');
      return;
    }
    try {
      const response = await api.post('/sourcing/brands', newBrand);
      const createdBrand = response.data;
      toast.success('Brand added successfully');
      setShowAddModal(false);
      
      // Show integration check dialog
      setCreatedEntity({
        id: createdBrand.id,
        name: newBrand.name
      });
      setShowIntegrationCheck(true);
      
      setNewBrand({
        name: '', website: '', instagram: '', division: 'Apparel', segment: '',
        categories: [], genders: [], min_price: '', max_price: '', city: '',
        email: '', phone_number: '', address: '', linkedin: '', description: ''
      });
      fetchBrands();
    } catch (error) {
      toast.error('Failed to add brand');
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await api.delete(`/sourcing/brands/${brandId}`);
      toast.success('Brand deleted');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to delete brand');
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'Discovery': 'bg-gray-100 text-gray-800',
      'Contacted': 'bg-blue-100 text-blue-800',
      'Qualified': 'bg-purple-100 text-purple-800',
      'Interested': 'bg-amber-100 text-amber-800',
      'Negotiation': 'bg-orange-100 text-orange-800',
      'Onboarded': 'bg-green-100 text-green-800',
      'Lost': 'bg-red-100 text-red-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="brands-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728]">Brand Database</h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#4A3728] hover:bg-[#3A2A1E]">
          <Plus className="h-4 w-4 mr-2" /> Add Brand
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="border-[#E8D5C4] bg-white/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brands..."
                  className="pl-10 border-[#E8D5C4] focus:border-[#D4BBA6] focus:ring-[#D4BBA6]"
                />
              </div>
            </form>
            <Select value={filters.segment || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, segment: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.pipeline_stage || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, pipeline_stage: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Brands Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No brands found. Add your first brand to get started.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{brand.name}</div>
                      {brand.website && (
                        <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Website
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{brand.city}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{brand.segment}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(brand.pipeline_stage)}>
                        {brand.pipeline_stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {brand.email && <Mail className="h-4 w-4 text-gray-400" />}
                        {brand.phone_number && <Phone className="h-4 w-4 text-gray-400" />}
                        {!brand.email && !brand.phone_number && <span className="text-gray-400 text-sm">No contact</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${brand.fit_score >= 70 ? 'text-green-600' : brand.fit_score >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {brand.fit_score || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {brand.created_by_name || (brand.ai_discovered ? 'AI Discovery' : '-')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {brand.created_at ? new Date(brand.created_at).toLocaleDateString() : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/sourcing/brands/${brand.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {brand._permissions?.can_edit !== false && (
                            <DropdownMenuItem onClick={() => navigate(`/sourcing/brands/${brand.id}/edit`)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          {brand._permissions?.can_delete !== false ? (
                            <DropdownMenuItem onClick={() => handleDeleteBrand(brand.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                              <span className="ml-1 text-xs">(Owner only)</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} brands
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Brand Modal - Enhanced to match screenshot */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add New Brand</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Brand Name *</Label>
                <Input
                  value={newBrand.name}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter brand name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Website</Label>
                <Input
                  value={newBrand.website}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Instagram Handle</Label>
              <div className="relative mt-1">
                <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={newBrand.instagram}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@brandhandle or brandhandle"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">If website is unavailable, enter Instagram handle for AI lookup</p>
            </div>

            {/* AI Auto-fill */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Auto-fill</p>
                  <p className="text-xs text-gray-500">Enter brand name, website, or Instagram above, then click to auto-fill details & find contacts</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleAutoFill} disabled={autoFilling}>
                <Sparkles className="h-4 w-4 mr-2" /> {autoFilling ? 'Processing...' : 'AUTO-FILL'}
              </Button>
            </div>

            {/* Division & Segment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Division *</Label>
                <Select value={newBrand.division} onValueChange={(v) => setNewBrand(prev => ({ ...prev, division: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Segment *</Label>
                <Select value={newBrand.segment} onValueChange={(v) => setNewBrand(prev => ({ ...prev, segment: v }))}>
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
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={newBrand.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
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
                      id={`gender-${g}`}
                      checked={newBrand.genders.includes(g)}
                      onCheckedChange={() => toggleGender(g)}
                    />
                    <label htmlFor={`gender-${g}`} className="text-sm cursor-pointer">{g}</label>
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
                  value={newBrand.min_price}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, min_price: e.target.value }))}
                  placeholder="5000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Max Price (₹)</Label>
                <Input
                  type="number"
                  value={newBrand.max_price}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, max_price: e.target.value }))}
                  placeholder="60000"
                  className="mt-1"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">City *</Label>
              <Select value={newBrand.city} onValueChange={(v) => setNewBrand(prev => ({ ...prev, city: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Information */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Brand Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  value={newBrand.email}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@brand.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Brand's general contact email (used for outreach in addition to contacts)</p>
            </div>

            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={newBrand.phone_number}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Full Address</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  value={newBrand.address}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter complete address including building, street, area, pincode..."
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
                    value={newBrand.instagram}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, instagram: e.target.value }))}
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
                    value={newBrand.linkedin}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, linkedin: e.target.value }))}
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
                value={newBrand.description}
                onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the brand's aesthetic, products, and unique selling points..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddBrand} className="bg-gray-900 hover:bg-gray-800">Add Brand</Button>
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
          entityType="brand"
          entityId={createdEntity.id}
          entityName={createdEntity.name}
          onComplete={() => setCreatedEntity(null)}
        />
      )}
    </div>
  );
};

export default BrandsPage;
