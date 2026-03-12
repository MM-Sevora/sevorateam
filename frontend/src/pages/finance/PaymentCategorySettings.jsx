import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import {
  Settings, Plus, Edit, Trash2, Loader2, CheckCircle, Shield,
  Home, Zap, Users, Wrench, Receipt, Package, Briefcase, Car,
  ShoppingCart, GraduationCap, Heart, Wifi, Building2, FileText, Link
} from 'lucide-react';

const ICON_OPTIONS = [
  { value: 'Home', icon: Home, label: 'Home' },
  { value: 'Zap', icon: Zap, label: 'Utilities' },
  { value: 'Users', icon: Users, label: 'People' },
  { value: 'Wrench', icon: Wrench, label: 'Tools' },
  { value: 'Receipt', icon: Receipt, label: 'Receipt' },
  { value: 'Package', icon: Package, label: 'Package' },
  { value: 'Briefcase', icon: Briefcase, label: 'Business' },
  { value: 'Car', icon: Car, label: 'Transport' },
  { value: 'ShoppingCart', icon: ShoppingCart, label: 'Shopping' },
  { value: 'GraduationCap', icon: GraduationCap, label: 'Education' },
  { value: 'Heart', icon: Heart, label: 'Insurance' },
  { value: 'Wifi', icon: Wifi, label: 'Telecom' },
  { value: 'Building2', icon: Building2, label: 'Vendor' },
  { value: 'FileText', icon: FileText, label: 'Document' }
];

const ICON_MAP = {
  Home, Zap, Users, Wrench, Receipt, Package, Briefcase, Car,
  ShoppingCart, GraduationCap, Heart, Wifi, Building2, FileText
};

const MODULE_OPTIONS = [
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'operations', label: 'Operations' },
  { value: 'vendors', label: 'Vendors' }
];

const APPROVAL_LEVELS = ['manager', 'finance', 'director'];

const COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-700', label: 'Blue' },
  { value: 'bg-amber-100 text-amber-700', label: 'Amber' },
  { value: 'bg-emerald-100 text-emerald-700', label: 'Green' },
  { value: 'bg-purple-100 text-purple-700', label: 'Purple' },
  { value: 'bg-orange-100 text-orange-700', label: 'Orange' },
  { value: 'bg-indigo-100 text-indigo-700', label: 'Indigo' },
  { value: 'bg-teal-100 text-teal-700', label: 'Teal' },
  { value: 'bg-pink-100 text-pink-700', label: 'Pink' },
  { value: 'bg-cyan-100 text-cyan-700', label: 'Cyan' },
  { value: 'bg-rose-100 text-rose-700', label: 'Rose' },
  { value: 'bg-slate-100 text-slate-700', label: 'Slate' },
  { value: 'bg-gray-100 text-gray-700', label: 'Gray' }
];

