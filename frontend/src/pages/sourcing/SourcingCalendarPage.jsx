import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO 
} from 'date-fns';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, Building2, Package, Factory, Mail, Phone, User,
  CalendarDays, List, MoreVertical, Edit, Check
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

// Colors for different entity types
const ENTITY_COLORS = {
  brand: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', icon: Building2 },
  supplier: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', icon: Package },
  manufacturer: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', icon: Factory },
};

const SourcingCalendarPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    entity_type: 'brand',
    entity_id: '',
    entity_name: '',
    follow_up_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  const [entities, setEntities] = useState({ brands: [], suppliers: [], manufacturers: [] });

  useEffect(() => {
    fetchFollowUps();
    fetchEntities();
  }, [currentDate]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      // Fetch brands, suppliers, manufacturers with follow_up_date
      const [brandsRes, suppliersRes, manufacturersRes] = await Promise.all([
        api.get('/sourcing/brands?limit=500'),
        api.get('/sourcing/suppliers?limit=500'),
        api.get('/sourcing/manufacturers?limit=500')
      ]);

      const allFollowUps = [];
      
      // Process brands with follow-up dates
      (brandsRes.data || []).forEach(brand => {
        if (brand.follow_up_date) {
          allFollowUps.push({
            id: brand.id,
            entity_type: 'brand',
            entity_id: brand.id,
            entity_name: brand.name,
            follow_up_date: brand.follow_up_date,
            pipeline_stage: brand.pipeline_stage,
            email: brand.email,
            phone: brand.phone_number,
            city: brand.city
          });
        }
      });

      // Process suppliers with follow-up dates
      (suppliersRes.data || []).forEach(supplier => {
        if (supplier.follow_up_date) {
          allFollowUps.push({
            id: supplier.id,
            entity_type: 'supplier',
            entity_id: supplier.id,
            entity_name: supplier.name,
            follow_up_date: supplier.follow_up_date,
            pipeline_stage: supplier.pipeline_stage,
            email: supplier.email,
            phone: supplier.phone,
            city: supplier.city
          });
        }
      });

      // Process manufacturers with follow-up dates
      (manufacturersRes.data || []).forEach(mfg => {
        if (mfg.follow_up_date) {
          allFollowUps.push({
            id: mfg.id,
            entity_type: 'manufacturer',
            entity_id: mfg.id,
            entity_name: mfg.name,
            follow_up_date: mfg.follow_up_date,
            pipeline_stage: mfg.pipeline_stage,
            email: mfg.email,
            phone: mfg.phone,
            city: mfg.city
          });
        }
      });

      setFollowUps(allFollowUps);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      const [brandsRes, suppliersRes, manufacturersRes] = await Promise.all([
        api.get('/sourcing/brands?limit=100'),
        api.get('/sourcing/suppliers?limit=100'),
        api.get('/sourcing/manufacturers?limit=100')
      ]);
      setEntities({
        brands: brandsRes.data || [],
        suppliers: suppliersRes.data || [],
        manufacturers: manufacturersRes.data || []
      });
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  };

  const handleSetFollowUp = async () => {
    if (!newFollowUp.entity_id || !newFollowUp.follow_up_date) {
      toast.error('Please select an entity and date');
      return;
    }

    try {
      const endpoint = `/sourcing/${newFollowUp.entity_type}s/${newFollowUp.entity_id}`;
      await api.put(endpoint, { follow_up_date: newFollowUp.follow_up_date });
      toast.success('Follow-up scheduled');
      setShowAddModal(false);
      setNewFollowUp({
        entity_type: 'brand',
        entity_id: '',
        entity_name: '',
        follow_up_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      fetchFollowUps();
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const handleMarkComplete = async (followUp) => {
    try {
      const endpoint = `/sourcing/${followUp.entity_type}s/${followUp.entity_id}`;
      await api.put(endpoint, { follow_up_date: null }); // Clear follow-up
      toast.success('Follow-up marked as complete');
      fetchFollowUps();
      setSelectedFollowUp(null);
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const navigateToEntity = (followUp) => {
    navigate(`/sourcing/${followUp.entity_type}s/${followUp.entity_id}`);
  };

  // Calendar rendering functions
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="month" className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Month
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1">
              <List className="h-4 w-4" /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> Add Follow-up
        </Button>
      </div>
    </div>
  );

  const renderDaysOfWeek = () => (
    <div className="grid grid-cols-7 gap-1 mb-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
          {day}
        </div>
      ))}
    </div>
  );

  const getFollowUpsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return followUps.filter(f => f.follow_up_date === dateStr);
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayFollowUps = getFollowUpsForDate(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const cloneDay = day;

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] border rounded-lg p-1 ${
              !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isToday ? 'border-orange-400 border-2' : 'border-gray-200'}`}
          >
            <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-orange-600' : ''}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayFollowUps.slice(0, 3).map(followUp => {
                const color = ENTITY_COLORS[followUp.entity_type];
                const Icon = color.icon;
                return (
                  <div
                    key={followUp.id}
                    onClick={() => setSelectedFollowUp(followUp)}
                    className={`${color.bg} ${color.border} ${color.text} border-l-2 rounded px-1 py-0.5 text-xs truncate cursor-pointer hover:opacity-80`}
                  >
                    <Icon className="h-3 w-3 inline mr-1" />
                    {followUp.entity_name}
                  </div>
                );
              })}
              {dayFollowUps.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{dayFollowUps.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  const renderListView = () => {
    const sortedFollowUps = [...followUps].sort((a, b) => 
      new Date(a.follow_up_date) - new Date(b.follow_up_date)
    );
    
    const upcoming = sortedFollowUps.filter(f => new Date(f.follow_up_date) >= new Date());
    const overdue = sortedFollowUps.filter(f => new Date(f.follow_up_date) < new Date());

    return (
      <div className="space-y-6">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Overdue ({overdue.length})
            </h3>
            <div className="space-y-2">
              {overdue.map(followUp => {
                const color = ENTITY_COLORS[followUp.entity_type];
                const Icon = color.icon;
                return (
                  <Card key={followUp.id} className="border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${color.text}`} />
                        </div>
                        <div>
                          <p className="font-medium">{followUp.entity_name}</p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(followUp.follow_up_date), 'MMM d, yyyy')} • {followUp.pipeline_stage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigateToEntity(followUp)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkComplete(followUp)}>
                          <Check className="h-4 w-4 mr-1" /> Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Upcoming ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming follow-ups</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(followUp => {
                const color = ENTITY_COLORS[followUp.entity_type];
                const Icon = color.icon;
                return (
                  <Card key={followUp.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${color.text}`} />
                        </div>
                        <div>
                          <p className="font-medium">{followUp.entity_name}</p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(followUp.follow_up_date), 'MMM d, yyyy')} • {followUp.pipeline_stage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${color.bg} ${color.text}`}>
                          {followUp.entity_type}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => navigateToEntity(followUp)}>
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkComplete(followUp)}>
                          <Check className="h-4 w-4 mr-1" /> Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getEntityOptions = () => {
    switch (newFollowUp.entity_type) {
      case 'brand': return entities.brands;
      case 'supplier': return entities.suppliers;
      case 'manufacturer': return entities.manufacturers;
      default: return [];
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="sourcing-calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-orange-500" /> Follow-up Calendar
          </h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {followUps.filter(f => new Date(f.follow_up_date) < new Date()).length}
              </p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {followUps.filter(f => f.entity_type === 'brand').length}
              </p>
              <p className="text-sm text-gray-500">Brand Follow-ups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {followUps.filter(f => f.entity_type === 'supplier').length}
              </p>
              <p className="text-sm text-gray-500">Supplier Follow-ups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Factory className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {followUps.filter(f => f.entity_type === 'manufacturer').length}
              </p>
              <p className="text-sm text-gray-500">Manufacturer Follow-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {renderHeader()}
          
          {view === 'month' ? (
            <>
              {renderDaysOfWeek()}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : (
                renderCells()
              )}
            </>
          ) : (
            renderListView()
          )}
        </CardContent>
      </Card>

      {/* Follow-up Detail Modal */}
      <Dialog open={!!selectedFollowUp} onOpenChange={() => setSelectedFollowUp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFollowUp && (
                <>
                  {React.createElement(ENTITY_COLORS[selectedFollowUp.entity_type].icon, { className: 'h-5 w-5' })}
                  {selectedFollowUp.entity_name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFollowUp && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Badge className={ENTITY_COLORS[selectedFollowUp.entity_type].bg}>
                  {selectedFollowUp.entity_type}
                </Badge>
                <Badge variant="outline">{selectedFollowUp.pipeline_stage}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  {format(parseISO(selectedFollowUp.follow_up_date), 'MMMM d, yyyy')}
                </p>
                {selectedFollowUp.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedFollowUp.email}
                  </p>
                )}
                {selectedFollowUp.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selectedFollowUp.phone}
                  </p>
                )}
                {selectedFollowUp.city && (
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {selectedFollowUp.city}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleMarkComplete(selectedFollowUp)}>
              <Check className="h-4 w-4 mr-2" /> Mark Complete
            </Button>
            <Button onClick={() => navigateToEntity(selectedFollowUp)} className="bg-orange-600 hover:bg-orange-700">
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Entity Type</Label>
              <Select 
                value={newFollowUp.entity_type} 
                onValueChange={(v) => setNewFollowUp(prev => ({ ...prev, entity_type: v, entity_id: '', entity_name: '' }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select {newFollowUp.entity_type}</Label>
              <Select 
                value={newFollowUp.entity_id} 
                onValueChange={(v) => {
                  const entity = getEntityOptions().find(e => e.id === v);
                  setNewFollowUp(prev => ({ ...prev, entity_id: v, entity_name: entity?.name || '' }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder={`Select a ${newFollowUp.entity_type}`} /></SelectTrigger>
                <SelectContent>
                  {getEntityOptions().map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={newFollowUp.follow_up_date}
                onChange={(e) => setNewFollowUp(prev => ({ ...prev, follow_up_date: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSetFollowUp} className="bg-orange-600 hover:bg-orange-700">
              Schedule Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourcingCalendarPage;
