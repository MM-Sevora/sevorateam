import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Search, Filter, Building2, Globe, Users, 
  TrendingUp, ExternalLink, Edit2, Trash2, ChevronRight, Newspaper,
  DollarSign, Mail, BarChart3, ArrowUpDown, ChevronUp, ChevronDown, X
} from 'lucide-react';

const PUBLICATION_TYPES = [
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'magazine', label: 'Magazine' },
  { value: 'online_publication', label: 'Online Publication' },
  { value: 'blog', label: 'Blog' },
  { value: 'news_wire', label: 'News Wire' },
  { value: 'trade_publication', label: 'Trade Publication' },
  { value: 'broadcast', label: 'Broadcast' },
];

const PUBLICATION_TIERS = [
  { value: 'tier_1', label: 'Tier 1', description: 'Top national/international (Vogue, Elle, GQ)', color: 'bg-purple-100 text-purple-700' },
  { value: 'tier_2', label: 'Tier 2', description: 'Major regional/industry (Femina, Grazia)', color: 'bg-blue-100 text-blue-700' },
  { value: 'tier_3', label: 'Tier 3', description: 'Niche/specialized', color: 'bg-green-100 text-green-700' },
  { value: 'tier_4', label: 'Tier 4', description: 'Local/emerging', color: 'bg-gray-100 text-gray-700' },
];

const BEATS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Business', 'Entertainment', 'Startup', 'Luxury', 'Travel', 'Food'];

