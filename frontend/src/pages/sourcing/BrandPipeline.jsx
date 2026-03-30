import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Building2, ChevronLeft, ChevronRight, GripVertical, Mail, Phone, ExternalLink, Search, X } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'Discovery', color: 'bg-gray-500', label: 'Discovery' },
  { id: 'Contacted', color: 'bg-amber-500', label: 'Contacted' },
  { id: 'Qualified', color: 'bg-cyan-500', label: 'Qualified' },
  { id: 'Interested', color: 'bg-blue-500', label: 'Interested' },
  { id: 'Negotiation', color: 'bg-purple-500', label: 'Negotiation' },
  { id: 'Onboarded', color: 'bg-green-500', label: 'Onboarded' },
  { id: 'Lost', color: 'bg-red-500', label: 'Lost' }
];

const BrandPipeline = () => {
  const { api } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [brandsRes, analyticsRes] = await Promise.all([
        api.get('/sourcing/brands?limit=500'),
        api.get('/sourcing/brands/analytics/pipeline')
      ]);
      setBrands(brandsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  };

  // Filter brands by search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(brand => 
      brand.name?.toLowerCase().includes(query) ||
      brand.city?.toLowerCase().includes(query) ||
      brand.segment?.toLowerCase().includes(query) ||
      brand.division?.toLowerCase().includes(query)
    );
  }, [brands, searchQuery]);

  const moveBrand = async (brandId, newStage) => {
    try {
      await api.put(`/sourcing/brands/${brandId}/stage`, { pipeline_stage: newStage });
      toast.success(`Brand moved to ${newStage}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to move brand');
    }
  };

  const getBrandsByStage = (stage) => filteredBrands.filter(b => b.pipeline_stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="brand-pipeline-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Brand Pipeline
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8 w-64"
              data-testid="pipeline-search"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {analytics && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Total: <strong>{filteredBrands.length}</strong>{searchQuery && ` of ${brands.length}`}</span>
              <span className="text-green-600">Conversion: <strong>{analytics.conversion_rates?.qualified_to_onboarded}%</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageBrands = getBrandsByStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`${stage.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                <span className="font-medium">{stage.label}</span>
                <Badge variant="secondary" className="bg-white/20 text-white">{stageBrands.length}</Badge>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {stageBrands.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No brands</div>
                ) : (
                  stageBrands.map((brand) => (
                    <Card key={brand.id} className="cursor-move hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm truncate flex-1">{brand.name}</div>
                          <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{brand.city}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{brand.segment}</Badge>
                          {brand.fit_score > 0 && (
                            <span className={`text-xs font-medium ${brand.fit_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                              {brand.fit_score}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
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
                            {stage.id !== 'Discovery' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                                  if (idx > 0) moveBrand(brand.id, PIPELINE_STAGES[idx - 1].id);
                                }}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            )}
                            {stage.id !== 'Lost' && stage.id !== 'Onboarded' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                                  if (idx < PIPELINE_STAGES.length - 1) moveBrand(brand.id, PIPELINE_STAGES[idx + 1].id);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandPipeline;
