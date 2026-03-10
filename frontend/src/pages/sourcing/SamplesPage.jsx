import React, { useState, useEffect } from 'react';
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
import { FlaskConical, Plus, Search, Package, CheckCircle2, XCircle, Clock, Truck } from 'lucide-react';

const SAMPLE_STATUSES = ['Requested', 'Confirmed', 'Shipped', 'Received', 'Testing', 'Approved', 'Rejected'];
const FABRIC_TYPES = ['Cotton', 'Silk', 'Linen', 'Wool', 'Polyester', 'Viscose', 'Blend', 'Other'];

const SamplesPage = () => {
  const { api } = useAuth();
  const [samples, setSamples] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSample, setNewSample] = useState({
    supplier_id: '', fabric_type: 'Cotton', fabric_name: '', composition: '', color: '', weight_gsm: '', quantity_meters: 1, notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [samplesRes, dashboardRes, suppliersRes] = await Promise.all([
        api.get(`/sourcing/samples${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/sourcing/samples/dashboard'),
        api.get('/sourcing/suppliers')
      ]);
      setSamples(samplesRes.data);
      setDashboard(dashboardRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      toast.error('Failed to fetch samples');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = async () => {
    if (!newSample.supplier_id || !newSample.fabric_name) {
      toast.error('Supplier and fabric name are required');
      return;
    }
    try {
      await api.post('/sourcing/samples', newSample);
      toast.success('Sample request created');
      setShowAddModal(false);
      setNewSample({ supplier_id: '', fabric_type: 'Cotton', fabric_name: '', composition: '', color: '', weight_gsm: '', quantity_meters: 1, notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create sample request');
    }
  };

  const handleUpdateStatus = async (sampleId, newStatus, extra = {}) => {
    try {
      await api.put(`/sourcing/samples/${sampleId}/status`, { status: newStatus, ...extra });
      toast.success(`Sample status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Shipped': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'Testing': return <FlaskConical className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => ({
    'Requested': 'bg-gray-100 text-gray-700',
    'Confirmed': 'bg-blue-100 text-blue-700',
    'Shipped': 'bg-cyan-100 text-cyan-700',
    'Received': 'bg-amber-100 text-amber-700',
    'Testing': 'bg-purple-100 text-purple-700',
    'Approved': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700'
  }[status] || 'bg-gray-100 text-gray-700');

  return (
    <div className="p-6 space-y-6" data-testid="samples-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-8 w-8" /> Samples Tracking
          </h1>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> Request Sample
        </Button>
      </div>

      {/* Dashboard Summary */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{dashboard.total}</div>
              <div className="text-sm text-gray-500">Total Samples</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{dashboard.pending_receipt}</div>
              <div className="text-sm text-gray-500">Pending Receipt</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{dashboard.pending_testing}</div>
              <div className="text-sm text-gray-500">Pending Testing</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{dashboard.pending_decision}</div>
              <div className="text-sm text-gray-500">Pending Decision</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Filter by Status:</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant={statusFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('')}>All</Button>
              {SAMPLE_STATUSES.map(s => (
                <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Samples Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                </TableCell></TableRow>
              ) : samples.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No samples found. Create your first sample request.
                </TableCell></TableRow>
              ) : samples.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium">{s.fabric_name}</div>
                    <div className="text-xs text-gray-500">{s.fabric_type} • {s.color || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      {s.supplier_name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {s.composition && <div>Composition: {s.composition}</div>}
                      {s.weight_gsm && <div>GSM: {s.weight_gsm}</div>}
                      <div>Qty: {s.quantity_meters}m</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(s.status)}
                      <Badge className={getStatusColor(s.status)}>{s.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(s.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Select onValueChange={(v) => handleUpdateStatus(s.id, v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Update Status" /></SelectTrigger>
                      <SelectContent>
                        {SAMPLE_STATUSES.filter(st => st !== s.status).map(st => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Sample Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Request New Sample</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={newSample.supplier_id} onValueChange={(v) => setNewSample(prev => ({ ...prev, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - {s.city}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fabric Type</Label>
                <Select value={newSample.fabric_type} onValueChange={(v) => setNewSample(prev => ({ ...prev, fabric_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FABRIC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fabric Name *</Label>
                <Input value={newSample.fabric_name} onChange={(e) => setNewSample(prev => ({ ...prev, fabric_name: e.target.value }))} placeholder="e.g., Pure Mulberry Silk" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Composition</Label><Input value={newSample.composition} onChange={(e) => setNewSample(prev => ({ ...prev, composition: e.target.value }))} placeholder="e.g., 100% Silk" /></div>
              <div><Label>Color</Label><Input value={newSample.color} onChange={(e) => setNewSample(prev => ({ ...prev, color: e.target.value }))} placeholder="e.g., Navy Blue" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Weight (GSM)</Label><Input type="number" value={newSample.weight_gsm} onChange={(e) => setNewSample(prev => ({ ...prev, weight_gsm: e.target.value }))} /></div>
              <div><Label>Quantity (meters)</Label><Input type="number" value={newSample.quantity_meters} onChange={(e) => setNewSample(prev => ({ ...prev, quantity_meters: parseFloat(e.target.value) || 1 }))} /></div>
            </div>
            <div><Label>Notes</Label><Input value={newSample.notes} onChange={(e) => setNewSample(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any special requirements" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddSample} className="bg-purple-600 hover:bg-purple-700">Create Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplesPage;
