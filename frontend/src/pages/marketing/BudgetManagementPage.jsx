import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import {
  Plus, Search, RefreshCw, Wallet, TrendingUp, TrendingDown,
  DollarSign, PieChart, Calendar, CheckCircle, Clock, AlertTriangle,
  Eye, Edit, Trash2, ChevronRight, FileText, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BUDGET_CATEGORIES = [
  { value: 'digital_ads', label: 'Digital Advertising' },
  { value: 'influencer', label: 'Influencer Marketing' },
  { value: 'content_production', label: 'Content Production' },
  { value: 'pr_communications', label: 'PR & Communications' },
  { value: 'events', label: 'Events & Activations' },
  { value: 'creative_agency', label: 'Creative Agency' },
  { value: 'software_tools', label: 'Software & Tools' },
  { value: 'research', label: 'Research & Insights' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'other', label: 'Other' },
];

const EXPENSE_TYPES = [
  { value: 'ad_spend', label: 'Ad Spend' },
  { value: 'influencer_fee', label: 'Influencer Fee' },
  { value: 'production_cost', label: 'Production Cost' },
  { value: 'agency_fee', label: 'Agency Fee' },
  { value: 'software', label: 'Software' },
  { value: 'event', label: 'Event' },
  { value: 'media_buy', label: 'Media Buy' },
  { value: 'creative', label: 'Creative' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500', icon: CheckCircle },
  active: { label: 'Active', color: 'bg-green-500', icon: TrendingUp },
  closed: { label: 'Closed', color: 'bg-gray-400', icon: CheckCircle },
  overspent: { label: 'Overspent', color: 'bg-red-500', icon: AlertTriangle },
};

const EXPENSE_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  approved: { label: 'Approved', color: 'bg-blue-500' },
  paid: { label: 'Paid', color: 'bg-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
};

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function BudgetManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetItems, setBudgetItems] = useState([]);

  // Dialog states
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, overviewRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/budgets`),
        fetch(`${API_URL}/api/marketing/v3/budgets/overview`),
        fetch(`${API_URL}/api/marketing/v3/budgets/expenses/all?limit=50`)
      ]);

      if (budgetsRes.ok) setBudgets(await budgetsRes.json());
      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Budget created successfully');
        setShowBudgetDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create budget');
      }
    } catch (error) {
      toast.error('Failed to create budget');
    }
  };

  const handleCreateExpense = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Expense recorded');
        setShowExpenseDialog(false);
        fetchData();
        if (selectedBudget) {
          fetchBudgetDetails(selectedBudget.id);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to record expense');
      }
    } catch (error) {
      toast.error('Failed to record expense');
    }
  };

  const handleApproveExpense = async (expenseId) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets/expenses/${expenseId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Expense approved');
        fetchData();
        if (selectedBudget) {
          fetchBudgetDetails(selectedBudget.id);
        }
      }
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const handleCreateBudgetItem = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets/${selectedBudget.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, budget_id: selectedBudget.id })
      });

      if (response.ok) {
        toast.success('Budget item added');
        setShowItemDialog(false);
        fetchBudgetDetails(selectedBudget.id);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to add budget item');
      }
    } catch (error) {
      toast.error('Failed to add budget item');
    }
  };

  const fetchBudgetDetails = async (budgetId) => {
    try {
      const [budgetRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/api/marketing/v3/budgets/${budgetId}`),
        fetch(`${API_URL}/api/marketing/v3/budgets/${budgetId}/items`)
      ]);

      if (budgetRes.ok) setSelectedBudget(await budgetRes.json());
      if (itemsRes.ok) setBudgetItems(await itemsRes.json());
    } catch (error) {
      console.error('Error fetching budget details:', error);
    }
  };

  const handleViewBudget = async (budget) => {
    await fetchBudgetDetails(budget.id);
    setShowBudgetDetails(true);
  };

  const handleApproveBudget = async (budgetId) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets/${budgetId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Budget approved');
        fetchData();
        if (selectedBudget?.id === budgetId) {
          fetchBudgetDetails(budgetId);
        }
      }
    } catch (error) {
      toast.error('Failed to approve budget');
    }
  };

  const handleActivateBudget = async (budgetId) => {
    try {
      const response = await fetch(`${API_URL}/api/marketing/v3/budgets/${budgetId}/activate`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Budget activated');
        fetchData();
        if (selectedBudget?.id === budgetId) {
          fetchBudgetDetails(budgetId);
        }
      }
    } catch (error) {
      toast.error('Failed to activate budget');
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="budget-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Budget Management</h1>
          <p className="text-gray-500">Track and manage marketing spend across campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowExpenseDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </Button>
          <Button onClick={() => setShowBudgetDialog(true)} data-testid="create-budget-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wallet className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Allocated</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.total_allocated)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.total_spent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="text-xl font-bold">{formatCurrency(overview.total_remaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Utilization</p>
                  <p className="text-xl font-bold">{overview.overall_utilization.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-teal-500" />
                <div>
                  <p className="text-sm text-gray-500">Active Budgets</p>
                  <p className="text-xl font-bold">{overview.active_budgets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Overspent</p>
                  <p className="text-xl font-bold">{overview.overspent_budgets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">All Budgets</TabsTrigger>
          <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
        </TabsList>

        {/* Budgets Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Budget</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Period</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Spent</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Utilization</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {budgets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No budgets created yet
                        </td>
                      </tr>
                    ) : (
                      budgets.map(budget => {
                        const StatusIcon = STATUS_CONFIG[budget.status]?.icon || FileText;
                        const utilization = budget.utilization_percentage || 0;
                        
                        return (
                          <tr key={budget.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{budget.name}</p>
                                <p className="text-sm text-gray-500">FY {budget.fiscal_year}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="capitalize">{budget.period}</Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(budget.total_budget)}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrency(budget.spent_amount || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-24">
                                <Progress 
                                  value={utilization} 
                                  className={`h-2 ${utilization > 100 ? 'bg-red-100' : ''}`}
                                />
                                <p className={`text-xs mt-1 ${utilization > 90 ? 'text-red-500' : 'text-gray-500'}`}>
                                  {utilization.toFixed(1)}%
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={STATUS_CONFIG[budget.status]?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {STATUS_CONFIG[budget.status]?.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewBudget(budget)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {budget.status === 'draft' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleApproveBudget(budget.id)}
                                  >
                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                  </Button>
                                )}
                                {budget.status === 'approved' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleActivateBudget(budget.id)}
                                  >
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No expenses recorded yet
                        </td>
                      </tr>
                    ) : (
                      expenses.map(expense => (
                        <tr key={expense.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              {expense.vendor_name && (
                                <p className="text-sm text-gray-500">{expense.vendor_name}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">
                              {BUDGET_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(expense.expense_date)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={EXPENSE_STATUS_CONFIG[expense.status]?.color}>
                              {EXPENSE_STATUS_CONFIG[expense.status]?.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              {expense.status === 'pending' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleApproveExpense(expense.id)}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Budget Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Marketing Budget</DialogTitle>
            <DialogDescription>Set up a new budget allocation</DialogDescription>
          </DialogHeader>
          <CreateBudgetForm
            onSubmit={handleCreateBudget}
            onCancel={() => setShowBudgetDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Record Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>Log a new marketing expense</DialogDescription>
          </DialogHeader>
          <CreateExpenseForm
            budgets={budgets}
            onSubmit={handleCreateExpense}
            onCancel={() => setShowExpenseDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Budget Details Dialog */}
      <Dialog open={showBudgetDetails} onOpenChange={setShowBudgetDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBudget?.name}</DialogTitle>
            <DialogDescription>
              <Badge className={STATUS_CONFIG[selectedBudget?.status]?.color}>
                {STATUS_CONFIG[selectedBudget?.status]?.label}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          
          {selectedBudget && (
            <div className="space-y-6">
              {/* Budget Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedBudget.total_budget)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Allocated</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedBudget.allocated_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Spent</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedBudget.spent_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedBudget.remaining_amount)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Budget Line Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Budget Allocation by Category</h3>
                  <Button size="sm" onClick={() => setShowItemDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {budgetItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    No budget items yet. Add categories to allocate your budget.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {budgetItems.map(item => {
                      const spent = item.spent_amount || 0;
                      const allocated = item.allocated_amount || 0;
                      const utilization = allocated > 0 ? (spent / allocated * 100) : 0;
                      
                      return (
                        <div key={item.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <Badge variant="outline" className="text-xs">
                                {BUDGET_CATEGORIES.find(c => c.value === item.category)?.label}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(allocated)}</p>
                              <p className="text-sm text-gray-500">
                                Spent: {formatCurrency(spent)}
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(utilization, 100)} 
                            className={`h-2 ${utilization > 100 ? 'bg-red-100' : ''}`}
                          />
                          <p className={`text-xs mt-1 ${utilization > 90 ? 'text-red-500' : 'text-gray-500'}`}>
                            {utilization.toFixed(1)}% utilized
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Budget Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>Allocate budget to a category</DialogDescription>
          </DialogHeader>
          <CreateBudgetItemForm
            onSubmit={handleCreateBudgetItem}
            onCancel={() => setShowItemDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Budget Form
function CreateBudgetForm({ onSubmit, onCancel }) {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    period: 'quarterly',
    fiscal_year: currentYear,
    quarter: 1,
    start_date: '',
    end_date: '',
    total_budget: '',
    currency: 'INR'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.total_budget) {
      toast.error('Please fill in required fields');
      return;
    }
    
    const submitData = {
      ...formData,
      total_budget: parseFloat(formData.total_budget)
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Budget Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Q1 2026 Marketing Budget"
            data-testid="budget-name-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Period *</Label>
          <Select value={formData.period} onValueChange={(v) => setFormData({...formData, period: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="campaign">Campaign-Specific</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fiscal Year</Label>
          <Select value={formData.fiscal_year.toString()} onValueChange={(v) => setFormData({...formData, fiscal_year: parseInt(v)})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
              <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Total Budget (INR) *</Label>
          <Input
            type="number"
            value={formData.total_budget}
            onChange={(e) => setFormData({...formData, total_budget: e.target.value})}
            placeholder="5000000"
            data-testid="budget-amount-input"
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Budget description and objectives..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" data-testid="create-budget-submit">Create Budget</Button>
      </DialogFooter>
    </form>
  );
}

// Create Expense Form
function CreateExpenseForm({ budgets, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    budget_id: '',
    description: '',
    expense_type: 'ad_spend',
    category: 'digital_ads',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    invoice_number: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.budget_id || !formData.description || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }
    
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Budget *</Label>
          <Select value={formData.budget_id} onValueChange={(v) => setFormData({...formData, budget_id: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Description *</Label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="e.g., Meta Ads - January Campaign"
          />
        </div>

        <div className="space-y-2">
          <Label>Expense Type</Label>
          <Select value={formData.expense_type} onValueChange={(v) => setFormData({...formData, expense_type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount (INR) *</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            placeholder="250000"
          />
        </div>

        <div className="space-y-2">
          <Label>Expense Date</Label>
          <Input
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Vendor Name</Label>
          <Input
            value={formData.vendor_name}
            onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
            placeholder="e.g., Meta Platforms"
          />
        </div>

        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input
            value={formData.invoice_number}
            onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
            placeholder="INV-001"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Record Expense</Button>
      </DialogFooter>
    </form>
  );
}

// Create Budget Item Form
function CreateBudgetItemForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'digital_ads',
    allocated_amount: '',
    platform: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.allocated_amount) {
      toast.error('Please fill in required fields');
      return;
    }
    
    const submitData = {
      ...formData,
      allocated_amount: parseFloat(formData.allocated_amount)
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Item Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., Meta Ads (Facebook/Instagram)"
        />
      </div>

      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Allocated Amount (INR) *</Label>
        <Input
          type="number"
          value={formData.allocated_amount}
          onChange={(e) => setFormData({...formData, allocated_amount: e.target.value})}
          placeholder="2000000"
        />
      </div>

      <div className="space-y-2">
        <Label>Platform (Optional)</Label>
        <Input
          value={formData.platform}
          onChange={(e) => setFormData({...formData, platform: e.target.value})}
          placeholder="e.g., meta, google, youtube"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Item</Button>
      </DialogFooter>
    </form>
  );
}