const PaymentCategorySettings = () => {
  const { api } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    key: '', label: '', icon: 'FileText', color: 'bg-gray-100 text-gray-700',
    module: 'finance', sub_module: '', requires_approval: true,
    approval_levels: ['manager', 'finance'], link_path: ''
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/payment-categories');
      setCategories(res.data.categories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.key || !formData.label) {
        toast.error('Key and Label are required');
        return;
      }

      if (editingCategory) {
        await api.put(`/finance/payment-categories/${editingCategory.key}`, formData);
        toast.success('Category updated');
      } else {
        await api.post('/finance/payment-categories', formData);
        toast.success('Category created');
      }
      
      setShowDialog(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDelete = async (category) => {
    if (!confirm(`Delete category "${category.label}"?`)) return;
    try {
      await api.delete(`/finance/payment-categories/${category.key}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({
      key: category.key,
      label: category.label,
      icon: category.icon || 'FileText',
      color: category.color || 'bg-gray-100 text-gray-700',
      module: category.module,
      sub_module: category.sub_module || '',
      requires_approval: category.requires_approval,
      approval_levels: category.approval_levels || ['manager', 'finance'],
      link_path: category.link_path || ''
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      key: '', label: '', icon: 'FileText', color: 'bg-gray-100 text-gray-700',
      module: 'finance', sub_module: '', requires_approval: true,
      approval_levels: ['manager', 'finance'], link_path: ''
    });
  };

  const toggleApprovalLevel = (level) => {
    setFormData(f => {
      const levels = f.approval_levels.includes(level)
        ? f.approval_levels.filter(l => l !== level)
        : [...f.approval_levels, level];
      return { ...f, approval_levels: levels };
    });
  };

  const getIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="p-6 space-y-4 bg-[#FDF8F3] min-h-screen" data-testid="payment-category-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Payment Categories</h1>
          <p className="text-[#8B7355]">Configure payment types, approval workflows, and module mappings</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Settings className="w-6 h-6 mx-auto mb-2 text-[#4A3728]" />
            <p className="text-2xl font-bold text-[#4A3728]">{categories.length}</p>
            <p className="text-xs text-[#8B7355]">Total Categories</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{categories.filter(c => c.requires_approval).length}</p>
            <p className="text-xs text-[#8B7355]">Require Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{categories.filter(c => !c.requires_approval).length}</p>
            <p className="text-xs text-[#8B7355]">Auto-Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="p-4 text-center">
            <Link className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{categories.filter(c => c.link_path).length}</p>
            <p className="text-xs text-[#8B7355]">Module Linked</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F5EDE5]">
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Approval Levels</TableHead>
                  <TableHead>Link Path</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.key} className="hover:bg-[#FDF8F3]">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={cat.color || 'bg-gray-100 text-gray-700'}>
                          {getIcon(cat.icon)} <span className="ml-1">{cat.label}</span>
                        </Badge>
                        {cat.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[#8B7355]">{cat.key}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{cat.module}</Badge>
                      {cat.sub_module && <span className="text-xs text-[#8B7355] ml-1">/ {cat.sub_module}</span>}
                    </TableCell>
                    <TableCell>
                      {cat.requires_approval ? (
                        <Badge className="bg-emerald-50 text-emerald-700">Required</Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-500">Auto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cat.approval_levels?.map(level => (
                          <Badge key={level} variant="outline" className="text-xs capitalize">{level}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#8B7355]">{cat.link_path || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(cat)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(cat)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A3728]">{editingCategory ? 'Edit Category' : 'New Payment Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Key *</label>
                <Input 
                  value={formData.key} 
                  onChange={(e) => setFormData(f => ({...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} 
                  className="bg-white border-[#D4BBA6] font-mono" 
                  placeholder="category_key"
                  disabled={!!editingCategory}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Label *</label>
                <Input 
                  value={formData.label} 
                  onChange={(e) => setFormData(f => ({...f, label: e.target.value}))} 
                  className="bg-white border-[#D4BBA6]" 
                  placeholder="Display Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Icon</label>
                <Select value={formData.icon} onValueChange={(v) => setFormData(f => ({...f, icon: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2"><Icon className="w-4 h-4" /> {opt.label}</div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Color</label>
                <Select value={formData.color} onValueChange={(v) => setFormData(f => ({...f, color: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${opt.value}`}>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Module *</label>
                <Select value={formData.module} onValueChange={(v) => setFormData(f => ({...f, module: v}))}>
                  <SelectTrigger className="bg-white border-[#D4BBA6]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#4A3728]">Sub-Module</label>
                <Input 
                  value={formData.sub_module} 
                  onChange={(e) => setFormData(f => ({...f, sub_module: e.target.value}))} 
                  className="bg-white border-[#D4BBA6]" 
                  placeholder="e.g., payroll, travel"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4A3728]">Link Path (optional)</label>
              <Input 
                value={formData.link_path} 
                onChange={(e) => setFormData(f => ({...f, link_path: e.target.value}))} 
                className="bg-white border-[#D4BBA6]" 
                placeholder="/vendors/work-orders"
              />
              <p className="text-xs text-[#8B7355] mt-1">Route to navigate when viewing linked records</p>
            </div>

            <div className="p-3 bg-[#F5EDE5] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#4A3728]">Requires Approval</p>
                  <p className="text-xs text-[#8B7355]">Payment requests will need approval before processing</p>
                </div>
                <Switch 
                  checked={formData.requires_approval} 
                  onCheckedChange={(v) => setFormData(f => ({...f, requires_approval: v}))}
                />
              </div>

              {formData.requires_approval && (
                <div>
                  <p className="text-sm font-medium text-[#4A3728] mb-2">Approval Levels</p>
                  <div className="flex gap-2">
                    {APPROVAL_LEVELS.map(level => (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={formData.approval_levels.includes(level) ? "default" : "outline"}
                        onClick={() => toggleApprovalLevel(level)}
                        className={formData.approval_levels.includes(level) ? "bg-[#4A3728]" : "border-[#D4BBA6]"}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-[#8B7355] mt-2">
                    Approval order: {formData.approval_levels.join(' → ') || 'None'}
                  </p>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-2">Preview</p>
              <Badge className={formData.color}>
                {getIcon(formData.icon)} <span className="ml-1">{formData.label || 'Category Name'}</span>
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-[#D4BBA6]">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#4A3728] hover:bg-[#5D4A3A] text-white">
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentCategorySettings;
