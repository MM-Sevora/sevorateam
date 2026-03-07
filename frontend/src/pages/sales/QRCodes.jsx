import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Scan,
  Users,
  Store,
  Scissors,
  Megaphone
} from 'lucide-react';

const LEAD_SOURCES = [
  { value: 'Event', label: 'Event' },
  { value: 'QR Code', label: 'QR Code (General)' },
  { value: 'Salon', label: 'Salon Partnership' },
  { value: 'Boutique Partner', label: 'Boutique Partner' },
  { value: 'Mall Activation', label: 'Mall Activation' },
  { value: 'Residential Popup', label: 'Residential Popup' },
  { value: 'Hoarding', label: 'Hoarding' },
  { value: 'Wedding Planner', label: 'Wedding Planner' },
];

const QRCodesPage = () => {
  const { api } = useAuth();
  const [qrCodes, setQrCodes] = useState([]);
  const [partners, setPartners] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQR, setNewQR] = useState({
    name: '',
    source_type: '',
    campaign: '',
    campaign_id: '',
    partner_id: '',
    location: '',
  });

  useEffect(() => {
    fetchQRCodes();
    fetchPartners();
    fetchCampaigns();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const response = await api.get('/qrcodes');
      setQrCodes(response.data);
    } catch (error) {
      toast.error('Failed to fetch QR codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners?status=Active');
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to fetch partners');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns?status=Active');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns');
    }
  };

  const handleCreateQR = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newQR,
        campaign_id: newQR.campaign_id || null,
        partner_id: newQR.partner_id || null,
      };
      await api.post('/qrcodes', payload);
      toast.success('QR code created successfully');
      setIsAddOpen(false);
      setNewQR({ name: '', source_type: '', campaign: '', campaign_id: '', partner_id: '', location: '' });
      fetchQRCodes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create QR code');
    }
  };

  const handleDownload = (qrCode) => {
    const link = document.createElement('a');
    link.href = qrCode.qr_image;
    link.download = `sevora-qr-${qrCode.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.click();
    toast.success('QR code downloaded');
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="p-8 space-y-6 animate-slide-in" data-testid="qrcodes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-foreground">QR Codes</h1>
          <p className="text-muted-foreground mt-1 font-body text-sm">Generate and track offline lead capture QR codes</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-qr-btn" className="rounded-sm uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Generate QR Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Generate QR Code</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateQR} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Name *</Label>
                <Input
                  data-testid="qr-name-input"
                  className="rounded-none"
                  placeholder="e.g., Lakme Salon Bandra QR"
                  value={newQR.name}
                  onChange={(e) => setNewQR({ ...newQR, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Source Type *</Label>
                <Select
                  value={newQR.source_type}
                  onValueChange={(value) => setNewQR({ ...newQR, source_type: value })}
                >
                  <SelectTrigger data-testid="qr-source-select" className="rounded-none">
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link to Partner */}
              {partners.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Link to Partner</Label>
                  <Select
                    value={newQR.partner_id || 'none'}
                    onValueChange={(value) => setNewQR({ ...newQR, partner_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="qr-partner-select" className="rounded-none">
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Partner</SelectItem>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          <div className="flex items-center gap-2">
                            {partner.partner_type === 'Salon' ? (
                              <Scissors className="w-3 h-3" />
                            ) : (
                              <Store className="w-3 h-3" />
                            )}
                            {partner.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Leads from this QR will be tagged to the partner</p>
                </div>
              )}

              {/* Link to Campaign */}
              {campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider">Link to Campaign</Label>
                  <Select
                    value={newQR.campaign_id || 'none'}
                    onValueChange={(value) => setNewQR({ ...newQR, campaign_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="qr-campaign-select" className="rounded-none">
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Campaign</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          <div className="flex items-center gap-2">
                            <Megaphone className="w-3 h-3" />
                            {campaign.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Leads from this QR will be tagged to the campaign</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Location (Optional)</Label>
                <Input
                  data-testid="qr-location-input"
                  className="rounded-none"
                  placeholder="e.g., Bandra West, Mumbai"
                  value={newQR.location}
                  onChange={(e) => setNewQR({ ...newQR, location: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                data-testid="submit-qr-btn"
                className="w-full rounded-sm uppercase tracking-wider text-xs"
                disabled={!newQR.name || !newQR.source_type}
              >
                Generate QR Code
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="qrcodes-grid">
        {qrCodes.map((qr) => (
          <Card key={qr.id} data-testid={`qr-card-${qr.id}`} className="card-sharp">
            {/* QR Image */}
            <div className="flex justify-center mb-4 p-4 bg-white border border-border">
              <img
                src={qr.qr_image}
                alt={`QR Code for ${qr.name}`}
                className="w-48 h-48 object-contain"
              />
            </div>

            {/* QR Details */}
            <div className="space-y-3">
              <div>
                <h3 className="font-heading text-lg">{qr.name}</h3>
                <Badge variant="outline" className="rounded-full text-xs mt-1">
                  {qr.source_type}
                </Badge>
              </div>

              {/* Partner Link */}
              {qr.partner_name && (
                <div className="flex items-center gap-2 text-sm bg-pink-50 p-2 border border-pink-200">
                  <Scissors className="w-4 h-4 text-pink-600" />
                  <span className="font-medium">{qr.partner_name}</span>
                </div>
              )}

              {/* Campaign Link */}
              {qr.campaign_name && (
                <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 border border-blue-200">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{qr.campaign_name}</span>
                </div>
              )}

              {qr.location && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Location:</span>{' '}
                  <span className="font-medium">{qr.location}</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-semibold">{qr.scan_count}</span> scans
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-semibold">{qr.leads_count}</span> leads
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-sm text-xs"
                  onClick={() => handleDownload(qr)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-sm text-xs"
                  onClick={() => handleCopyLink(qr.url)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {qrCodes.length === 0 && !loading && (
          <div className="col-span-full text-center py-12">
            <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No QR codes yet. Generate your first QR code for offline lead capture.</p>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <Card className="card-sharp">
        <h3 className="text-lg font-heading mb-4">How to Use QR Codes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-heading">
              1
            </div>
            <h4 className="font-medium">Generate</h4>
            <p className="text-sm text-muted-foreground">
              Create QR codes for events, popups, salons, or any offline marketing location
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-heading">
              2
            </div>
            <h4 className="font-medium">Deploy</h4>
            <p className="text-sm text-muted-foreground">
              Download and print QR codes for display at your marketing locations
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-heading">
              3
            </div>
            <h4 className="font-medium">Track</h4>
            <p className="text-sm text-muted-foreground">
              Monitor scans and leads captured from each QR code location
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QRCodesPage;
