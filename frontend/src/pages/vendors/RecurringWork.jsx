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
  RefreshCw, Plus, Search, Loader2, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown,
  X, Eye, Calendar, Clock, DollarSign, Pause, Play, Edit, Trash2, AlertTriangle
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

const RecurringWork = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', frequency: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'next_due_date', direction: 'asc' });
  const [formData, setFormData] = useState({
    name: '', vendor_id: '', department: '', description: '', frequency: 'monthly',
    estimated_amount: '', currency: 'INR', start_date: '', end_date: '', notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, vendorsRes] = await Promise.all([
        api.get('/vendors/recurring'),
        api.get('/vendors')
      ]);
      setSchedules(schedulesRes.data.recurring_work || schedulesRes.data.recurring || []);
      setVendors(vendorsRes.data.vendors || []);
    } catch (error) {
      toast.error('Failed to load recurring work schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.vendor_id || !formData.department || !formData.description || !formData.frequency || !formData.start_date) {
        toast.error('Please fill in all required fields');
        return;
      }
      const payload = { ...formData };
      if (formData.estimated_amount) payload.estimated_amount = parseFloat(formData.estimated_amount);
      delete payload.currency;
      delete payload.end_date;
      delete payload.notes;
      await api.post('/vendors/recurring', payload);
      toast.success('Recurring schedule created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create recurring schedule');
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = { ...formData };
      if (formData.amount) payload.amount = parseFloat(formData.amount);
      await api.put(`/vendors/recurring/${selectedSchedule.id}`, payload);
      toast.success('Schedule updated');
      setShowEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (schedule) => {
    if (!confirm(`Delete recurring schedule "${schedule.name}"?`)) return;
    try {
      await api.delete(`/vendors/recurring/${schedule.id}`);
      toast.success('Schedule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleStatus = async (schedule) => {
    try {
      const newIsActive = !schedule.is_active;
      await api.put(`/vendors/recurring/${schedule.id}`, { is_active: newIsActive });
      toast.success(`Schedule ${newIsActive ? 'resumed' : 'paused'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openEditDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name || '', vendor_id: schedule.vendor_id || '',
      department: schedule.department || '', description: schedule.description || '', 
      frequency: schedule.frequency || 'monthly',
      estimated_amount: schedule.estimated_amount?.toString() || '', currency: schedule.currency || 'INR',
      start_date: schedule.start_date?.split('T')[0] || '', end_date: schedule.end_date?.split('T')[0] || '',
      notes: schedule.notes || ''
    });
    setShowEditDialog(true);
  };

  const openViewDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setShowViewDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', vendor_id: '', department: '', description: '', frequency: 'monthly', estimated_amount: '', currency: 'INR', start_date: '', end_date: '', notes: '' });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name?.toLowerCase().includes(q) || s.vendor_name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    if (filters.status) {
      if (filters.status === 'active') result = result.filter(s => s.is_active !== false);
      else if (filters.status === 'paused') result = result.filter(s => s.is_active === false);
    }
    if (filters.frequency) result = result.filter(s => s.frequency === filters.frequency);
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [schedules, searchQuery, filters, sortConfig]);

  const getStatusBadge = (schedule) => {
    if (schedule.is_active === false) {
      return <Badge className="bg-amber-100 text-amber-700">paused</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-700">active</Badge>;
  };

  const getFrequencyBadge = (frequency) => {
    const styles = {
      daily: 'bg-red-100 text-red-700', weekly: 'bg-orange-100 text-orange-700',
      bi_weekly: 'bg-amber-100 text-amber-700', monthly: 'bg-blue-100 text-blue-700',
      quarterly: 'bg-purple-100 text-purple-700', yearly: 'bg-teal-100 text-teal-700'
    };
    return <Badge className={styles[frequency] || 'bg-gray-100'}>{frequency?.replace(/_/g, ' ')}</Badge>;
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';
  const formatCurrency = (amount, currency = 'INR') => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount) : '-';

  const isDueSoon = (nextDue) => {
    if (!nextDue) return false;
    const dueDate = new Date(nextDue);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const isOverdue = (nextDue) => {
    if (!nextDue) return false;
    return new Date(nextDue) < new Date();
  };

  const SortHeader = ({ column, label }) => (
    <TableHead className="cursor-pointer hover:bg-[#F5EDE5] select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === column ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  const clearFilters = () => { setFilters({ status: '', frequency: '' }); setSearchQuery(''); };
  const hasActiveFilters = filters.status || filters.frequency || searchQuery;

  // Summary stats
  const activeCount = schedules.filter(s => s.is_active !== false).length;
  const dueSoonCount = schedules.filter(s => s.is_active !== false && isDueSoon(s.next_due_date)).length;
  const overdueCount = schedules.filter(s => s.is_active !== false && isOverdue(s.next_due_date)).length;
  const totalMonthlyValue = schedules.filter(s => s.is_active !== false).reduce((sum, s) => {
    if (!s.estimated_amount) return sum;
    const multiplier = { daily: 30, weekly: 4, bi_weekly: 2, monthly: 1, quarterly: 0.33, yearly: 0.083 };
    return sum + (s.estimated_amount * (multiplier[s.frequency] || 1));
  }, 0);

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="recurring-work">
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Recurring Work</h1>
          <p className="text-[#8B7355]">{filteredAndSortedSchedules.length} of {schedules.length} schedules</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Schedule
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-[#4A3728]">{activeCount}</p>
            <p className="text-xs text-[#8B7355]">Active Schedules</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{dueSoonCount}</p>
            <p className="text-xs text-[#8B7355]">Due This Week</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            <p className="text-xs text-[#8B7355]">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-[#4A3728]">{formatCurrency(totalMonthlyValue)}</p>
            <p className="text-xs text-[#8B7355]">Est. Monthly Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input placeholder="Search schedules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-[#D4BBA6]" />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[130px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.frequency || "all"} onValueChange={(v) => setFilters(f => ({...f, frequency: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-[130px] bg-white border-[#D4BBA6]"><SelectValue placeholder="Frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[#8B7355]"><X className="w-4 h-4 mr-1" /> Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : filteredAndSortedSchedules.length === 0 ? (
            <div className="text-center py-12 text-[#8B7355]"><RefreshCw className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" /><p>No recurring schedules found</p></div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <SortHeader column="name" label="Name" />
                  <SortHeader column="vendor_name" label="Vendor" />
                  <TableHead>Frequency</TableHead>
                  <SortHeader column="next_due_date" label="Next Due" />
                  <SortHeader column="amount" label="Amount" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column="executions" label="Executions" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSchedules.map((schedule) => (
                  <TableRow key={schedule.id} className="hover:bg-[#FDF8F3] cursor-pointer" onClick={() => openViewDialog(schedule)}>
                    <TableCell>
                      <div className="font-medium text-[#4A3728]">{schedule.name}</div>
                      <div className="text-xs text-[#8B7355] truncate max-w-[200px]">{schedule.description}</div>
                    </TableCell>
                    <TableCell className="text-[#8B7355]">{schedule.vendor_name}</TableCell>
                    <TableCell>{getFrequencyBadge(schedule.frequency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isOverdue(schedule.next_due_date) && schedule.status === 'active' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {isDueSoon(schedule.next_due_date) && !isOverdue(schedule.next_due_date) && schedule.status === 'active' && <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={isOverdue(schedule.next_due_date) && schedule.status === 'active' ? 'text-red-600 font-medium' : 'text-[#8B7355]'}>
                          {formatDate(schedule.next_due_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-[#4A3728]">{formatCurrency(schedule.estimated_amount, schedule.currency)}</TableCell>
                    <TableCell>{getStatusBadge(schedule)}</TableCell>
                    <TableCell className="text-center text-[#8B7355]">{schedule.executions || 0}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog(schedule)}><Eye className="w-4 h-4 text-[#8B7355]" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(schedule)}>
                          {schedule.is_active !== false ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(schedule)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(schedule)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle className="text-[#4A3728]">New Recurring Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-[#4A3728]">Name *</label><Input value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="e.g., Monthly Server Maintenance" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Vendor *</label>
                <Select value={formData.vendor_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem>{vendors.filter(v => v.status === 'active').map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium text-[#4A3728]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem>
                    {['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Frequency *</label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData(f => ({...f, frequency: v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Estimated Amount</label><Input type="number" value={formData.estimated_amount} onChange={(e) => setFormData(f => ({...f, estimated_amount: e.target.value}))} className="bg-white border-[#D4BBA6]" placeholder="0.00" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Start Date *</label><Input type="date" value={formData.start_date} onChange={(e) => setFormData(f => ({...f, start_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
              <div><label className="text-sm font-medium text-[#4A3728]">End Date</label><Input type="date" value={formData.end_date} onChange={(e) => setFormData(f => ({...f, end_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Description *</label><Textarea value={formData.description} onChange={(e) => setFormData(f => ({...f, description: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} placeholder="Describe the recurring work..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Edit Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-[#4A3728]">Name *</label><Input value={formData.name} onChange={(e) => setFormData(f => ({...f, name: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Vendor *</label>
                <Select value={formData.vendor_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem>{vendors.filter(v => v.status === 'active').map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium text-[#4A3728]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="placeholder" disabled>Select</SelectItem>
                    {['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Frequency *</label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData(f => ({...f, frequency: v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Estimated Amount</label><Input type="number" value={formData.estimated_amount} onChange={(e) => setFormData(f => ({...f, estimated_amount: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-[#4A3728]">Start Date *</label><Input type="date" value={formData.start_date} onChange={(e) => setFormData(f => ({...f, start_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
              <div><label className="text-sm font-medium text-[#4A3728]">End Date</label><Input type="date" value={formData.end_date} onChange={(e) => setFormData(f => ({...f, end_date: e.target.value}))} className="bg-white border-[#D4BBA6]" /></div>
            </div>
            <div><label className="text-sm font-medium text-[#4A3728]">Description *</label><Textarea value={formData.description} onChange={(e) => setFormData(f => ({...f, description: e.target.value}))} className="bg-white border-[#D4BBA6]" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleUpdate} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader><DialogTitle className="text-[#4A3728]">Schedule Details</DialogTitle></DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-[#4A3728]">{selectedSchedule.name}</h3>
                <div className="flex gap-2">{getStatusBadge(selectedSchedule.status)}{getFrequencyBadge(selectedSchedule.frequency)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Vendor</p><p className="font-semibold text-[#4A3728]">{selectedSchedule.vendor_name}</p></div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Amount</p><p className="font-semibold text-[#4A3728]">{formatCurrency(selectedSchedule.estimated_amount)}</p></div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Next Due</p><p className={`font-semibold ${isOverdue(selectedSchedule.next_due_date) ? 'text-red-600' : 'text-[#4A3728]'}`}>{formatDate(selectedSchedule.next_due_date)}</p></div>
                <div className="bg-[#F5EDE5] p-3 rounded-lg"><p className="text-xs text-[#8B7355]">Executions</p><p className="font-semibold text-[#4A3728]">{selectedSchedule.executions || 0}</p></div>
              </div>
              {selectedSchedule.description && <div><p className="text-xs text-[#8B7355] mb-1">Description</p><p className="text-sm text-[#4A3728] bg-[#F5EDE5] p-3 rounded-lg">{selectedSchedule.description}</p></div>}
              {selectedSchedule.notes && <div><p className="text-xs text-[#8B7355] mb-1">Notes</p><p className="text-sm text-[#4A3728] bg-[#F5EDE5] p-3 rounded-lg">{selectedSchedule.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => { setShowViewDialog(false); openEditDialog(selectedSchedule); }} className="flex-1 bg-[#4A3728] hover:bg-[#5D4A3A] text-white"><Edit className="w-4 h-4 mr-1" /> Edit</Button>
                <Button size="sm" onClick={() => { handleToggleStatus(selectedSchedule); setShowViewDialog(false); }} variant="outline" className="flex-1 border-[#D4BBA6]">
                  {selectedSchedule.is_active !== false ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Resume</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringWork;
