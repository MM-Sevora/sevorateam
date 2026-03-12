import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw, Plus, Clock, Building2, Calendar, User, Loader2, Play,
  AlertTriangle, CheckCircle, DollarSign, ArrowLeft
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Admin', 'Production'];
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

const RecurringWork = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [recurring, setRecurring] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    vendor_id: '',
    department: '',
    description: '',
    frequency: 'monthly',
    start_date: '',
    estimated_amount: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recurringRes, vendorsRes] = await Promise.all([
        api.get('/vendors/recurring'),
        api.get('/vendors')
      ]);
      setRecurring(recurringRes.data.recurring_work || []);
      setVendors(vendorsRes.data.vendors || []);
    } catch (error) {
      console.error('Failed to fetch recurring work:', error);
      toast.error('Failed to load recurring work schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.vendor_id || !formData.department || !formData.description || !formData.start_date) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/vendors/recurring', {
        ...formData,
        estimated_amount: formData.estimated_amount ? parseFloat(formData.estimated_amount) : null
      });
      toast.success('Recurring work schedule created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create recurring work schedule');
    }
  };

  const handleCreateWorkOrder = async (recurringId) => {
    try {
      setCreatingOrder(recurringId);
      const res = await api.post(`/vendors/recurring/${recurringId}/create-work-order`);
      toast.success(`Work order ${res.data.work_order?.work_order_id} created`);
      fetchData();
    } catch (error) {
      toast.error('Failed to create work order');
    } finally {
      setCreatingOrder(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      vendor_id: '',
      department: '',
      description: '',
      frequency: 'monthly',
      start_date: '',
      estimated_amount: ''
    });
  };

  const getFrequencyBadge = (frequency) => {
    const styles = {
      daily: 'bg-red-100 text-red-700',
      weekly: 'bg-amber-100 text-amber-700',
      monthly: 'bg-blue-100 text-blue-700',
      quarterly: 'bg-purple-100 text-purple-700',
      yearly: 'bg-emerald-100 text-emerald-700'
    };
    return <Badge className={styles[frequency] || 'bg-gray-100'}>{frequency}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getDueStatus = (item) => {
    if (item.is_overdue) {
      return { color: 'text-red-600 bg-red-50', icon: AlertTriangle, text: `${Math.abs(item.days_until_due)} days overdue` };
    }
    if (item.is_due_soon) {
      return { color: 'text-amber-600 bg-amber-50', icon: Clock, text: item.days_until_due === 0 ? 'Due today' : `Due in ${item.days_until_due} days` };
    }
    return { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle, text: `${item.days_until_due} days remaining` };
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="recurring-work">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/vendors')} className="text-[#8B7355] hover:text-[#4A3728]" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Recurring Work</h1>
          <p className="text-[#8B7355]">Manage recurring vendor services and schedules</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="new-recurring-btn">
          <Plus className="w-4 h-4 mr-2" /> New Recurring Schedule
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {recurring.filter(r => r.is_overdue).length}
                </p>
                <p className="text-sm text-red-700">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {recurring.filter(r => r.is_due_soon).length}
                </p>
                <p className="text-sm text-amber-700">Due Soon (7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {recurring.length}
                </p>
                <p className="text-sm text-emerald-700">Total Schedules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Work List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
        </div>
      ) : recurring.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-[#D4BBA6] mb-4" />
            <p className="text-[#8B7355]">No recurring work schedules</p>
            <p className="text-sm text-[#8B7355]">Create recurring schedules for regular vendor services</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recurring.map((item) => {
            const dueStatus = getDueStatus(item);
            const StatusIcon = dueStatus.icon;
            
            return (
              <Card key={item.id} className={`bg-white border-[#E8D5C4] hover:shadow-md transition-shadow ${item.is_overdue ? 'border-l-4 border-l-red-500' : item.is_due_soon ? 'border-l-4 border-l-amber-500' : ''}`} data-testid={`recurring-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-[#4A3728]">{item.name}</h3>
                        {getFrequencyBadge(item.frequency)}
                      </div>
                      <p className="text-sm text-[#8B7355] line-clamp-2 mb-2">{item.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-[#8B7355]">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {item.vendor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {item.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {item.assigned_owner_name}
                        </span>
                        {item.estimated_amount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {formatCurrency(item.estimated_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${dueStatus.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span>{dueStatus.text}</span>
                      </div>
                      <div className="text-xs text-[#8B7355]">
                        Next due: {formatDate(item.next_due_date)}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleCreateWorkOrder(item.id)}
                        disabled={creatingOrder === item.id}
                        className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
                        data-testid={`create-wo-${item.id}`}
                      >
                        {creatingOrder === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Create Work Order
                      </Button>
                      {item.work_orders_created?.length > 0 && (
                        <span className="text-xs text-[#8B7355]">
                          {item.work_orders_created.length} work orders created
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">New Recurring Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Schedule Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({...f, name: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Monthly Office Maintenance"
                data-testid="recurring-name-input"
              />
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Vendor *</label>
              <Select value={formData.vendor_id || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, vendor_id: v === "placeholder" ? "" : v}))}>
                <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="recurring-vendor-select">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select vendor</SelectItem>
                  {vendors.filter(v => v.status === 'active').map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Frequency *</label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData(f => ({...f, frequency: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]" data-testid="recurring-frequency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Start Date *</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(f => ({...f, start_date: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  data-testid="recurring-start-date-input"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Estimated Amount</label>
                <Input
                  type="number"
                  value={formData.estimated_amount}
                  onChange={(e) => setFormData(f => ({...f, estimated_amount: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Describe the recurring work..."
                rows={3}
                data-testid="recurring-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white" data-testid="create-recurring-btn">
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringWork;
