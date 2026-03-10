import React, { useState, useEffect } from 'react';
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
import { Factory, Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

const MANUFACTURER_TYPES = ['Garment', 'Accessory', 'Footwear', 'Textile', 'Embroidery', 'Other'];
const PIPELINE_STAGES = ['Discovery', 'Contacted', 'Factory Visit', 'Sampling', 'Production Trial', 'Active', 'Inactive'];

const ManufacturersPage = () => {
  const { api } = useAuth();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ manufacturer_type: '', pipeline_stage: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '', manufacturer_type: 'Garment', city: '', country: 'India', email: '', phone: '', moq: 0, moq_unit: 'pieces', lead_time_days: 0
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

  const handleAdd = async () => {
    if (!newItem.name || !newItem.city) {
      toast.error('Name and city are required');
      return;
    }
    try {
      await api.post('/sourcing/manufacturers', newItem);
      toast.success('Manufacturer added');
      setShowAddModal(false);
      setNewItem({ name: '', manufacturer_type: 'Garment', city: '', country: 'India', email: '', phone: '', moq: 0, moq_unit: 'pieces', lead_time_days: 0 });
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
      toast.error('Failed to delete');
    }
  };

  const getStageColor = (stage) => ({
    'Discovery': 'bg-gray-100 text-gray-700',
    'Contacted': 'bg-amber-100 text-amber-700',
    'Factory Visit': 'bg-cyan-100 text-cyan-700',
    'Sampling': 'bg-blue-100 text-blue-700',
    'Production Trial': 'bg-purple-100 text-purple-700',
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-red-100 text-red-700'
  }[stage] || 'bg-gray-100 text-gray-700');

  return (
    <div className="p-6 space-y-6" data-testid="manufacturers-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="h-8 w-8" /> Manufacturers Database
          </h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" /> Add Manufacturer
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); fetchManufacturers(); }} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filters.manufacturer_type || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, manufacturer_type: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MANUFACTURER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
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
                  <TableCell>{m.city}, {m.country}</TableCell>
                  <TableCell><Badge className={getStageColor(m.pipeline_stage)}>{m.pipeline_stage}</Badge></TableCell>
                  <TableCell>{m.moq ? `${m.moq} ${m.moq_unit}` : '-'}</TableCell>
                  <TableCell>{m.lead_time_days ? `${m.lead_time_days} days` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
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

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Manufacturer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={newItem.name} onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))} placeholder="Manufacturer name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={newItem.manufacturer_type} onValueChange={(v) => setNewItem(prev => ({ ...prev, manufacturer_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MANUFACTURER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>City *</Label><Input value={newItem.city} onChange={(e) => setNewItem(prev => ({ ...prev, city: e.target.value }))} placeholder="City" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={newItem.email} onChange={(e) => setNewItem(prev => ({ ...prev, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={newItem.phone} onChange={(e) => setNewItem(prev => ({ ...prev, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>MOQ</Label><Input type="number" value={newItem.moq} onChange={(e) => setNewItem(prev => ({ ...prev, moq: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Unit</Label>
                <Select value={newItem.moq_unit} onValueChange={(v) => setNewItem(prev => ({ ...prev, moq_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">pieces</SelectItem>
                    <SelectItem value="dozens">dozens</SelectItem>
                    <SelectItem value="meters">meters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Lead Time</Label><Input type="number" value={newItem.lead_time_days} onChange={(e) => setNewItem(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-amber-600 hover:bg-amber-700">Add Manufacturer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManufacturersPage;
