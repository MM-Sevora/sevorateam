import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, RefreshCw, Save, Users, DollarSign, Target, Calendar,
  TrendingUp, Instagram, Youtube, UserPlus, UserMinus, Search,
  Play, Pause, CheckCircle2, Clock, Edit2, X
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'active', label: 'Active', icon: Play, color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Paused', icon: Pause, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-gray-100 text-gray-700' }
];

const CampaignDetailPage = () => {
  const { campaignId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Add Influencer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableInfluencers, setAvailableInfluencers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInfluencer, setAddingInfluencer] = useState(false);
  
  // Deliverable selection for adding influencer
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [influencerDeliverables, setInfluencerDeliverables] = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [agreedFee, setAgreedFee] = useState('');
  
  // Edit form
  const [form, setForm] = useState({
    name: '',
    objective: '',
    budget: 0,
    start_date: '',
    end_date: '',
    target_market: '',
    description: '',
    status: 'planning'
  });

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketing/campaigns/${campaignId}`);
      const data = response.data;
      setCampaign(data);
      setInfluencers(data.assigned_influencers || []);
      setForm({
        name: data.name || '',
        objective: data.objective || '',
        budget: data.budget || 0,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        target_market: data.target_market || '',
        description: data.description || '',
        status: data.status || 'planning'
      });
    } catch (error) {
      toast.error('Failed to load campaign');
      navigate('/marketing/campaigns');
    } finally {
      setLoading(false);
    }
  }, [api, campaignId, navigate]);

  const fetchAvailableInfluencers = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/contacts?contact_type=influencer');
      // Filter out influencers already assigned to this campaign
      const available = (response.data || []).filter(
        i => !i.campaign_id || i.campaign_id !== campaignId
      );
      setAvailableInfluencers(available);
    } catch (error) {
      console.log('Failed to fetch available influencers');
    }
  }, [api, campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableInfluencers();
    }
  }, [showAddModal, fetchAvailableInfluencers]);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/marketing/campaigns/${campaignId}`, form);
      toast.success('Campaign updated!');
      setHasChanges(false);
      setIsEditing(false);
      fetchCampaign();
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Fetch deliverables when an influencer is selected
  const handleSelectInfluencer = async (influencer) => {
    setSelectedInfluencer(influencer);
    setSelectedDeliverable(null);
    setAgreedFee('');
    
    try {
      const response = await api.get(`/marketing/v2/contacts/${influencer.id}/deliverables`);
      setInfluencerDeliverables(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliverables:', error);
      setInfluencerDeliverables([]);
    }
  };

  const handleConfirmAddInfluencer = async () => {
    if (!selectedInfluencer) return;
    
    setAddingInfluencer(true);
    try {
      const payload = {
        deliverable_id: selectedDeliverable?.id || null,
        deliverable_name: selectedDeliverable?.name || null,
        agreed_fee: parseFloat(agreedFee) || selectedDeliverable?.rate || 0
      };
      
      await api.post(`/marketing/campaigns/${campaignId}/influencers/${selectedInfluencer.id}`, payload);
      toast.success('Influencer added to campaign!');
      
      // Reset selection
      setSelectedInfluencer(null);
      setInfluencerDeliverables([]);
      setSelectedDeliverable(null);
      setAgreedFee('');
      
      fetchCampaign();
      fetchAvailableInfluencers();
    } catch (error) {
      toast.error('Failed to add influencer');
    } finally {
      setAddingInfluencer(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedInfluencer(null);
    setInfluencerDeliverables([]);
    setSelectedDeliverable(null);
    setAgreedFee('');
  };

  const handleAddInfluencer = async (contactId) => {
    setAddingInfluencer(true);
    try {
      await api.post(`/marketing/campaigns/${campaignId}/influencers/${contactId}`, {});
      toast.success('Influencer added to campaign!');
      fetchCampaign();
      fetchAvailableInfluencers();
    } catch (error) {
      toast.error('Failed to add influencer');
    } finally {
      setAddingInfluencer(false);
    }
  };

  const handleRemoveInfluencer = async (contactId) => {
    if (!window.confirm('Remove this influencer from the campaign?')) return;
    
    try {
      await api.delete(`/marketing/campaigns/${campaignId}/influencers/${contactId}`);
      toast.success('Influencer removed from campaign');
      fetchCampaign();
    } catch (error) {
      toast.error('Failed to remove influencer');
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const filteredAvailable = availableInfluencers.filter(i =>
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.instagram_handle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig = STATUS_OPTIONS.find(s => s.value === form.status) || STATUS_OPTIONS[0];
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen" data-testid="campaign-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/campaigns')} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{campaign?.name}</h1>
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-gray-500 capitalize">{campaign?.objective} Campaign</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); setHasChanges(false); fetchCampaign(); }}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saving}
                className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
              >
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit Campaign
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Campaign Details */}
        <div className="col-span-2 space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{influencers.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Influencers</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <Target className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{formatNumber(campaign?.metrics?.total_reach)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Reach</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{campaign?.metrics?.avg_engagement || 0}%</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Engagement</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(campaign?.budget)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Budget</div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Influencers */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Assigned Influencers ({influencers.length})
              </CardTitle>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                data-testid="add-influencer-btn"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add Influencer
              </Button>
            </CardHeader>
            <CardContent>
              {influencers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No influencers assigned yet</p>
                  <p className="text-gray-400 text-sm mt-1">Click "Add Influencer" to assign creators to this campaign</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {influencers.map(influencer => (
                    <div 
                      key={influencer.id} 
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/marketing/influencer/${influencer.id}`)}
                      data-testid={`influencer-row-${influencer.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                          {influencer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{influencer.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {influencer.instagram_handle && (
                              <span className="flex items-center gap-1">
                                <Instagram className="w-3 h-3 text-pink-500" />
                                {influencer.instagram_handle}
                              </span>
                            )}
                            {influencer.youtube_handle && (
                              <span className="flex items-center gap-1">
                                <Youtube className="w-3 h-3 text-red-500" />
                                {influencer.youtube_handle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Deliverable & Fee Info */}
                        {(influencer.campaign_deliverable_name || influencer.campaign_agreed_fee) && (
                          <div className="text-right border-r pr-4 mr-2">
                            {influencer.campaign_deliverable_name && (
                              <div className="text-sm font-medium text-amber-700">{influencer.campaign_deliverable_name}</div>
                            )}
                            {influencer.campaign_agreed_fee && (
                              <div className="text-xs text-gray-600">{formatCurrency(influencer.campaign_agreed_fee)}</div>
                            )}
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{formatNumber(influencer.followers)}</div>
                          <div className="text-xs text-gray-500">followers</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{influencer.engagement_rate?.toFixed(1) || 0}%</div>
                          <div className="text-xs text-gray-500">eng rate</div>
                        </div>
                        <Badge className="capitalize">{influencer.status}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); handleRemoveInfluencer(influencer.id); }}
                          data-testid={`remove-influencer-${influencer.id}`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Campaign Info */}
        <div className="space-y-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">NAME</Label>
                    <Input 
                      value={form.name} 
                      onChange={e => updateForm('name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">OBJECTIVE</Label>
                    <Select value={form.objective} onValueChange={v => updateForm('objective', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="branding">Branding</SelectItem>
                        <SelectItem value="awareness">Awareness</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="launch">Product Launch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">STATUS</Label>
                    <Select value={form.status} onValueChange={v => updateForm('status', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">BUDGET (₹)</Label>
                    <Input 
                      type="number"
                      value={form.budget} 
                      onChange={e => updateForm('budget', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">START DATE</Label>
                      <Input 
                        type="date"
                        value={form.start_date} 
                        onChange={e => updateForm('start_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-gray-500">END DATE</Label>
                      <Input 
                        type="date"
                        value={form.end_date} 
                        onChange={e => updateForm('end_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">TARGET MARKET</Label>
                    <Input 
                      value={form.target_market} 
                      onChange={e => updateForm('target_market', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-gray-500">DESCRIPTION</Label>
                    <Textarea 
                      value={form.description} 
                      onChange={e => updateForm('description', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Objective</span>
                    <span className="font-medium capitalize">{campaign?.objective}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium">{formatCurrency(campaign?.budget)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Spent</span>
                    <span className="font-medium">{formatCurrency(campaign?.spent)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Start Date</span>
                    <span className="font-medium">{campaign?.start_date || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">End Date</span>
                    <span className="font-medium">{campaign?.end_date || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Target Market</span>
                    <span className="font-medium">{campaign?.target_market || '-'}</span>
                  </div>
                  {campaign?.description && (
                    <div className="pt-2">
                      <span className="text-gray-500 text-sm">Description</span>
                      <p className="text-gray-700 mt-1">{campaign.description}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Budget Progress */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Budget Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Spent</span>
                  <span className="font-medium">{formatCurrency(campaign?.spent)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((campaign?.spent || 0) / (campaign?.budget || 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>{formatCurrency(campaign?.budget)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Influencer Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) handleCancelSelection();
      }}>
        <DialogContent className="max-w-2xl" data-testid="add-influencer-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              {selectedInfluencer ? `Add ${selectedInfluencer.name} to Campaign` : 'Add Influencers to Campaign'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {/* Show deliverable selection if an influencer is selected */}
            {selectedInfluencer ? (
              <div className="space-y-4">
                {/* Selected Influencer Info */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-lg">
                    {selectedInfluencer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedInfluencer.name}</div>
                    <div className="text-sm text-gray-600">
                      {selectedInfluencer.instagram_handle || selectedInfluencer.youtube_handle} • {formatNumber(selectedInfluencer.followers)} followers
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCancelSelection}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Deliverable Selection */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                    SELECT DELIVERABLE / RATE CARD
                  </Label>
                  {influencerDeliverables.length === 0 ? (
                    <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                      No rate cards configured for this influencer. You can still add with a custom fee.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {influencerDeliverables.map(d => (
                        <div 
                          key={d.id}
                          onClick={() => {
                            setSelectedDeliverable(d);
                            setAgreedFee(d.rate?.toString() || d.price?.toString() || '');
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedDeliverable?.id === d.id 
                              ? 'border-amber-500 bg-amber-50' 
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{d.name}</div>
                              {d.description && <div className="text-sm text-gray-500">{d.description}</div>}
                            </div>
                            <div className="text-lg font-bold text-amber-700">
                              {formatCurrency(d.rate || d.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fee Input */}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                    AGREED FEE (₹)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter agreed fee amount"
                    value={agreedFee}
                    onChange={e => setAgreedFee(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the final negotiated fee for this campaign
                  </p>
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleCancelSelection}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmAddInfluencer}
                    disabled={addingInfluencer}
                    className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                  >
                    {addingInfluencer ? 'Adding...' : 'Confirm & Add'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search influencers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-influencers-input"
                  />
                </div>
                
                {/* Available Influencers List */}
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredAvailable.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No matching influencers found' : 'All influencers are already assigned or no influencers available'}
                    </div>
                  ) : (
                    filteredAvailable.map(influencer => (
                      <div 
                        key={influencer.id}
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                            {influencer.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{influencer.name}</div>
                            <div className="text-sm text-gray-500">
                              {influencer.instagram_handle || influencer.youtube_handle} • {formatNumber(influencer.followers)} followers
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleSelectInfluencer(influencer)}
                          disabled={addingInfluencer}
                          className="bg-[#c4a35a] hover:bg-[#b39349] text-white"
                          data-testid={`select-btn-${influencer.id}`}
                        >
                          <UserPlus className="w-4 h-4 mr-1" /> Select
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignDetailPage;
