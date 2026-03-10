import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, Settings, Plug, Database, Shield, Bell, Cloud, 
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Key, Globe, Mail, Calendar, Users, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import api from '../../lib/api';

const SystemsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    database: 'healthy',
    api: 'healthy',
    email: 'configured',
    calendar: 'connected',
    storage: 'healthy'
  });

  useEffect(() => {
    // Simulate loading system status
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const integrations = [
    {
      id: 'microsoft',
      name: 'Microsoft 365',
      description: 'Calendar, Teams, and email integration',
      icon: Calendar,
      status: 'connected',
      route: '/systems/integrations/microsoft'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Email delivery service',
      icon: Mail,
      status: 'configured',
      route: '/systems/integrations/email'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS and WhatsApp messaging',
      icon: Bell,
      status: 'pending',
      route: '/systems/integrations/messaging'
    },
    {
      id: 'openai',
      name: 'OpenAI / Emergent AI',
      description: 'AI-powered features and discovery',
      icon: Zap,
      status: 'connected',
      route: '/systems/integrations/ai'
    }
  ];

  const systemModules = [
    {
      id: 'config',
      name: 'System Configuration',
      description: 'General system settings and preferences',
      icon: Settings,
      route: '/systems/config'
    },
    {
      id: 'integrations',
      name: 'Integrations',
      description: 'Manage third-party service connections',
      icon: Plug,
      route: '/systems/integrations'
    },
    {
      id: 'security',
      name: 'Security Settings',
      description: 'Authentication, permissions, and access control',
      icon: Shield,
      route: '/admin/access-control'
    },
    {
      id: 'database',
      name: 'Database Management',
      description: 'Data backup, restore, and maintenance',
      icon: Database,
      route: '/systems/database'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'connected':
      case 'healthy':
      case 'configured':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'error':
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="systems-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Administration</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Server className="h-8 w-8 text-[#8B7355]" /> Systems
          </h1>
          <p className="text-[#6B5D52] mt-1">System configuration, integrations, and advanced settings</p>
        </div>
        <Button 
          variant="outline" 
          className="border-[#E8D5C4] text-[#4A3728] hover:bg-[#E8D5C4]/50"
          onClick={() => toast.info('Refreshing system status...')}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(systemStatus).map(([key, status]) => (
          <Card key={key} className="border-[#E8D5C4] bg-white/80">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status === 'healthy' || status === 'connected' || status === 'configured' 
                  ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {status === 'healthy' || status === 'connected' || status === 'configured' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#4A3728] capitalize">{key}</p>
                <p className="text-xs text-[#9C8C74] capitalize">{status}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Modules */}
      <div>
        <h2 className="text-lg font-semibold text-[#4A3728] mb-4">System Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemModules.map((module) => (
            <Card 
              key={module.id} 
              className="border-[#E8D5C4] bg-white/80 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(module.route)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[#E8D5C4]/50 flex items-center justify-center">
                    <module.icon className="h-6 w-6 text-[#4A3728]" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#9C8C74]" />
                </div>
                <h3 className="font-semibold text-[#4A3728] mb-1">{module.name}</h3>
                <p className="text-sm text-[#6B5D52]">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-[#4A3728] mb-4">Active Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <Card 
              key={integration.id} 
              className="border-[#E8D5C4] bg-white/80 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(integration.route)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#E8D5C4]/50 flex items-center justify-center">
                    <integration.icon className="h-6 w-6 text-[#4A3728]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-[#4A3728]">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                    </div>
                    <p className="text-sm text-[#6B5D52]">{integration.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#9C8C74]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-[#E8D5C4] bg-white/80">
        <CardHeader>
          <CardTitle className="text-lg text-[#4A3728]">Quick Actions</CardTitle>
          <CardDescription className="text-[#6B5D52]">Common system administration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-[#E8D5C4] text-[#4A3728]" onClick={() => navigate('/admin/access-control')}>
              <Key className="w-4 h-4 mr-2" /> Manage Permissions
            </Button>
            <Button variant="outline" className="border-[#E8D5C4] text-[#4A3728]" onClick={() => navigate('/admin/users')}>
              <Users className="w-4 h-4 mr-2" /> User Management
            </Button>
            <Button variant="outline" className="border-[#E8D5C4] text-[#4A3728]" onClick={() => navigate('/admin/website-settings')}>
              <Globe className="w-4 h-4 mr-2" /> Website Settings
            </Button>
            <Button variant="outline" className="border-[#E8D5C4] text-[#4A3728]" onClick={() => toast.info('Backup feature coming soon')}>
              <Cloud className="w-4 h-4 mr-2" /> Create Backup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemsPage;
