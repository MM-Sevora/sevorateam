import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import {
  CheckCircle2, ClipboardList, Zap, Bell, Activity, 
  Loader2, ChevronRight, Sparkles, ArrowRight, X
} from 'lucide-react';

/**
 * Post-Creation Integration Check Dialog
 * Shows what integrations were triggered and available actions after entity creation
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onOpenChange - Dialog state handler
 * @param {object} api - API instance
 * @param {string} module - Module name (sourcing, marketing, hr, sales)
 * @param {string} entityType - Entity type (brand, supplier, lead, employee)
 * @param {string} entityId - Entity ID
 * @param {string} entityName - Entity name for display
 * @param {function} onComplete - Callback after user acknowledges/completes
 */
export default function EntityIntegrationCheck({
  open,
  onOpenChange,
  api,
  module,
  entityType,
  entityId,
  entityName,
  onComplete
}) {
  const [loading, setLoading] = useState(true);
  const [integrationData, setIntegrationData] = useState(null);
  const [selectedActions, setSelectedActions] = useState([]);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (open && entityId) {
      checkIntegrations();
    }
  }, [open, entityId]);

  const checkIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.post('/integrations/check-entity', {
        module,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName
      });
      setIntegrationData(response.data);
    } catch (error) {
      console.error('Failed to check integrations:', error);
      toast.error('Failed to check integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerIntegration = async (integrationType) => {
    try {
      setTriggering(true);
      await api.post(`/integrations/trigger-integration?module=${module}&entity_type=${entityType}&entity_id=${entityId}&entity_name=${entityName}&integration_type=${integrationType}`);
      toast.success(`${integrationType} triggered successfully`);
      // Refresh integration data
      await checkIntegrations();
    } catch (error) {
      console.error('Failed to trigger integration:', error);
      toast.error('Failed to trigger integration');
    } finally {
      setTriggering(false);
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
    if (onComplete) {
      onComplete();
    }
  };

  const getIntegrationIcon = (type) => {
    switch (type) {
      case 'task':
      case 'operational_task':
        return ClipboardList;
      case 'automation':
        return Zap;
      case 'notification':
        return Bell;
      case 'activity':
        return Activity;
      default:
        return CheckCircle2;
    }
  };

  const getIntegrationColor = (type) => {
    switch (type) {
      case 'task':
      case 'operational_task':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'automation':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'notification':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'activity':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#5C4033] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Integration Check
          </DialogTitle>
          <DialogDescription className="text-[#8B7355]">
            <span className="font-medium text-[#5C4033]">{entityName}</span> has been created. 
            Here's what happened and what you can do next.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B7355]" />
          </div>
        ) : integrationData ? (
          <div className="space-y-4 py-4">
            {/* Entity Badge */}
            <div className="flex items-center gap-2 p-3 bg-[#F5EBE0] rounded-lg">
              <Badge className="bg-[#8B7355] text-white">{module}</Badge>
              <ArrowRight className="w-4 h-4 text-[#8B7355]" />
              <span className="font-medium text-[#5C4033]">{entityType}</span>
              <ArrowRight className="w-4 h-4 text-[#8B7355]" />
              <span className="text-[#5C4033]">{entityName}</span>
            </div>

            {/* Triggered Integrations */}
            {integrationData.integrations_triggered?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#5C4033] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Auto-Triggered
                </h4>
                <div className="space-y-2">
                  {integrationData.integrations_triggered.map((integration, idx) => {
                    const Icon = getIntegrationIcon(integration.integration_type);
                    const colorClass = getIntegrationColor(integration.integration_type);
                    return (
                      <Card key={idx} className="border-green-200 bg-green-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#5C4033] capitalize">
                              {integration.integration_type.replace('_', ' ')} {integration.action}
                            </p>
                            {integration.details?.title && (
                              <p className="text-xs text-[#8B7355]">{integration.details.title}</p>
                            )}
                            {integration.details?.message && (
                              <p className="text-xs text-[#8B7355]">{integration.details.message}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                            Done
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Integrations */}
            {integrationData.integrations_available?.filter(i => !i.auto_triggered).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#5C4033]">Available Actions</h4>
                <div className="space-y-2">
                  {integrationData.integrations_available.filter(i => !i.auto_triggered).map((integration, idx) => {
                    const Icon = getIntegrationIcon(integration.type);
                    const colorClass = getIntegrationColor(integration.type);
                    return (
                      <Card key={idx} className="border-[#DDD0C8]">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#5C4033]">{integration.name}</p>
                            <p className="text-xs text-[#8B7355]">{integration.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTriggerIntegration(integration.type)}
                            disabled={triggering}
                            className="border-[#8B7355] text-[#8B7355] hover:bg-[#F5EBE0]"
                          >
                            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Trigger'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {integrationData.recommendations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-[#5C4033]">Recommended Next Steps</h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <ul className="space-y-1">
                    {integrationData.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-amber-600" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* No integrations message */}
            {integrationData.integrations_triggered?.length === 0 && 
             integrationData.integrations_available?.length === 0 && (
              <div className="text-center py-4 text-[#8B7355]">
                <Activity className="w-8 h-8 mx-auto mb-2 text-[#DDD0C8]" />
                <p>No integrations configured for this entity type.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-[#8B7355]">
            <X className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p>Failed to load integration data</p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleComplete}
            className="bg-[#8B7355] hover:bg-[#5C4033] text-white"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
