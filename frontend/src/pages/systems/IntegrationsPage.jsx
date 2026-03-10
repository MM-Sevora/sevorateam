import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plug, Calendar, Mail, Bell, Zap, Database, Globe, 
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft, Settings,
  ExternalLink, RefreshCw, Key
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const integrations = [
    {
      id: 'microsoft',
      name: 'Microsoft 365',
      description: 'Calendar sync, Teams integration, and Outlook email',
      icon: Calendar,
      status: 'connected',
      category: 'productivity',
      features: ['Calendar Sync', 'Teams Meetings', 'Outlook Integration'],
      lastSync: '2 minutes ago'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Transactional and marketing email delivery',
      icon: Mail,
      status: 'configured',
      category: 'communication',
      features: ['Email Delivery', 'Templates', 'Analytics'],
      lastSync: '5 minutes ago'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS notifications and WhatsApp messaging',
      icon: Bell,
      status: 'pending',
      category: 'communication',
      features: ['SMS Alerts', 'WhatsApp', 'Voice Calls'],
      lastSync: 'Not configured'
    },
    {
      id: 'openai',
      name: 'OpenAI / Emergent AI',
      description: 'AI-powered brand discovery and content generation',
      icon: Zap,
      status: 'connected',
      category: 'ai',
      features: ['Brand Discovery', 'Content Generation', 'Smart Analysis'],
      lastSync: '1 minute ago'
    },
    {
      id: 'google',
      name: 'Google Search API',
      description: 'Web search for brand discovery',
      icon: Globe,
      status: 'configured',
      category: 'search',
      features: ['Web Search', 'Brand Research', 'Market Analysis'],
      lastSync: '10 minutes ago'
    },
    {
      id: 'mongodb',
      name: 'MongoDB Atlas',
      description: 'Cloud database for application data',
      icon: Database,
      status: 'connected',
      category: 'infrastructure',
      features: ['Data Storage', 'Backups', 'Analytics'],
      lastSync: 'Always connected'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'configured':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Configured</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" /> Pending Setup</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      productivity: 'Productivity',
      communication: 'Communication',
      ai: 'AI & ML',
      search: 'Search',
      infrastructure: 'Infrastructure'
    };
    return labels[category] || category;
  };

  const handleConfigure = (integration) => {
    setSelectedIntegration(integration);
    setShowConfigModal(true);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/systems')}
            className="text-[#4A3728] hover:bg-[#E8D5C4]/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Systems</p>
            <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
              <Plug className="h-8 w-8 text-[#8B7355]" /> Integrations
            </h1>
            <p className="text-[#6B5D52] mt-1">Manage third-party service connections</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="border-[#E8D5C4] text-[#4A3728] hover:bg-[#E8D5C4]/50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4] bg-white/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">
                {integrations.filter(i => i.status === 'connected').length}
              </p>
              <p className="text-sm text-[#9C8C74]">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4] bg-white/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">
                {integrations.filter(i => i.status === 'configured').length}
              </p>
              <p className="text-sm text-[#9C8C74]">Configured</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4] bg-white/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">
                {integrations.filter(i => i.status === 'pending').length}
              </p>
              <p className="text-sm text-[#9C8C74]">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4] bg-white/80">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8D5C4] flex items-center justify-center">
              <Plug className="h-5 w-5 text-[#4A3728]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4A3728]">{integrations.length}</p>
              <p className="text-sm text-[#9C8C74]">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="border-[#E8D5C4] bg-white/80">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#E8D5C4]/50 flex items-center justify-center flex-shrink-0">
                  <integration.icon className="h-7 w-7 text-[#4A3728]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#4A3728]">{integration.name}</h3>
                        {getStatusBadge(integration.status)}
                        <Badge variant="outline" className="text-xs">{getCategoryLabel(integration.category)}</Badge>
                      </div>
                      <p className="text-[#6B5D52] mt-1">{integration.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[#E8D5C4] text-[#4A3728]"
                        onClick={() => handleConfigure(integration)}
                      >
                        <Settings className="w-4 h-4 mr-1" /> Configure
                      </Button>
                      {integration.status !== 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-[#E8D5C4] text-[#4A3728]"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" /> Sync
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-[#F5EDE5] text-[#4A3728] text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-[#9C8C74] ml-auto">
                      Last sync: {integration.lastSync}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4A3728]">
              {selectedIntegration && <selectedIntegration.icon className="h-5 w-5" />}
              Configure {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription className="text-[#6B5D52]">
              Update integration settings and API credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#4A3728]">Enable Integration</Label>
                <p className="text-xs text-[#6B5D52]">Turn this integration on or off</p>
              </div>
              <Switch defaultChecked={selectedIntegration?.status !== 'pending'} />
            </div>
            <div className="space-y-2">
              <Label className="text-[#4A3728]">API Key</Label>
              <Input 
                type="password" 
                placeholder="Enter API key" 
                className="border-[#E8D5C4]"
                defaultValue="••••••••••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#4A3728]">Webhook URL</Label>
              <Input 
                placeholder="https://..." 
                className="border-[#E8D5C4]"
                defaultValue={`${window.location.origin}/api/webhooks/${selectedIntegration?.id}`}
                readOnly
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)} className="border-[#E8D5C4]">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                toast.success(`${selectedIntegration?.name} configuration saved`);
                setShowConfigModal(false);
              }}
              className="bg-[#4A3728] hover:bg-[#3A2A1E]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
