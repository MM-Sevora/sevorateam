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
  Building2, ChevronLeft, ChevronRight, GripVertical, Mail, Phone, 
  ExternalLink, FileText, Calendar, DollarSign, Search, Filter,
  Upload, Clock, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';

const ONBOARDING_STAGES = [
  { id: 'new_lead', color: 'bg-slate-500', label: 'New Lead', icon: Building2 },
  { id: 'contacted', color: 'bg-amber-500', label: 'Contacted', icon: Mail },
  { id: 'negotiating', color: 'bg-blue-500', label: 'Negotiating', icon: DollarSign },
  { id: 'agreement_sent', color: 'bg-purple-500', label: 'Agreement Sent', icon: FileText },
  { id: 'agreement_signed', color: 'bg-indigo-500', label: 'Agreement Signed', icon: CheckCircle2 },
  { id: 'onboarding', color: 'bg-cyan-500', label: 'Onboarding', icon: Clock },
  { id: 'active_partner', color: 'bg-green-500', label: 'Active Partner', icon: CheckCircle2 }
];

const BrandOnboardingPipeline = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementData, setAgreementData] = useState({
    commission_rate: '',
    payment_terms: '',
    contract_start_date: '',
    contract_end_date: '',
    agreement_notes: ''
  });

  useEffect(() => { fetchBrands(); }, []);

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

  const moveBrand = async (brandId, newStage) => {
    try {
      await api.put(`/sourcing/brands/${brandId}`, { onboarding_stage: newStage });
      toast.success(`Brand moved to ${ONBOARDING_STAGES.find(s => s.id === newStage)?.label}`);
      fetchBrands();
    } catch (error) {
      toast.error('Failed to move brand');
    }
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

  const saveAgreement = async () => {
    try {
      await api.put(`/sourcing/brands/${selectedBrand.id}`, {
        ...agreementData,
        agreement_status: 'draft'
      });
      toast.success('Agreement details saved');
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
        onboarding_stage: 'agreement_sent'
      });
      toast.success('Agreement marked as sent');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to update agreement status');
    }
  };

  const markAgreementSigned = async (brand) => {
    try {
      await api.put(`/sourcing/brands/${brand.id}`, { 
        agreement_status: 'signed',
        agreement_signed_date: new Date().toISOString(),
        onboarding_stage: 'agreement_signed'
      });
      toast.success('Agreement marked as signed!');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to update agreement status');
    }
  };

  const getBrandsByStage = (stageId) => {
    return brands.filter(b => {
      const stage = b.onboarding_stage || 'new_lead';
      return stage === stageId;
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-2">
        {ONBOARDING_STAGES.map((stage) => {
          const count = getBrandsByStage(stage.id).length;
          return (
            <Card key={stage.id} className="p-3">
              <div className="flex items-center gap-2">
                <div className={`${stage.color} p-1.5 rounded`}>
                  <stage.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stage.label}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ONBOARDING_STAGES.map((stage, stageIndex) => {
          const stageBrands = getBrandsByStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`${stage.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <stage.icon className="h-4 w-4" />
                  <span className="font-medium">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">{stageBrands.length}</Badge>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[500px] space-y-2">
                {stageBrands.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No brands</div>
                ) : (
                  stageBrands.map((brand) => {
                    const daysInStage = getDaysInStage(brand);
                    return (
                      <Card 
                        key={brand.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: stage.color.replace('bg-', '') }}
                        onClick={() => navigate(`/sourcing/brands/${brand.id}`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium text-sm truncate flex-1">{brand.name}</div>
                            <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">{brand.city} • {brand.division || 'N/A'}</div>
                          
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {brand.segment && (
                              <Badge variant="outline" className="text-xs">{brand.segment}</Badge>
                            )}
                            {getAgreementStatusBadge(brand)}
                          </div>

                          {/* Agreement Info */}
                          {brand.commission_rate && (
                            <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {brand.commission_rate}% commission
                            </div>
                          )}

                          {/* Days in stage */}
                          {daysInStage !== null && (
                            <div className={`text-xs mb-2 flex items-center gap-1 ${daysInStage > 7 ? 'text-amber-600' : 'text-gray-400'}`}>
                              <Clock className="h-3 w-3" />
                              {daysInStage} days in stage
                            </div>
                          )}

                          {/* Contact & Actions */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1">
                              {brand.email && <Mail className="h-3 w-3 text-gray-400" />}
                              {brand.phone_number && <Phone className="h-3 w-3 text-gray-400" />}
                              {brand.website && (
                                <a href={brand.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3 text-blue-400" />
                                </a>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {/* Stage Actions */}
                              {stage.id === 'negotiating' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => { e.stopPropagation(); openAgreementModal(brand); }}
                                >
                                  <FileText className="h-3 w-3 mr-1" /> Agreement
                                </Button>
                              )}
                              
                              {stage.id === 'agreement_sent' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-green-600"
                                  onClick={(e) => { e.stopPropagation(); markAgreementSigned(brand); }}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
                                </Button>
                              )}

                              {/* Navigation */}
                              {stageIndex > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => { e.stopPropagation(); moveBrand(brand.id, ONBOARDING_STAGES[stageIndex - 1].id); }}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                              )}
                              {stageIndex < ONBOARDING_STAGES.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => { e.stopPropagation(); moveBrand(brand.id, ONBOARDING_STAGES[stageIndex + 1].id); }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
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
            <Button onClick={saveAgreement} className="bg-orange-600 hover:bg-orange-700">
              Save Agreement
            </Button>
            {selectedBrand?.agreement_status === 'draft' && (
              <Button 
                onClick={() => { saveAgreement(); sendAgreement(selectedBrand); }}
                className="bg-green-600 hover:bg-green-700"
              >
                Save & Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandOnboardingPipeline;
