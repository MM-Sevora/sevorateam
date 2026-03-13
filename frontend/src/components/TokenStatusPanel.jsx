import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PLATFORM_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
};

const PLATFORM_COLORS = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  youtube: 'bg-red-600',
  linkedin: 'bg-blue-700',
  twitter: 'bg-sky-500',
};

const WARNING_STYLES = {
  critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  caution: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  ok: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
};

const TokenStatusPanel = ({ showAlertOnly = false, onStatusChange }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState({});

  const fetchTokenStatus = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/social/integrations/tokens/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (onStatusChange) onStatusChange(data);
      }
    } catch (error) {
      console.error('Failed to fetch token status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
    // Check every 30 minutes
    const interval = setInterval(fetchTokenStatus, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (platform) => {
    setRefreshing(prev => ({ ...prev, [platform]: true }));
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/social/integrations/tokens/${platform}/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`${platform} token refreshed! Valid for ${data.expires_in ? Math.floor(data.expires_in / 86400) : 60} days.`);
        fetchTokenStatus();
      } else {
        toast.error(data.detail || `Failed to refresh ${platform} token`);
      }
    } catch (error) {
      toast.error(`Error refreshing ${platform} token`);
    } finally {
      setRefreshing(prev => ({ ...prev, [platform]: false }));
    }
  };

  if (loading) return null;
  if (!status) return null;

  const { platforms, summary } = status;
  const needsAttention = summary?.needs_attention;

  // Alert-only mode - show banner if tokens need attention
  if (showAlertOnly) {
    if (!needsAttention) return null;
    
    const criticalPlatforms = Object.entries(platforms || {})
      .filter(([_, p]) => p.warning_level === 'critical')
      .map(([name]) => name);
    
    const warningPlatforms = Object.entries(platforms || {})
      .filter(([_, p]) => p.warning_level === 'warning')
      .map(([name]) => name);

    return (
      <Alert variant="destructive" className="mb-4 border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Social Media Token Alert</AlertTitle>
        <AlertDescription className="text-amber-700">
          {criticalPlatforms.length > 0 && (
            <span className="block">
              <strong>Expired/Critical:</strong> {criticalPlatforms.join(', ')} - Token needs immediate refresh!
            </span>
          )}
          {warningPlatforms.length > 0 && (
            <span className="block">
              <strong>Expiring soon:</strong> {warningPlatforms.join(', ')} - Please refresh within 7 days.
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={() => window.location.href = '/admin/integrations'}
          >
            Manage Tokens <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Full panel mode
  return (
    <Card className="border-[#E8D5C4]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Social Media Token Status
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTokenStatus}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh Status
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        {summary && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="text-gray-600">
              {summary.total_connected} platform{summary.total_connected !== 1 ? 's' : ''} connected
            </span>
            {summary.critical_expiry > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {summary.critical_expiry} critical
              </Badge>
            )}
            {summary.warning_expiry > 0 && (
              <Badge className="bg-amber-100 text-amber-800">
                {summary.warning_expiry} warning
              </Badge>
            )}
            {!summary.needs_attention && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" /> All healthy
              </Badge>
            )}
          </div>
        )}

        {/* Platform Status Cards */}
        {Object.entries(platforms || {}).map(([platformName, platformStatus]) => {
          const Icon = PLATFORM_ICONS[platformName] || Clock;
          const warningStyle = WARNING_STYLES[platformStatus.warning_level] || WARNING_STYLES.ok;
          const isExpired = platformStatus.is_expired;
          const daysRemaining = platformStatus.days_remaining;
          const canRefresh = ['instagram', 'facebook'].includes(platformName);

          return (
            <div 
              key={platformName}
              className={`p-4 rounded-lg border ${warningStyle.bg} ${warningStyle.text}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${PLATFORM_COLORS[platformName] || 'bg-gray-500'} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{platformName}</p>
                    <p className="text-sm opacity-80">
                      {isExpired ? (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Token expired
                        </span>
                      ) : daysRemaining !== null ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> No expiry (permanent)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={warningStyle.badge}>
                    {platformStatus.warning_level || 'ok'}
                  </Badge>
                  {canRefresh && (
                    <Button
                      size="sm"
                      variant={isExpired ? "destructive" : "outline"}
                      onClick={() => handleRefresh(platformName)}
                      disabled={refreshing[platformName]}
                      className="text-xs"
                    >
                      {refreshing[platformName] ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {isExpired ? 'Reconnect' : 'Refresh'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {platformStatus.expires_at && (
                <p className="text-xs mt-2 opacity-70">
                  {isExpired ? 'Expired' : 'Expires'}: {new Date(platformStatus.expires_at).toLocaleDateString()} at {new Date(platformStatus.expires_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          );
        })}

        {Object.keys(platforms || {}).length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No social media platforms connected</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.href = '/admin/integrations'}
            >
              Connect Platforms
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border">
          <p className="font-semibold mb-1">Token Refresh Info:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Meta (Facebook/Instagram):</strong> Tokens can be refreshed to extend by 60 days. Refresh before expiry!</li>
            <li><strong>YouTube:</strong> Uses OAuth refresh tokens - typically auto-refreshes.</li>
            <li><strong>Critical:</strong> 3 days or less | <strong>Warning:</strong> 7 days or less</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenStatusPanel;
