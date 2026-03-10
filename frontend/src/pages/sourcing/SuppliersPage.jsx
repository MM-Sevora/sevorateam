import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { Package, Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

const SUPPLIER_TYPES = ['Fabric', 'Trim', 'Packaging', 'Dyeing', 'Printing', 'Other'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Sampling', 'Evaluation', 'Negotiation', 'Active', 'Inactive'];

const SuppliersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ supplier_type: '', pipeline_stage: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '', supplier_type: 'Fabric', city: '', country: 'India', email: '', phone: '', moq_meters: 0, lead_time_days: 0
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

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.city) {
      toast.error('Name and city are required');
      return;
    }
    try {
      await api.post('/sourcing/suppliers', newSupplier);
      toast.success('Supplier added successfully');
      setShowAddModal(false);
      setNewSupplier({ name: '', supplier_type: 'Fabric', city: '', country: 'India', email: '', phone: '', moq_meters: 0, lead_time_days: 0 });
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
    'Evaluation': 'bg-cyan-100 text-cyan-700',
    'Negotiation': 'bg-purple-100 text-purple-700',
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-red-100 text-red-700'
  }[stage] || 'bg-gray-100 text-gray-700');

  return (
    <div className="p-6 space-y-6" data-testid="suppliers-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8" /> Suppliers Database
          </h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); fetchSuppliers(); }} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filters.supplier_type || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, supplier_type: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.pipeline_stage || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, pipeline_stage: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary"><Filter className="h-4 w-4 mr-2" /> Apply</Button>
          </form>
        </CardContent>
      </Card>

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
                  <TableCell>{s.city}, {s.country}</TableCell>
                  <TableCell><Badge className={getStageColor(s.pipeline_stage)}>{s.pipeline_stage}</Badge></TableCell>
                  <TableCell>{s.moq_meters ? `${s.moq_meters}m` : '-'}</TableCell>
                  <TableCell>{s.lead_time_days ? `${s.lead_time_days} days` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
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

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={newSupplier.name} onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))} placeholder="Supplier name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={newSupplier.supplier_type} onValueChange={(v) => setNewSupplier(prev => ({ ...prev, supplier_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>City *</Label><Input value={newSupplier.city} onChange={(e) => setNewSupplier(prev => ({ ...prev, city: e.target.value }))} placeholder="City" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))} placeholder="email@supplier.com" /></div>
              <div><Label>Phone</Label><Input value={newSupplier.phone} onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))} placeholder="+91..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>MOQ (meters)</Label><Input type="number" value={newSupplier.moq_meters} onChange={(e) => setNewSupplier(prev => ({ ...prev, moq_meters: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Lead Time (days)</Label><Input type="number" value={newSupplier.lead_time_days} onChange={(e) => setNewSupplier(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier} className="bg-blue-600 hover:bg-blue-700">Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersPage;
