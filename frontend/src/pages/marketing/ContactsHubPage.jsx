import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { 
  Search, Plus, Users, Star, MapPin, Instagram, Youtube, Twitter, Linkedin,
  Filter, Mail, Phone, Building2, Newspaper, PenTool, RefreshCw, Eye,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Trash2
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';

const CONTACT_TYPES = [
  { value: 'influencer', label: 'Influencer', icon: Users, color: 'bg-purple-100 text-purple-700' },
  { value: 'journalist', label: 'Journalist', icon: Newspaper, color: 'bg-blue-100 text-blue-700' },
  { value: 'blogger', label: 'Blogger', icon: PenTool, color: 'bg-green-100 text-green-700' },
  { value: 'hybrid', label: 'Hybrid', icon: Star, color: 'bg-amber-100 text-amber-700' },
];

const TIER_COLORS = {
  nano: 'bg-gray-100 text-gray-700',
  micro: 'bg-blue-100 text-blue-700',
  macro: 'bg-amber-100 text-amber-700',
  mega: 'bg-rose-100 text-rose-700',
  celebrity: 'bg-yellow-100 text-yellow-700'
};

const STATUS_COLORS = {
  identified: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-green-100 text-green-700',
  negotiating: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-700',
};

const ContactsHubPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ contact_type: '', status: '', city: '', added_by: '', tier: '' });
  const [sorting, setSorting] = useState({ sort_by: 'score', sort_order: 'desc' });
  const [filtersMeta, setFiltersMeta] = useState({ creators: [], cities: [], tiers: [], industries: [] });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState(null);
  
  const [newContact, setNewContact] = useState({
    name: '',
    contact_type: 'influencer',
    email: '',
    phone: '',
    instagram_handle: '',
    youtube_handle: '',
    twitter_handle: '',
    linkedin_url: '',
    city: '',
    country: 'India',
    industry: 'fashion',
    primary_platform: 'instagram',
    tier: 'micro',
    followers: 0,
    engagement_rate: 0,
    rate_per_post: '',
    rate_per_reel: '',
    publication: '',
    beat: '',
    editor_level: '',
    bio: '',
    notes: '',
  });

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        page_size: pagination.pageSize,
        sort_by: sorting.sort_by,
        sort_order: sorting.sort_order,
        ...(search && { search }),
        ...(filters.contact_type && { contact_type: filters.contact_type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.city && { city: filters.city }),
        ...(filters.added_by && { added_by: filters.added_by }),
        ...(filters.tier && { tier: filters.tier })
      });
      
      const response = await api.get(`/marketing/v2/contacts/paginated?${params.toString()}`);
      setContacts(response.data.contacts || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages
      }));
      if (response.data.filters_meta) {
        setFiltersMeta(response.data.filters_meta);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [api, pagination.page, pagination.pageSize, sorting, search, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSort = (field) => {
    setSorting(prev => ({
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const SortIcon = ({ field }) => {
    if (sorting.sort_by !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sorting.sort_order === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-[#4A3728]" />
      : <ArrowDown className="h-4 w-4 ml-1 text-[#4A3728]" />;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchContacts();
  };

  const handleAddContact = async () => {
    try {
      const contactData = {
        ...newContact,
        followers: parseInt(newContact.followers) || 0,
        engagement_rate: parseFloat(newContact.engagement_rate) || 0,
        rate_per_post: newContact.rate_per_post ? parseFloat(newContact.rate_per_post) : null,
        rate_per_reel: newContact.rate_per_reel ? parseFloat(newContact.rate_per_reel) : null,
      };
      
      await api.post('/marketing/v2/contacts', contactData);
      toast.success('Contact added successfully');
      setShowAddModal(false);
      setNewContact({
        name: '', contact_type: 'influencer', email: '', phone: '', instagram_handle: '',
        youtube_handle: '', twitter_handle: '', linkedin_url: '', city: '', country: 'India',
        industry: 'fashion', primary_platform: 'instagram', tier: 'micro', followers: 0,
        engagement_rate: 0, rate_per_post: '', rate_per_reel: '', publication: '', beat: '',
        editor_level: '', bio: '', notes: '',
      });
      fetchContacts();
      fetchStats();
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/marketing/v2/contacts/${contactId}`);
      toast.success('Contact deleted');
      fetchContacts();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  const getContactTypeConfig = (type) => CONTACT_TYPES.find(t => t.value === type) || CONTACT_TYPES[0];

  return (
    <div className="p-8 space-y-6" data-testid="contacts-hub-page" data-tour="marketing-contacts">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Contacts Hub</h1>
          <p className="text-[#5D4A3A] mt-1">Unified database of influencers, journalists & bloggers</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-amber-700 hover:bg-amber-800" data-testid="add-contact-btn" data-tour="add-influencer">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Contact Type</Label>
                <Select value={newContact.contact_type} onValueChange={v => setNewContact({...newContact, contact_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Full name" />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="email@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="+91 98765 43210" />
              </div>

              {/* Social handles */}
              <div>
                <Label>Instagram</Label>
                <Input value={newContact.instagram_handle} onChange={e => setNewContact({...newContact, instagram_handle: e.target.value})} placeholder="@handle" />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input value={newContact.youtube_handle} onChange={e => setNewContact({...newContact, youtube_handle: e.target.value})} placeholder="@channel" />
              </div>

              <div>
                <Label>City</Label>
                <Input value={newContact.city} onChange={e => setNewContact({...newContact, city: e.target.value})} placeholder="Mumbai" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={newContact.industry} onValueChange={v => setNewContact({...newContact, industry: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Influencer-specific fields */}
              {(newContact.contact_type === 'influencer' || newContact.contact_type === 'hybrid') && (
                <>
                  <div>
                    <Label>Tier</Label>
                    <Select value={newContact.tier} onValueChange={v => setNewContact({...newContact, tier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nano">Nano (&lt;10K)</SelectItem>
                        <SelectItem value="micro">Micro (10K-100K)</SelectItem>
                        <SelectItem value="macro">Macro (100K-1M)</SelectItem>
                        <SelectItem value="mega">Mega (1M-10M)</SelectItem>
                        <SelectItem value="celebrity">Celebrity (10M+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Followers</Label>
                    <Input type="number" value={newContact.followers} onChange={e => setNewContact({...newContact, followers: e.target.value})} placeholder="150000" />
                  </div>
                  <div>
                    <Label>Engagement Rate (%)</Label>
                    <Input type="number" step="0.1" value={newContact.engagement_rate} onChange={e => setNewContact({...newContact, engagement_rate: e.target.value})} placeholder="4.5" />
                  </div>
                  <div>
                    <Label>Rate per Reel (INR)</Label>
                    <Input type="number" value={newContact.rate_per_reel} onChange={e => setNewContact({...newContact, rate_per_reel: e.target.value})} placeholder="25000" />
                  </div>
                </>
              )}

              {/* Journalist/Blogger-specific fields */}
              {(newContact.contact_type === 'journalist' || newContact.contact_type === 'blogger' || newContact.contact_type === 'hybrid') && (
                <>
                  <div>
                    <Label>Publication</Label>
                    <Input value={newContact.publication} onChange={e => setNewContact({...newContact, publication: e.target.value})} placeholder="Vogue India" />
                  </div>
                  <div>
                    <Label>Beat/Focus</Label>
                    <Input value={newContact.beat} onChange={e => setNewContact({...newContact, beat: e.target.value})} placeholder="Fashion, Lifestyle" />
                  </div>
                  <div>
                    <Label>Editor Level</Label>
                    <Select value={newContact.editor_level} onValueChange={v => setNewContact({...newContact, editor_level: v})}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff Writer</SelectItem>
                        <SelectItem value="senior">Senior Writer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="senior_editor">Senior Editor</SelectItem>
                        <SelectItem value="editor_in_chief">Editor-in-Chief</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={newContact.notes} onChange={e => setNewContact({...newContact, notes: e.target.value})} placeholder="Additional notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddContact} className="bg-amber-700 hover:bg-amber-800">Add Contact</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-[#E8D5C4]">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-[#4A3728]">{stats.contacts.total}</div>
              <div className="text-sm text-[#5D4A3A]">Total Contacts</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-700">{stats.contacts.influencers}</div>
              <div className="text-sm text-purple-600">Influencers</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-700">{stats.contacts.journalists}</div>
              <div className="text-sm text-blue-600">Journalists</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-700">{stats.contacts.bloggers}</div>
              <div className="text-sm text-green-600">Bloggers</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-700">{stats.deals.active}</div>
              <div className="text-sm text-amber-600">Active Deals</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="border-[#E8D5C4] bg-white/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9C8C74]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-10 border-[#E8D5C4] focus:border-[#D4BBA6] focus:ring-[#D4BBA6]"
                />
              </div>
            </form>
            <Select value={filters.contact_type || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, contact_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[150px] border-[#E8D5C4]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTACT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[150px] border-[#E8D5C4]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.tier || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, tier: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[150px] border-[#E8D5C4]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {(filtersMeta.tiers?.length > 0 ? filtersMeta.tiers : ['nano', 'micro', 'macro', 'mega', 'celebrity']).map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.city || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, city: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[150px] border-[#E8D5C4]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filtersMeta.cities?.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.added_by || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, added_by: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-[180px] border-[#E8D5C4]">
                <SelectValue placeholder="Added by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {filtersMeta.creators?.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchContacts} className="border-[#E8D5C4]">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card className="border-[#E8D5C4]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('tier')}
                >
                  <div className="flex items-center">
                    Tier
                    <SortIcon field="tier" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('followers')}
                >
                  <div className="flex items-center">
                    Followers
                    <SortIcon field="followers" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('engagement_rate')}
                >
                  <div className="flex items-center">
                    Engagement
                    <SortIcon field="engagement_rate" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center">
                    City
                    <SortIcon field="city" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center">
                    Score
                    <SortIcon field="score" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Added by
                    <SortIcon field="created_at" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No contacts found. Add your first contact to get started.
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => {
                  const typeConfig = getContactTypeConfig(contact.contact_type);
                  return (
                    <TableRow key={contact.id} className="hover:bg-gray-50" data-testid={`contact-row-${contact.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeConfig.color}`}>
                            {contact.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-[#4A3728]">{contact.name}</div>
                            {contact.instagram_handle && (
                              <div className="text-xs text-[#5D4A3A] flex items-center gap-1">
                                <Instagram className="w-3 h-3" /> {contact.instagram_handle}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {contact.tier && <Badge className={TIER_COLORS[contact.tier] || TIER_COLORS.micro}>{contact.tier}</Badge>}
                      </TableCell>
                      <TableCell>
                        {contact.followers > 0 ? formatNumber(contact.followers) : '-'}
                      </TableCell>
                      <TableCell>
                        {contact.engagement_rate > 0 ? `${contact.engagement_rate}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {contact.city && (
                          <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                            <MapPin className="w-3 h-3" /> {contact.city}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[contact.status] || STATUS_COLORS.identified}>
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{contact.score || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {contact.created_by_name || '-'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/marketing/contacts/${contact.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteContact(contact.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} contacts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsHubPage;
