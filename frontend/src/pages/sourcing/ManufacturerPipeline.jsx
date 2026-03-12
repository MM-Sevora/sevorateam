import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Factory, ChevronLeft, ChevronRight, GripVertical, Mail, Phone, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'Discovery', color: 'bg-gray-500', label: 'Discovery' },
  { id: 'Contacted', color: 'bg-amber-500', label: 'Contacted' },
  { id: 'Factory Visit', color: 'bg-cyan-500', label: 'Factory Visit' },
  { id: 'Sampling', color: 'bg-blue-500', label: 'Sampling' },
  { id: 'Production Trial', color: 'bg-purple-500', label: 'Production Trial' },
  { id: 'Active', color: 'bg-green-500', label: 'Active' },
  { id: 'Inactive', color: 'bg-red-500', label: 'Inactive' }
];

const ManufacturerPipeline = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [manufacturersRes, analyticsRes] = await Promise.all([
        api.get('/sourcing/manufacturers?limit=500'),
        api.get('/sourcing/manufacturers/analytics/summary')
      ]);
      setManufacturers(manufacturersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      toast.error('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const moveManufacturer = async (manufacturerId, newStage) => {
    try {
      await api.put(`/sourcing/manufacturers/${manufacturerId}/stage`, { pipeline_stage: newStage });
      toast.success(`Manufacturer moved to ${newStage}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to move manufacturer');
    }
  };

  const getManufacturersByStage = (stage) => manufacturers.filter(m => m.pipeline_stage === stage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="manufacturer-pipeline-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="h-8 w-8" /> Manufacturer Pipeline
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
          const stageManufacturers = getManufacturersByStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`${stage.color} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                <span className="font-medium">{stage.label}</span>
                <Badge variant="secondary" className="bg-white/20 text-white">{stageManufacturers.length}</Badge>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {stageManufacturers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No manufacturers</div>
                ) : (
                  stageManufacturers.map((manufacturer) => (
                    <Card 
                      key={manufacturer.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/sourcing/manufacturers/${manufacturer.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm truncate flex-1">{manufacturer.name}</div>
                          <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{manufacturer.city}, {manufacturer.country}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{manufacturer.manufacturer_type}</Badge>
                          {manufacturer.fit_score > 0 && (
                            <span className={`text-xs font-medium ${manufacturer.fit_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                              {manufacturer.fit_score}%
                            </span>
                          )}
                        </div>
                        {manufacturer.specialties && manufacturer.specialties.length > 0 && (
                          <div className="text-xs text-gray-400 mb-2 truncate">
                            {manufacturer.specialties.slice(0, 2).join(', ')}
                          </div>
                        )}
                        {manufacturer.moq > 0 && (
                          <div className="text-xs text-gray-400 mb-2">
                            MOQ: {manufacturer.moq} {manufacturer.moq_unit}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {manufacturer.email && <Mail className="h-3 w-3 text-gray-400" />}
                            {manufacturer.phone && <Phone className="h-3 w-3 text-gray-400" />}
                            {manufacturer.whatsapp && <MessageCircle className="h-3 w-3 text-green-400" />}
                            {manufacturer.website && (
                              <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
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
                                  if (idx > 0) moveManufacturer(manufacturer.id, PIPELINE_STAGES[idx - 1].id);
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
                                  if (idx < PIPELINE_STAGES.length - 1) moveManufacturer(manufacturer.id, PIPELINE_STAGES[idx + 1].id);
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

export default ManufacturerPipeline;
