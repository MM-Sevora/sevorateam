import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  Building2, Plus, Search, Filter, ExternalLink, Mail, Phone,
  MoreVertical, Edit2, Trash2, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';

const SEGMENTS = ['Mass Premium', 'Bridge to Luxury', 'Affordable Luxury', 'Premium', 'Luxury'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Qualified', 'Interested', 'Negotiation', 'Onboarded', 'Lost'];

const BrandsPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ segment: '', pipeline_stage: '', city: '' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBrand, setNewBrand] = useState({
    name: '', website: '', segment: 'Affordable Luxury', city: '', email: '', phone_number: '', description: ''
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

  const handleAddBrand = async () => {
    if (!newBrand.name || !newBrand.city) {
      toast.error('Name and city are required');
      return;
    }
    try {
      await api.post('/sourcing/brands', newBrand);
      toast.success('Brand added successfully');
      setShowAddModal(false);
      setNewBrand({ name: '', website: '', segment: 'Affordable Luxury', city: '', email: '', phone_number: '', description: '' });
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
      'Discovery': 'bg-gray-100 text-gray-700',
      'Contacted': 'bg-amber-100 text-amber-700',
      'Qualified': 'bg-cyan-100 text-cyan-700',
      'Interested': 'bg-blue-100 text-blue-700',
      'Negotiation': 'bg-purple-100 text-purple-700',
      'Onboarded': 'bg-green-100 text-green-700',
      'Lost': 'bg-red-100 text-red-700'
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6" data-testid="brands-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Brands Database
          </h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Add Brand
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search brands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.segment || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, segment: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.pipeline_stage || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, pipeline_stage: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              <Filter className="h-4 w-4 mr-2" /> Apply
            </Button>
          </form>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                          <DropdownMenuItem onClick={() => navigate(`/sourcing/brands/${brand.id}/edit`)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteBrand(brand.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
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

      {/* Add Brand Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Brand Name *</Label>
              <Input
                value={newBrand.name}
                onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter brand name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={newBrand.city}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g., Mumbai"
                />
              </div>
              <div>
                <Label>Segment</Label>
                <Select value={newBrand.segment} onValueChange={(v) => setNewBrand(prev => ({ ...prev, segment: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={newBrand.website}
                onChange={(e) => setNewBrand(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newBrand.email}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@brand.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newBrand.phone_number}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+91..."
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newBrand.description}
                onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the brand"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddBrand} className="bg-orange-600 hover:bg-orange-700">Add Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandsPage;