const RELATIONSHIP_STATUS = [
  { value: 'new', label: 'New', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'dormant', label: 'Dormant', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-700' },
];

const PublicationsListPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterBeat, setFilterBeat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDA, setFilterDA] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Check if any filters are active
  const hasActiveFilters = filterType !== 'all' || filterTier !== 'all' || filterBeat !== 'all' || 
    filterStatus !== 'all' || filterDA !== 'all' || searchQuery;
  
  const clearAllFilters = () => {
    setFilterType('all');
    setFilterTier('all');
    setFilterBeat('all');
    setFilterStatus('all');
    setFilterDA('all');
    setSearchQuery('');
  };
  
  // Stats
  const [stats, setStats] = useState({ total: 0, tier1: 0, tier2: 0, journalists: 0, coverage: 0 });
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', publication_type: 'online_publication', tier: 'tier_2',
    website: '', description: '',
    domain_authority: '', monthly_traffic: '', monthly_readership: '', social_followers: '',
    audience_demographics: '', geographic_focus: [],
    beats_covered: [], content_types: [],
    advertorial_rate: '', sponsored_content_rate: '',
    general_email: '', editorial_email: '', pr_email: '', phone: '',
    instagram_handle: '', twitter_handle: '', linkedin_url: '',
    relationship_status: 'new', notes: ''
  });

  const fetchPublications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') params.publication_type = filterType;
      if (filterTier !== 'all') params.tier = filterTier;
      if (filterBeat !== 'all') params.beat = filterBeat;
      if (searchQuery) params.search = searchQuery;
      
      const response = await api.get('/marketing/v2/publications', { params });
      const data = response.data || [];
      setPublications(data);
      
      // Calculate stats
      const totalJournalists = data.reduce((sum, p) => sum + (p.journalist_count || 0), 0);
      const totalCoverage = data.reduce((sum, p) => sum + (p.coverage_count || 0), 0);
      setStats({
        total: data.length,
        tier1: data.filter(p => p.tier === 'tier_1').length,
        tier2: data.filter(p => p.tier === 'tier_2').length,
        journalists: totalJournalists,
        coverage: totalCoverage
      });
    } catch (error) {
      toast.error('Failed to load publications');
    } finally {
      setLoading(false);
    }
  }, [api, filterType, filterTier, filterBeat, searchQuery]);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Publication name is required');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        domain_authority: formData.domain_authority ? parseInt(formData.domain_authority) : null,
        monthly_traffic: formData.monthly_traffic ? parseInt(formData.monthly_traffic) : null,
        monthly_readership: formData.monthly_readership ? parseInt(formData.monthly_readership) : null,
        social_followers: formData.social_followers ? parseInt(formData.social_followers) : null,
        advertorial_rate: formData.advertorial_rate ? parseFloat(formData.advertorial_rate) : null,
        sponsored_content_rate: formData.sponsored_content_rate ? parseFloat(formData.sponsored_content_rate) : null,
      };
      
      if (editingId) {
        await api.put(`/marketing/v2/publications/${editingId}`, payload);
        toast.success('Publication updated');
      } else {
        await api.post('/marketing/v2/publications', payload);
        toast.success('Publication created');
      }
      
      setShowModal(false);
      resetForm();
      fetchPublications();
    } catch (error) {
      toast.error('Failed to save publication');
    }
  };

  const handleEdit = (pub) => {
    setEditingId(pub.id);
    setFormData({
      name: pub.name || '',
      publication_type: pub.publication_type || 'online_publication',
      tier: pub.tier || 'tier_2',
      website: pub.website || '',
      description: pub.description || '',
      domain_authority: pub.domain_authority?.toString() || '',
      monthly_traffic: pub.monthly_traffic?.toString() || '',
      monthly_readership: pub.monthly_readership?.toString() || '',
      social_followers: pub.social_followers?.toString() || '',
      audience_demographics: pub.audience_demographics || '',
      geographic_focus: pub.geographic_focus || [],
      beats_covered: pub.beats_covered || [],
      content_types: pub.content_types || [],
      advertorial_rate: pub.advertorial_rate?.toString() || '',
      sponsored_content_rate: pub.sponsored_content_rate?.toString() || '',
      general_email: pub.general_email || '',
      editorial_email: pub.editorial_email || '',
      pr_email: pub.pr_email || '',
      phone: pub.phone || '',
      instagram_handle: pub.instagram_handle || '',
      twitter_handle: pub.twitter_handle || '',
      linkedin_url: pub.linkedin_url || '',
      relationship_status: pub.relationship_status || 'new',
      notes: pub.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this publication? Journalists will be unlinked.')) return;
    try {
      await api.delete(`/marketing/v2/publications/${id}`);
      toast.success('Publication deleted');
      fetchPublications();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const response = await api.post('/marketing/v2/publications/bulk-delete', { ids: selectedIds });
      toast.success(`Deleted ${response.data.deleted_count} publications`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      fetchPublications();
    } catch (error) {
      toast.error('Failed to delete publications');
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', publication_type: 'online_publication', tier: 'tier_2',
      website: '', description: '',
      domain_authority: '', monthly_traffic: '', monthly_readership: '', social_followers: '',
      audience_demographics: '', geographic_focus: [],
      beats_covered: [], content_types: [],
      advertorial_rate: '', sponsored_content_rate: '',
      general_email: '', editorial_email: '', pr_email: '', phone: '',
      instagram_handle: '', twitter_handle: '', linkedin_url: '',
      relationship_status: 'new', notes: ''
    });
  };

  const toggleBeat = (beat) => {
    setFormData(prev => ({
      ...prev,
      beats_covered: prev.beats_covered.includes(beat)
        ? prev.beats_covered.filter(b => b !== beat)
        : [...prev.beats_covered, beat]
    }));
  };

  const formatNum = (n) => {
    if (!n) return '-';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n;
  };

  const getTierConfig = (tier) => PUBLICATION_TIERS.find(t => t.value === tier) || PUBLICATION_TIERS[1];
  const getStatusConfig = (status) => RELATIONSHIP_STATUS.find(s => s.value === status) || RELATIONSHIP_STATUS[0];

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortOrder === 'desc' ? 
      <ChevronDown className="w-3 h-3 text-gray-600" /> : 
      <ChevronUp className="w-3 h-3 text-gray-600" />;
  };

  // Filter and sort publications
  const filteredPublications = publications.filter(pub => {
    // Search filter
    const matchesSearch = !searchQuery || 
      pub.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.beats?.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Type filter
    const matchesType = filterType === 'all' || pub.type === filterType;
    
    // Tier filter
    const matchesTier = filterTier === 'all' || pub.tier === filterTier;
    
    // Beat filter
    const matchesBeat = filterBeat === 'all' || pub.beats?.includes(filterBeat);
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || pub.relationship_status === filterStatus;
    
    // DA filter
    let matchesDA = true;
    if (filterDA !== 'all') {
      const da = pub.domain_authority || 0;
      if (filterDA === 'high') matchesDA = da >= 70;
      else if (filterDA === 'medium') matchesDA = da >= 40 && da < 70;
      else if (filterDA === 'low') matchesDA = da < 40;
    }
    
    return matchesSearch && matchesType && matchesTier && matchesBeat && matchesStatus && matchesDA;
  }).sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'name') return multiplier * (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'tier') return multiplier * (a.tier || '').localeCompare(b.tier || '');
    if (sortBy === 'da') return multiplier * ((a.domain_authority || 0) - (b.domain_authority || 0));
    if (sortBy === 'traffic') return multiplier * ((a.monthly_traffic || 0) - (b.monthly_traffic || 0));
    if (sortBy === 'journalists') return multiplier * ((a.journalist_count || 0) - (b.journalist_count || 0));
    if (sortBy === 'coverage') return multiplier * ((a.coverage_count || 0) - (b.coverage_count || 0));
    return 0;
  });

  return (
    <div className="p-8 space-y-6" data-testid="publications-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">Media Database</p>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            Publications
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowBulkDeleteConfirm(true)}
              data-testid="bulk-delete-publications-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" onClick={fetchPublications} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => { resetForm(); setShowModal(true); }}
            data-testid="add-publication-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Publication
          </Button>
        </div>
      </div>

      {/* Stats Cards - Gradient Style */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">Publications</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">In database</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Tier 1</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.tier1}</p>
                <p className="text-xs text-gray-500 mt-1">Top media</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Tier 2</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.tier2}</p>
                <p className="text-xs text-gray-500 mt-1">Major media</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Journalists</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.journalists}</p>
                <p className="text-xs text-gray-500 mt-1">Contacts</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Coverages</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.coverage}</p>
                <p className="text-xs text-gray-500 mt-1">Total</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search publications, beats, journalists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
              data-testid="search-input"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PUBLICATION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {PUBLICATION_TIERS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBeat} onValueChange={setFilterBeat}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Beat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Beats</SelectItem>
              {BEATS.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {RELATIONSHIP_STATUS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : ''}
          >
            <Filter className="w-4 h-4 mr-1" /> More
          </Button>
        </div>
        
        {/* Advanced Filters Row */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
            <Select value={filterDA} onValueChange={setFilterDA}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Domain Authority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All DA Scores</SelectItem>
                <SelectItem value="high">High (70+)</SelectItem>
                <SelectItem value="medium">Medium (40-70)</SelectItem>
                <SelectItem value="low">Low (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-purple-700 hover:text-purple-800 hover:bg-purple-100"
              >
                <X className="w-4 h-4 mr-1" /> Clear All Filters
              </Button>
            )}
          </div>
        )}
        
        {/* Active Filters Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 px-1">
            {filterType !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
                Type: {PUBLICATION_TYPES.find(t => t.value === filterType)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterType('all')} />
              </Badge>
            )}
            {filterTier !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 gap-1">
                Tier: {PUBLICATION_TIERS.find(t => t.value === filterTier)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterTier('all')} />
              </Badge>
            )}
            {filterBeat !== 'all' && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                Beat: {filterBeat}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterBeat('all')} />
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1">
                Status: {RELATIONSHIP_STATUS.find(s => s.value === filterStatus)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </Badge>
            )}
            {filterDA !== 'all' && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 gap-1">
                DA: {filterDA}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterDA('all')} />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 gap-1">
                Search: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-gray-600">
          Showing <span className="font-medium text-gray-900">{publications.length}</span> publications
        </span>
      </div>

      {/* Publications Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="w-12 px-4">
                <Checkbox 
                  checked={selectedIds.length === filteredPublications.length && filteredPublications.length > 0}
                  onCheckedChange={(checked) => {
                    setSelectedIds(checked ? filteredPublications.map(p => p.id) : []);
                  }}
                />
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[250px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('name')}>
                <span className="flex items-center gap-1">Publication <SortIcon field="name" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[120px]">Type</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[80px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('tier')}>
                <span className="flex items-center gap-1">Tier <SortIcon field="tier" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[80px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('da')}>
                <span className="flex items-center gap-1">DA <SortIcon field="da" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('traffic')}>
                <span className="flex items-center gap-1">Traffic <SortIcon field="traffic" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[150px]">Beats</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('journalists')}>
                <span className="flex items-center gap-1">Journalists <SortIcon field="journalists" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[90px] cursor-pointer hover:text-gray-900" onClick={() => toggleSort('coverage')}>
                <span className="flex items-center gap-1">Coverage <SortIcon field="coverage" /></span>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[90px]">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {filteredPublications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">{loading ? 'Loading...' : 'No publications found'}</p>
                  <p className="text-gray-400 text-sm mt-1">Add your first publication to get started</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPublications.map(pub => {
                const tierConfig = getTierConfig(pub.tier);
                const statusConfig = getStatusConfig(pub.relationship_status);
                return (
                    <TableRow 
                      key={pub.id}
                      className="cursor-pointer hover:bg-purple-50/50 transition-colors"
                      data-testid={`publication-row-${pub.id}`}
                      onClick={() => navigate(`/marketing/publication/${pub.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.includes(pub.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(prev => 
                              checked ? [...prev, pub.id] : prev.filter(id => id !== pub.id)
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{pub.name}</div>
                            {pub.website && (
                              <a 
                                href={pub.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="w-3 h-3" />
                                {pub.website.replace(/^https?:\/\//, '').split('/')[0]}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 capitalize">
                          {pub.publication_type?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${tierConfig.color}`}>
                          {tierConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{pub.domain_authority || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatNum(pub.monthly_traffic)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(pub.beats_covered || []).slice(0, 2).map(beat => (
                            <Badge key={beat} variant="outline" className="text-xs">{beat}</Badge>
                          ))}
                          {(pub.beats_covered || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">+{pub.beats_covered.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span>{pub.journalist_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Newspaper className="w-3 h-3 text-gray-400" />
                          <span>{pub.coverage_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => { e.stopPropagation(); handleEdit(pub); }}
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDelete(pub.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              {editingId ? 'Edit Publication' : 'Add Publication'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Publication Name *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Vogue India"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Website</Label>
                  <Input 
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Type</Label>
                  <Select value={formData.publication_type} onValueChange={(v) => setFormData({ ...formData, publication_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PUBLICATION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Tier</Label>
                  <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PUBLICATION_TIERS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label} - {t.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Description</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the publication..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-2">Metrics (Equivalent to Influencer Followers)</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Domain Authority</Label>
                  <Input 
                    type="number"
                    value={formData.domain_authority}
                    onChange={(e) => setFormData({ ...formData, domain_authority: e.target.value })}
                    placeholder="1-100"
                    className="mt-1"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Monthly Traffic</Label>
                  <Input 
                    type="number"
                    value={formData.monthly_traffic}
                    onChange={(e) => setFormData({ ...formData, monthly_traffic: e.target.value })}
                    placeholder="e.g., 500000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Readership</Label>
                  <Input 
                    type="number"
                    value={formData.monthly_readership}
                    onChange={(e) => setFormData({ ...formData, monthly_readership: e.target.value })}
                    placeholder="e.g., 1000000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Social Followers</Label>
                  <Input 
                    type="number"
                    value={formData.social_followers}
                    onChange={(e) => setFormData({ ...formData, social_followers: e.target.value })}
                    placeholder="Combined"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Audience Demographics</Label>
                <Input 
                  value={formData.audience_demographics}
                  onChange={(e) => setFormData({ ...formData, audience_demographics: e.target.value })}
                  placeholder="e.g., Women 25-45, urban, affluent"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Editorial */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-2">Editorial Coverage</h3>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">Beats Covered</Label>
                <div className="flex flex-wrap gap-2">
                  {BEATS.map(beat => (
                    <Badge 
                      key={beat}
                      variant={formData.beats_covered.includes(beat) ? 'default' : 'outline'}
                      className={`cursor-pointer ${formData.beats_covered.includes(beat) ? 'bg-purple-600' : ''}`}
                      onClick={() => toggleBeat(beat)}
                    >
                      {beat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing (for paid PR) */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-2">Paid PR Rates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Advertorial Rate (₹)</Label>
                  <Input 
                    type="number"
                    value={formData.advertorial_rate}
                    onChange={(e) => setFormData({ ...formData, advertorial_rate: e.target.value })}
                    placeholder="e.g., 50000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Sponsored Content Rate (₹)</Label>
                  <Input 
                    type="number"
                    value={formData.sponsored_content_rate}
                    onChange={(e) => setFormData({ ...formData, sponsored_content_rate: e.target.value })}
                    placeholder="e.g., 75000"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">General Email</Label>
                  <Input 
                    type="email"
                    value={formData.general_email}
                    onChange={(e) => setFormData({ ...formData, general_email: e.target.value })}
                    placeholder="info@..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Editorial Email</Label>
                  <Input 
                    type="email"
                    value={formData.editorial_email}
                    onChange={(e) => setFormData({ ...formData, editorial_email: e.target.value })}
                    placeholder="editor@..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">PR Email</Label>
                  <Input 
                    type="email"
                    value={formData.pr_email}
                    onChange={(e) => setFormData({ ...formData, pr_email: e.target.value })}
                    placeholder="pr@..."
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Instagram</Label>
                  <Input 
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                    placeholder="@handle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Twitter</Label>
                  <Input 
                    value={formData.twitter_handle}
                    onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                    placeholder="@handle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500">Relationship Status</Label>
                  <Select value={formData.relationship_status} onValueChange={(v) => setFormData({ ...formData, relationship_status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_STATUS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">Notes</Label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white">
              {editingId ? 'Update Publication' : 'Add Publication'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Bulk Delete
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedIds.length}</strong> publication{selectedIds.length > 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-red-500 mt-2">This action cannot be undone. Journalists will be unlinked from deleted publications.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              data-testid="confirm-bulk-delete-publications-btn"
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Publication${selectedIds.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicationsListPage;
