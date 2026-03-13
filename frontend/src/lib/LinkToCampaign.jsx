import React, { useState, useEffect } from 'react';
import { Link2, Plus, X, Loader2, ExternalLink, Unlink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from './api';

/**
 * Link to Campaign Component
 * Allows linking any entity (influencer, lead, email, etc.) to a campaign
 * 
 * @param {Object} props
 * @param {string} props.entityType - Type of entity (influencer, lead, email, contact, brand)
 * @param {string} props.entityId - ID of the entity
 * @param {string} props.entityName - Display name of the entity
 * @param {string} props.variant - Button variant (default, outline, ghost)
 * @param {string} props.size - Button size (default, sm, lg)
 * @param {Function} props.onLink - Callback when link is created
 * @param {Function} props.onUnlink - Callback when link is removed
 */
const LinkToCampaign = ({ 
  entityType, 
  entityId, 
  entityName,
  variant = 'outline',
  size = 'sm',
  onLink,
  onUnlink,
  className = ''
}) => {
  const [showModal, setShowModal] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch available campaigns and existing links
  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, linksRes] = await Promise.all([
        api.get('/entity-links/campaigns'),
        api.get(`/entity-links/for-entity/${entityType}/${entityId}`)
      ]);
      
      setCampaigns(campaignsRes.data || []);
      
      // Filter to only campaign links
      const campaignLinks = (linksRes.data || []).filter(
        link => link.target_type === 'campaign' || link.source_type === 'campaign'
      );
      setLinkedCampaigns(campaignLinks);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchData();
    }
  }, [showModal, entityType, entityId]);

  // Create link
  const handleLink = async () => {
    if (!selectedCampaign) {
      toast.error('Please select a campaign');
      return;
    }

    setSaving(true);
    try {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      await api.post('/entity-links', {
        source_type: entityType,
        source_id: entityId,
        source_name: entityName,
        target_type: 'campaign',
        target_id: selectedCampaign,
        target_name: campaign?.name,
        link_type: 'related',
        notes: notes
      });
      
      toast.success(`Linked to ${campaign?.name}`);
      setSelectedCampaign('');
      setNotes('');
      fetchData();
      onLink?.();
    } catch (error) {
      console.error('Failed to create link:', error);
      toast.error(error.response?.data?.detail || 'Failed to create link');
    } finally {
      setSaving(false);
    }
  };

  // Remove link
  const handleUnlink = async (linkId) => {
    try {
      await api.delete(`/entity-links/${linkId}`);
      toast.success('Link removed');
      fetchData();
      onUnlink?.();
    } catch (error) {
      console.error('Failed to remove link:', error);
      toast.error('Failed to remove link');
    }
  };

  // Get campaigns not yet linked
  const availableCampaigns = campaigns.filter(
    c => !linkedCampaigns.some(link => 
      (link.target_type === 'campaign' && link.target_id === c.id) ||
      (link.source_type === 'campaign' && link.source_id === c.id)
    )
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className={`gap-1 ${className}`}
        data-testid={`link-campaign-btn-${entityId}`}
      >
        <Link2 className="h-3.5 w-3.5" />
        {linkedCampaigns.length > 0 ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {linkedCampaigns.length}
          </Badge>
        ) : (
          <span className="hidden sm:inline">Link</span>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              Link to Campaign
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Entity Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{entityType}</p>
                <p className="font-medium text-gray-900">{entityName || entityId}</p>
              </div>

              {/* Existing Links */}
              {linkedCampaigns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Linked Campaigns</Label>
                  <div className="space-y-1">
                    {linkedCampaigns.map(link => {
                      const campaignName = link.target_type === 'campaign' ? link.target_name : link.source_name;
                      const campaignId = link.target_type === 'campaign' ? link.target_id : link.source_id;
                      return (
                        <div key={link.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Campaign</Badge>
                            <span className="text-sm font-medium">{campaignName || campaignId}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleUnlink(link.id)}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Link */}
              {availableCampaigns.length > 0 ? (
                <div className="space-y-3 pt-2 border-t">
                  <Label>Add to Campaign</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger data-testid="campaign-select">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60">
                      {availableCampaigns.map(campaign => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {campaign.campaign_type}
                            </Badge>
                            {campaign.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Notes (optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a note about this link..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {campaigns.length === 0 
                    ? 'No campaigns available' 
                    : 'Already linked to all available campaigns'}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
            {availableCampaigns.length > 0 && (
              <Button 
                onClick={handleLink} 
                disabled={saving || !selectedCampaign}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="confirm-link-btn"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LinkToCampaign;
