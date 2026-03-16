import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Building2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripVertical, Mail, Phone, 
  ExternalLink, FileText, Calendar, DollarSign, Search, Filter,
  Upload, Clock, CheckCircle2, AlertCircle, Eye, Users, Sparkles, Settings, Send
} from 'lucide-react';

const ONBOARDING_STAGES = [
  { 
    id: 'new_lead', 
    color: 'bg-slate-500', 
    label: 'New Lead', 
    icon: Building2,
    subStages: [
      { id: 'identified', label: 'Identified' },
      { id: 'researched', label: 'Researched' },
      { id: 'qualified', label: 'Qualified' }
    ]
  },
  { 
    id: 'contacted', 
    color: 'bg-amber-500', 
    label: 'Contacted', 
    icon: Mail,
    subStages: [
      { id: 'initial_outreach', label: 'Initial Outreach' },
      { id: 'follow_up_sent', label: 'Follow-up Sent' },
      { id: 'response_received', label: 'Response Received' }
    ]
  },
  { 
    id: 'negotiating', 
    color: 'bg-blue-500', 
    label: 'Negotiating', 
    icon: DollarSign,
    subStages: [
      { id: 'initial_discussion', label: 'Initial Discussion' },
      { id: 'terms_review', label: 'Terms Review' },
      { id: 'final_negotiation', label: 'Final Negotiation' }
    ]
  },
  { 
    id: 'agreement_sent', 
    color: 'bg-purple-500', 
    label: 'Agreement Sent', 
    icon: FileText,
    subStages: [
      { id: 'draft_shared', label: 'Draft Shared' },
      { id: 'awaiting_review', label: 'Awaiting Review' },
      { id: 'changes_requested', label: 'Changes Requested' }
    ]
  },
  { 
    id: 'agreement_signed', 
    color: 'bg-indigo-500', 
    label: 'Agreement Signed', 
    icon: CheckCircle2,
    subStages: [
      { id: 'signed', label: 'Signed' },
      { id: 'countersigned', label: 'Countersigned' }
    ]
  },
  { 
    id: 'onboarding', 
    color: 'bg-cyan-500', 
    label: 'Onboarding', 
    icon: Settings,
    subStages: [
      { id: 'documentation', label: 'Documentation' },
      { id: 'training_setup', label: 'Training/Setup' },
      { id: 'testing', label: 'Testing' }
    ]
  },
  { 
    id: 'active_partner', 
    color: 'bg-green-500', 
    label: 'Active Partner', 
    icon: CheckCircle2,
    subStages: [
      { id: 'active', label: 'Active' },
      { id: 'on_hold', label: 'On Hold' },
      { id: 'renewal_due', label: 'Renewal Due' }
    ]
  }
];

