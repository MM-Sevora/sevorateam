import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  DollarSign, Plus, TrendingUp, PieChart, Building2, Calendar,
  CheckCircle, XCircle, Clock, Edit2, Trash2, Search, Filter,
  BarChart3, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import useDepartments from '../../hooks/useDepartments';

const COLORS = ['#4A3728', '#8B7355', '#D4BBA6', '#E8D5C4', '#6B8E23', '#CD853F'];
const CATEGORIES = ['Operations', 'Marketing', 'Technology', 'HR', 'Sales', 'R&D', 'Admin', 'Other'];

const BudgetPlanning = () => {
  const { api } = useAuth();
  const { departments: deptData } = useDepartments();
  const departments = deptData.map(d => d.name);
  const [budgets, setBudgets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [filters, setFilters] = useState({ department: '', status: '', year: new Date().getFullYear().toString() });
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    fiscal_year: new Date().getFullYear().toString(),
    category: '',
    allocated_amount: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, overviewRes] = await Promise.all([
        api.get('/finance/budgets', { params: filters }),
        api.get('/finance/budgets/summary/overview', { params: { fiscal_year: filters.year } })
      ]);
      setBudgets(budgetsRes.data.budgets || []);
      setOverview(overviewRes.data);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    try {
      if (!formData.name || !formData.department || !formData.category || !formData.allocated_amount) {
        toast.error('Please fill in all required fields');
        return;
      }
      await api.post('/finance/budgets', {
        ...formData,
        allocated_amount: parseFloat(formData.allocated_amount)
      });
      toast.success('Budget created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to create budget');
    }
  };

  const handleApproveBudget = async (budgetId) => {
    try {
      await api.post(`/finance/budgets/${budgetId}/approve`);
      toast.success('Budget approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve budget');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      department: '',
      fiscal_year: new Date().getFullYear().toString(),
      category: '',
      allocated_amount: '',
      description: '',
      start_date: '',
      end_date: ''
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      active: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      closed: 'bg-slate-100 text-slate-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace('_', ' ')}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="budget-planning-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Budget Planning</h1>
          <p className="text-[#8B7355]">Manage departmental budgets and allocations</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white"
          data-testid="create-budget-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Budget
        </Button>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-[#8B7355]">Total Allocated</p>
                  <p className="text-lg font-bold text-[#4A3728]">{formatCurrency(overview.summary?.total_allocated)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-[#8B7355]">Total Spent</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(overview.summary?.total_spent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-[#8B7355]">Remaining</p>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(overview.summary?.total_remaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E8D5C4]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-[#8B7355]">Utilization</p>
                  <p className="text-lg font-bold text-purple-600">{overview.summary?.utilization_rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Budget by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.by_department?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={overview.by_department} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="department" width={80} fontSize={11} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="allocated" name="Allocated" fill="#4A3728" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" name="Spent" fill="#D4BBA6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-[#8B7355]">No data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E8D5C4]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#4A3728] flex items-center gap-2">
              <PieChart className="w-5 h-5" /> Budget by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.by_category?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={overview.by_category}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="allocated"
                    nameKey="category"
                    label={({ category, allocated }) => `${category}: ${formatCurrency(allocated)}`}
                  >
                    {overview.by_category.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-[#8B7355]">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#8B7355]" />
              <span className="text-sm text-[#8B7355]">Filters:</span>
            </div>
            <Select value={filters.department || "all"} onValueChange={(v) => setFilters(f => ({...f, department: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-40 bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters(f => ({...f, status: v === "all" ? "" : v}))}>
              <SelectTrigger className="w-36 bg-white border-[#D4BBA6]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters(f => ({...f, year: e.target.value}))}
              className="w-24 bg-white border-[#D4BBA6]"
              placeholder="Year"
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget List */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#4A3728]">Budget List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[#8B7355]">Loading...</div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8 text-[#8B7355]">No budgets found. Create your first budget.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8D5C4]">
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#8B7355]">Name</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#8B7355]">Department</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[#8B7355]">Category</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-[#8B7355]">Allocated</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-[#8B7355]">Spent</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-[#8B7355]">Remaining</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-[#8B7355]">Status</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-[#8B7355]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((budget) => (
                    <tr key={budget.id} className="border-b border-[#E8D5C4]/50 hover:bg-[#F5EDE5]">
                      <td className="py-3 px-2">
                        <p className="font-medium text-[#4A3728]">{budget.name}</p>
                        <p className="text-xs text-[#8B7355]">FY {budget.fiscal_year}</p>
                      </td>
                      <td className="py-3 px-2 text-sm text-[#4A3728]">{budget.department}</td>
                      <td className="py-3 px-2 text-sm text-[#4A3728]">{budget.category}</td>
                      <td className="py-3 px-2 text-sm text-right font-medium text-[#4A3728]">{formatCurrency(budget.allocated_amount)}</td>
                      <td className="py-3 px-2 text-sm text-right text-blue-600">{formatCurrency(budget.spent_amount)}</td>
                      <td className="py-3 px-2 text-sm text-right text-emerald-600">{formatCurrency(budget.remaining_amount)}</td>
                      <td className="py-3 px-2 text-center">{getStatusBadge(budget.status)}</td>
                      <td className="py-3 px-2 text-center">
                        {budget.status === 'draft' && (
                          <Button size="sm" variant="ghost" onClick={() => handleApproveBudget(budget.id)}>
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">Create New Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8B7355]">Budget Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({...f, name: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="e.g., Q1 Marketing Budget"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Department *</label>
                <Select value={formData.department || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, department: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select Department</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Category *</label>
                <Select value={formData.category || "placeholder"} onValueChange={(v) => setFormData(f => ({...f, category: v === "placeholder" ? "" : v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select Category</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#8B7355]">Fiscal Year</label>
                <Input
                  type="number"
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData(f => ({...f, fiscal_year: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                />
              </div>
              <div>
                <label className="text-sm text-[#8B7355]">Allocated Amount *</label>
                <Input
                  type="number"
                  value={formData.allocated_amount}
                  onChange={(e) => setFormData(f => ({...f, allocated_amount: e.target.value}))}
                  className="bg-white border-[#D4BBA6]"
                  placeholder="$0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-[#8B7355]">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({...f, description: e.target.value}))}
                className="bg-white border-[#D4BBA6]"
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#D4BBA6]">
              Cancel
            </Button>
            <Button onClick={handleCreateBudget} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPlanning;
