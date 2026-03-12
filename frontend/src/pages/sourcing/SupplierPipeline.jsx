import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Package, ChevronLeft, ChevronRight, GripVertical, Mail, Phone, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'Discovery', color: 'bg-gray-500', label: 'Discovery' },
  { id: 'Contacted', color: 'bg-amber-500', label: 'Contacted' },
  { id: 'Sampling', color: 'bg-cyan-500', label: 'Sampling' },
  { id: 'Evaluation', color: 'bg-blue-500', label: 'Evaluation' },
  { id: 'Negotiation', color: 'bg-purple-500', label: 'Negotiation' },
  { id: 'Active', color: 'bg-green-500', label: 'Active' },
  { id: 'Inactive', color: 'bg-red-500', label: 'Inactive' }
];

const SupplierPipeline = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, analyticsRes] = await Promise.all([
        api.get('/sourcing/suppliers?limit=500'),
        api.get('/sourcing/suppliers/analytics/summary')
      ]);
      setSuppliers(suppliersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      toast.error('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const moveSupplier = async (supplierId, newStage) => {
    try {
      await api.put(`/sourcing/suppliers/${supplierId}/stage`, { pipeline_stage: newStage });
      toast.success(`Supplier moved to ${newStage}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to move supplier');
    }
  };

  const getSuppliersByStage = (stage) => suppliers.filter(s => s.pipeline_stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="supplier-pipeline-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8" /> Supplier Pipeline
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {analytics && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Total: <strong>{analytics.total}</strong></span>
              <span className="text-green-600">Active: <strong>{analytics.active}</strong></span>
              <span className="text-blue-600">Sampling: <strong>{analytics.sampling}</strong></span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageSuppliers = getSuppliersByStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`${stage.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                <span className="font-medium">{stage.label}</span>
                <Badge variant="secondary" className="bg-white/20 text-white">{stageSuppliers.length}</Badge>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {stageSuppliers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No suppliers</div>
                ) : (
                  stageSuppliers.map((supplier) => (
                    <Card 
                      key={supplier.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/sourcing/suppliers/${supplier.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm truncate flex-1">{supplier.name}</div>
                          <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{supplier.city}, {supplier.country}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{supplier.supplier_type}</Badge>
                          {supplier.fit_score > 0 && (
                            <span className={`text-xs font-medium ${supplier.fit_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                              {supplier.fit_score}%
                            </span>
                          )}
                        </div>
                        {supplier.categories && supplier.categories.length > 0 && (
                          <div className="text-xs text-gray-400 mb-2 truncate">
                            {supplier.categories.slice(0, 2).join(', ')}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {supplier.email && <Mail className="h-3 w-3 text-gray-400" />}
                            {supplier.phone && <Phone className="h-3 w-3 text-gray-400" />}
                            {supplier.whatsapp && <MessageCircle className="h-3 w-3 text-green-400" />}
                            {supplier.website && (
                              <a href={supplier.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                                  if (idx > 0) moveSupplier(supplier.id, PIPELINE_STAGES[idx - 1].id);
                                }}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            )}
                            {stage.id !== 'Inactive' && stage.id !== 'Active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
                                  if (idx < PIPELINE_STAGES.length - 1) moveSupplier(supplier.id, PIPELINE_STAGES[idx + 1].id);
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

export default SupplierPipeline;