const BrandOnboardingPipeline = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [expandedStages, setExpandedStages] = useState({});
  const [agreementData, setAgreementData] = useState({
    commission_rate: '',
    payment_terms: '',
    contract_start_date: '',
    contract_end_date: '',
    agreement_notes: ''
  });

  useEffect(() => { 
    fetchBrands(); 
    // Expand all stages by default
    const expanded = {};
    ONBOARDING_STAGES.forEach(s => expanded[s.id] = true);
    setExpandedStages(expanded);
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await api.get('/sourcing/brands?limit=500');
      setBrands(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  const moveBrand = async (brandId, newStage, newSubStage = null) => {
    try {
      const updateData = { 
        onboarding_stage: newStage,
        stage_changed_at: new Date().toISOString()
      };
      if (newSubStage) {
        updateData.onboarding_sub_stage = newSubStage;
      }
      await api.put(`/sourcing/brands/${brandId}`, updateData);
      
      const stageName = ONBOARDING_STAGES.find(s => s.id === newStage)?.label;
      const subStageName = newSubStage ? ONBOARDING_STAGES.find(s => s.id === newStage)?.subStages.find(ss => ss.id === newSubStage)?.label : '';
      toast.success(`Moved to ${stageName}${subStageName ? ` - ${subStageName}` : ''}`);
      fetchBrands();
    } catch (error) {
      toast.error('Failed to move brand');
    }
  };

  const moveToSubStage = async (brandId, stageId, subStageId) => {
    try {
      await api.put(`/sourcing/brands/${brandId}`, { 
        onboarding_stage: stageId,
        onboarding_sub_stage: subStageId,
        stage_changed_at: new Date().toISOString()
      });
      const subStageName = ONBOARDING_STAGES.find(s => s.id === stageId)?.subStages.find(ss => ss.id === subStageId)?.label;
      toast.success(`Moved to ${subStageName}`);
      fetchBrands();
    } catch (error) {
      toast.error('Failed to update sub-stage');
    }
  };

  const toggleStageExpand = (stageId) => {
    setExpandedStages(prev => ({...prev, [stageId]: !prev[stageId]}));
  };

  const openAgreementModal = (brand) => {
    setSelectedBrand(brand);
    setAgreementData({
      commission_rate: brand.commission_rate || '',
      payment_terms: brand.payment_terms || '',
      contract_start_date: brand.contract_start_date || '',
      contract_end_date: brand.contract_end_date || '',
      agreement_notes: brand.agreement_notes || ''
    });
    setShowAgreementModal(true);
  };

  const saveAgreement = async (andSend = false) => {
    try {
      const updateData = {
        ...agreementData,
        agreement_status: 'draft',
        // Auto-move to Negotiating > Final Negotiation when agreement is drafted
        onboarding_stage: 'negotiating',
        onboarding_sub_stage: 'final_negotiation',
        stage_changed_at: new Date().toISOString()
      };
      
      if (andSend) {
        // If sending, update status and move to Agreement Sent stage
        updateData.agreement_status = 'sent';
        updateData.agreement_sent_date = new Date().toISOString();
        updateData.onboarding_stage = 'agreement_sent';
        updateData.onboarding_sub_stage = 'draft_shared';
      }
      
      await api.put(`/sourcing/brands/${selectedBrand.id}`, updateData);
      toast.success(andSend ? 'Agreement saved and marked as sent!' : 'Agreement details saved');
      setShowAgreementModal(false);
      fetchBrands();
    } catch (error) {
      toast.error('Failed to save agreement');
    }
  };

  const sendAgreement = async (brand) => {
    try {
      await api.put(`/sourcing/brands/${brand.id}`, {
        agreement_status: 'sent',
        agreement_sent_date: new Date().toISOString(),
        // Auto-move to Agreement Sent > Draft Shared
        onboarding_stage: 'agreement_sent',
        onboarding_sub_stage: 'draft_shared',
        stage_changed_at: new Date().toISOString()
      });
      toast.success('Agreement marked as sent!');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to send agreement');
    }
  };

  const markAgreementSigned = async (brand) => {
    try {
      await api.put(`/sourcing/brands/${brand.id}`, {
        agreement_status: 'signed',
        agreement_signed_date: new Date().toISOString(),
        // Auto-move to Agreement Signed > Signed
        onboarding_stage: 'agreement_signed',
        onboarding_sub_stage: 'signed',
        stage_changed_at: new Date().toISOString()
      });
      toast.success('Agreement marked as signed! Brand moved to Agreement Signed stage.');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to update agreement');
    }
  };

  const startOnboarding = async (brand) => {
    try {
      await api.put(`/sourcing/brands/${brand.id}`, {
        // Auto-move to Onboarding > Documentation
        onboarding_stage: 'onboarding',
        onboarding_sub_stage: 'documentation',
        stage_changed_at: new Date().toISOString()
      });
      toast.success('Onboarding started!');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to start onboarding');
    }
  };

  const markAsActivePartner = async (brand) => {
    try {
      await api.put(`/sourcing/brands/${brand.id}`, {
        // Auto-move to Active Partner > Active
        onboarding_stage: 'active_partner',
        onboarding_sub_stage: 'active',
        stage_changed_at: new Date().toISOString()
      });
      toast.success('Brand is now an Active Partner!');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to update brand');
    }
  };

  const getBrandsByStageAndSubStage = (stageId, subStageId = null) => {
    return brands.filter(b => {
      const stage = b.onboarding_stage || 'new_lead';
      const subStage = b.onboarding_sub_stage;
      
      if (stage !== stageId) return false;
      
      // If filtering by sub-stage
      if (subStageId) {
        return subStage === subStageId;
      }
      
      // If no sub-stage filter, return all in this stage
      return true;
    }).filter(b => 
      !searchQuery || 
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getAgreementStatusBadge = (brand) => {
    const status = brand.agreement_status;
    if (!status) return null;
    
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      sent: { color: 'bg-amber-100 text-amber-700', label: 'Sent' },
      signed: { color: 'bg-green-100 text-green-700', label: 'Signed' },
      expired: { color: 'bg-red-100 text-red-700', label: 'Expired' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  const getDaysInStage = (brand) => {
    const stageDate = brand.stage_changed_at || brand.created_at;
    if (!stageDate) return null;
    const days = Math.floor((new Date() - new Date(stageDate)) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getSubStageBadgeColor = (subStageId, stageColor) => {
    // Lighter version of stage color for sub-stage badges
    return stageColor.replace('bg-', 'bg-').replace('500', '100') + ' ' + stageColor.replace('bg-', 'text-').replace('500', '700');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="brand-onboarding-pipeline">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Brand Onboarding Pipeline
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" onClick={() => navigate('/sourcing/brands')}>
            <Building2 className="h-4 w-4 mr-2" /> All Brands
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-7 gap-2">
        {ONBOARDING_STAGES.map((stage) => {
          const count = getBrandsByStageAndSubStage(stage.id).length;
          return (
            <Card key={stage.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => toggleStageExpand(stage.id)}>
              <div className="flex items-center gap-2">
                <div className={`${stage.color} p-1.5 rounded`}>
                  <stage.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stage.label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
                {expandedStages[stage.id] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board with Sub-stages */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ONBOARDING_STAGES.map((stage, stageIndex) => {
          const stageBrands = getBrandsByStageAndSubStage(stage.id);
          const isExpanded = expandedStages[stage.id];
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              {/* Stage Header */}
              <div 
                className={`${stage.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between cursor-pointer`}
                onClick={() => toggleStageExpand(stage.id)}
              >
                <div className="flex items-center gap-2">
                  <stage.icon className="h-4 w-4" />
                  <span className="font-medium">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white">{stageBrands.length}</Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              
              {/* Stage Content */}
              <div className="bg-gray-100 rounded-b-lg min-h-[400px]">
                {isExpanded ? (
                  // Expanded view with sub-stages
                  <div className="p-2 space-y-3">
                    {stage.subStages.map((subStage, subIndex) => {
                      const subStageBrands = getBrandsByStageAndSubStage(stage.id, subStage.id);
                      return (
                        <div key={subStage.id} className="bg-white rounded-lg border border-gray-200">
                          {/* Sub-stage Header */}
                          <div className={`px-3 py-2 border-b border-gray-100 flex items-center justify-between ${stage.color.replace('500', '50')}`}>
                            <span className="text-sm font-medium text-gray-700">{subStage.label}</span>
                            <Badge variant="outline" className="text-xs">{subStageBrands.length}</Badge>
                          </div>
                          
                          {/* Sub-stage Cards */}
                          <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
                            {subStageBrands.length === 0 ? (
                              <div className="text-center py-3 text-gray-400 text-xs">No brands</div>
                            ) : (
                              subStageBrands.map((brand) => (
                                <BrandCard 
                                  key={brand.id}
                                  brand={brand}
                                  stage={stage}
                                  stageIndex={stageIndex}
                                  subStage={subStage}
                                  subIndex={subIndex}
                                  onMove={moveBrand}
                                  onMoveSubStage={moveToSubStage}
                                  onOpenAgreement={openAgreementModal}
                                  getAgreementStatusBadge={getAgreementStatusBadge}
                                  getDaysInStage={getDaysInStage}
                                  navigate={navigate}
                                  stages={ONBOARDING_STAGES}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Brands without sub-stage */}
                    {(() => {
                      const unassignedBrands = stageBrands.filter(b => !b.onboarding_sub_stage || !stage.subStages.find(ss => ss.id === b.onboarding_sub_stage));
                      if (unassignedBrands.length === 0) return null;
                      return (
                        <div className="bg-white rounded-lg border border-dashed border-gray-300">
                          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                            <span className="text-sm font-medium text-gray-500">Uncategorized</span>
                            <Badge variant="outline" className="ml-2 text-xs">{unassignedBrands.length}</Badge>
                          </div>
                          <div className="p-2 space-y-2 max-h-[150px] overflow-y-auto">
                            {unassignedBrands.map((brand) => (
                              <BrandCard 
                                key={brand.id}
                                brand={brand}
                                stage={stage}
                                stageIndex={stageIndex}
                                onMove={moveBrand}
                                onMoveSubStage={moveToSubStage}
                                onOpenAgreement={openAgreementModal}
                                getAgreementStatusBadge={getAgreementStatusBadge}
                                getDaysInStage={getDaysInStage}
                                navigate={navigate}
                                stages={ONBOARDING_STAGES}
                                showSubStageSelector
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  // Collapsed view - just show brand count
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-2xl font-bold">{stageBrands.length}</p>
                    <p className="text-sm">brands</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => toggleStageExpand(stage.id)}>
                      Expand
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agreement Modal */}
      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Agreement Details - {selectedBrand?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Commission Rate (%)</label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={agreementData.commission_rate}
                  onChange={(e) => setAgreementData({...agreementData, commission_rate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Payment Terms</label>
                <Select 
                  value={agreementData.payment_terms} 
                  onValueChange={(v) => setAgreementData({...agreementData, payment_terms: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Contract Start Date</label>
                <Input
                  type="date"
                  value={agreementData.contract_start_date}
                  onChange={(e) => setAgreementData({...agreementData, contract_start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contract End Date</label>
                <Input
                  type="date"
                  value={agreementData.contract_end_date}
                  onChange={(e) => setAgreementData({...agreementData, contract_end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Agreement Notes / Special Terms</label>
              <Textarea
                placeholder="Any special terms, exclusivity clauses, etc."
                value={agreementData.agreement_notes}
                onChange={(e) => setAgreementData({...agreementData, agreement_notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAgreementModal(false)}>Cancel</Button>
            <Button onClick={() => saveAgreement(false)} variant="outline">
              Save Draft
            </Button>
            <Button onClick={() => saveAgreement(true)} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" /> Save & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Brand Card Component
const BrandCard = ({ 
  brand, stage, stageIndex, subStage, subIndex, 
  onMove, onMoveSubStage, onOpenAgreement, 
  getAgreementStatusBadge, getDaysInStage, 
  navigate, stages, showSubStageSelector 
}) => {
  const [showSubStageMenu, setShowSubStageMenu] = useState(false);
  const daysInStage = getDaysInStage(brand);
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-2"
      style={{ borderLeftColor: stage.color.includes('slate') ? '#64748b' : stage.color.includes('amber') ? '#f59e0b' : stage.color.includes('blue') ? '#3b82f6' : stage.color.includes('purple') ? '#a855f7' : stage.color.includes('indigo') ? '#6366f1' : stage.color.includes('cyan') ? '#06b6d4' : '#22c55e' }}
      onClick={() => navigate(`/sourcing/brands/${brand.id}`)}
    >
      <CardContent className="p-2">
        <div className="flex items-start justify-between mb-1">
          <div className="font-medium text-xs truncate flex-1">{brand.name}</div>
        </div>
        
        <div className="text-xs text-gray-500 mb-1">{brand.city} • {brand.segment || 'N/A'}</div>
        
        <div className="flex items-center gap-1 flex-wrap mb-1">
          {getAgreementStatusBadge(brand)}
          {brand.commission_rate && (
            <Badge variant="outline" className="text-xs">
              {brand.commission_rate}%
            </Badge>
          )}
        </div>

        {daysInStage !== null && (
          <div className={`text-xs mb-1 flex items-center gap-1 ${daysInStage > 7 ? 'text-amber-600' : 'text-gray-400'}`}>
            <Clock className="h-3 w-3" />
            {daysInStage}d
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {brand.email && <Mail className="h-3 w-3 text-gray-400" />}
            {brand.phone_number && <Phone className="h-3 w-3 text-gray-400" />}
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Sub-stage selector */}
            {(showSubStageSelector || subStage) && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => { e.stopPropagation(); setShowSubStageMenu(!showSubStageMenu); }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {showSubStageMenu && (
                  <div className="absolute right-0 top-6 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                    {stage.subStages.map((ss) => (
                      <button
                        key={ss.id}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 ${brand.onboarding_sub_stage === ss.id ? 'bg-gray-50 font-medium' : ''}`}
                        onClick={() => { onMoveSubStage(brand.id, stage.id, ss.id); setShowSubStageMenu(false); }}
                      >
                        {ss.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Stage navigation */}
            {stageIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => { e.stopPropagation(); onMove(brand.id, stages[stageIndex - 1].id, stages[stageIndex - 1].subStages[0]?.id); }}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            )}
            {stageIndex < stages.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => { e.stopPropagation(); onMove(brand.id, stages[stageIndex + 1].id, stages[stageIndex + 1].subStages[0]?.id); }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandOnboardingPipeline;
