import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Plus, Edit, Trash2, MoreVertical, Loader2, ArrowLeft,
  CheckCircle, Archive, ChevronDown, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const FiscalYearCard = ({ fy, onEdit, onArchive, expanded, onToggle }) => {
  return (
    <Card className={`border-[#E8D5C4] ${fy.status === 'active' ? 'ring-2 ring-indigo-200' : ''}`}>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-[#4A3728]">{fy.name}</CardTitle>
                <p className="text-sm text-[#6B5D52]">
                  {formatDate(fy.start_date)} - {formatDate(fy.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={fy.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}>
                {fy.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Archive className="w-3 h-3 mr-1" />}
                {fy.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(fy)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {fy.status === 'active' && (
                    <DropdownMenuItem onClick={() => onArchive(fy)} className="text-amber-600">
                      <Archive className="w-4 h-4 mr-2" /> Archive
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t border-[#E8D5C4] pt-4">
              <h4 className="text-sm font-semibold text-[#4A3728] mb-3">Quarters</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fy.quarters?.map((quarter) => (
                  <div 
                    key={quarter.id} 
                    className="p-3 bg-[#FDF8F3] rounded-lg border border-[#E8D5C4]"
                  >
                    <p className="font-medium text-[#4A3728]">{quarter.name}</p>
                    <p className="text-xs text-[#6B5D52] mt-1">
                      {formatDate(quarter.start_date)} - {formatDate(quarter.end_date)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default function FiscalYears() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFY, setEditingFY] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'active'
  });

  const fetchFiscalYears = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/fiscal-years?include_quarters=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiscalYears(data);
        // Expand active FY by default
        const activeFY = data.find(fy => fy.status === 'active');
        if (activeFY) setExpandedId(activeFY.id);
      }
    } catch (error) {
      console.error('Failed to fetch fiscal years:', error);
      toast.error('Failed to load fiscal years');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiscalYears();
  }, [fetchFiscalYears]);

  const handleOpenModal = (fy = null) => {
    if (fy) {
      setEditingFY(fy);
      setFormData({
        name: fy.name,
        start_date: fy.start_date?.split('T')[0] || '',
        end_date: fy.end_date?.split('T')[0] || '',
        status: fy.status
      });
    } else {
      setEditingFY(null);
      // Default to next fiscal year starting April
      const now = new Date();
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setFormData({
        name: `FY ${startYear + 1}-${(startYear + 2).toString().slice(-2)}`,
        start_date: `${startYear + 1}-04-01`,
        end_date: `${startYear + 2}-03-31`,
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Fiscal year name is required');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('sevora_token');
      const method = editingFY ? 'PUT' : 'POST';
      const url = editingFY 
        ? `${API}/api/goals/fiscal-years/${editingFY.id}`
        : `${API}/api/goals/fiscal-years`;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingFY ? 'Fiscal year updated' : 'Fiscal year created with quarters');
        setShowModal(false);
        fetchFiscalYears();
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to save fiscal year');
      }
    } catch (error) {
      console.error('Failed to save fiscal year:', error);
      toast.error('Failed to save fiscal year');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (fy) => {
    if (!window.confirm(`Are you sure you want to archive "${fy.name}"? This will make it read-only.`)) return;

    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/goals/fiscal-years/${fy.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Fiscal year archived');
        fetchFiscalYears();
      } else {
        toast.error('Failed to archive fiscal year');
      }
    } catch (error) {
      console.error('Failed to archive fiscal year:', error);
      toast.error('Failed to archive fiscal year');
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="fiscal-years-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/goals')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#4A3728]">Fiscal Years</h1>
            <p className="text-[#6B5D52]">Manage company planning cycles</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Fiscal Year
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-[#E8D5C4] bg-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm text-[#4A3728] font-medium">About Fiscal Years</p>
              <p className="text-sm text-[#6B5D52] mt-1">
                When you create a fiscal year, four quarters (Q1-Q4) are automatically generated. 
                Strategic goals and objectives are then aligned to these fiscal years and quarters.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Years List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : fiscalYears.length === 0 ? (
        <Card className="border-[#E8D5C4]">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#4A3728] mb-2">No Fiscal Years</h3>
            <p className="text-[#6B5D52] mb-6">
              Create your first fiscal year to start defining strategic goals and objectives.
            </p>
            <Button 
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Fiscal Year
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filter Toggle */}
          {fiscalYears.some(fy => fy.status === 'archived') && (
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={`border-[#D4BBA6] ${showArchived ? 'bg-stone-100' : ''}`}
              >
                {showArchived ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showArchived ? 'Hide Archived' : `Show Archived (${fiscalYears.filter(fy => fy.status === 'archived').length})`}
              </Button>
            </div>
          )}
          
          {/* Active Fiscal Years */}
          {fiscalYears.filter(fy => fy.status !== 'archived').map(fy => (
            <FiscalYearCard 
              key={fy.id} 
              fy={fy}
              expanded={expandedId === fy.id}
              onToggle={() => setExpandedId(expandedId === fy.id ? null : fy.id)}
              onEdit={handleOpenModal}
              onArchive={handleArchive}
            />
          ))}
          
          {/* Archived Fiscal Years (hidden by default) */}
          {showArchived && fiscalYears.filter(fy => fy.status === 'archived').length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-2">
                <Archive className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-500">Archived</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
              {fiscalYears.filter(fy => fy.status === 'archived').map(fy => (
                <FiscalYearCard 
                  key={fy.id} 
                  fy={fy}
                  expanded={expandedId === fy.id}
                  onToggle={() => setExpandedId(expandedId === fy.id ? null : fy.id)}
                  onEdit={handleOpenModal}
                  onArchive={handleArchive}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {editingFY ? 'Edit Fiscal Year' : 'New Fiscal Year'}
            </DialogTitle>
            {!editingFY && (
              <DialogDescription>
                Creating a fiscal year will automatically generate Q1-Q4 quarters.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#4A3728]">Fiscal Year Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., FY 2026-27"
                className="mt-1.5 border-[#D4BBA6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#4A3728]">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1.5 border-[#D4BBA6]"
                />
              </div>
              <div>
                <Label className="text-[#4A3728]">End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1.5 border-[#D4BBA6]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[#4A3728]">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="mt-1.5 border-[#D4BBA6]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingFY ? 'Save Changes' : 'Create Fiscal Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
