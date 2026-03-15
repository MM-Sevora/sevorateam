import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Key, Save, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle,
  Instagram, Facebook, Youtube, Linkedin, Loader2, ExternalLink,
  Shield, Clock
} from 'lucide-react';

const APIKeysSettingsPage = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  
  const [settings, setSettings] = useState({
    meta: {
      app_id: '',
      app_secret: '',
      access_token: '',
      instagram_business_account_id: '',
      facebook_page_id: '',
      token_expires_at: null,
      last_verified: null
    },
    youtube: {
      api_key: '',
      client_id: '',
      client_secret: ''
    },
    linkedin: {
      client_id: '',
      client_secret: '',
      company_id: ''
    },
    google: {
      search_api_key: '',
      search_engine_id: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/api-keys');
      if (response.data) {
        setSettings(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/api-keys', settings);
      toast.success('API keys saved successfully!');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (platform) => {
    setTesting(prev => ({ ...prev, [platform]: true }));
    try {
      const response = await api.post(`/admin/api-keys/test/${platform}`);
      if (response.data.success) {
        toast.success(`${platform} connection verified!`);
      } else {
        toast.error(response.data.message || `${platform} connection failed`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to test ${platform} connection`);
    } finally {
      setTesting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const toggleShowSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSetting = (platform, field, value) => {
    setSettings(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="api-keys-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" /> API Keys & Tokens
          </h1>
          <p className="text-gray-500">Manage your social media and third-party API credentials</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="meta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" /> Meta (Instagram/Facebook)
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="w-4 h-4" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            <Linkedin className="w-4 h-4" /> LinkedIn
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Google Services
          </TabsTrigger>
        </TabsList>

        {/* Meta (Instagram/Facebook) Tab */}
        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="w-5 h-5 text-pink-500" />
                <Facebook className="w-5 h-5 text-blue-600" />
                Meta Platform Credentials
              </CardTitle>
              <CardDescription>
                Configure your Instagram and Facebook API access for content publishing and analytics.
                <a 
                  href="https://developers.facebook.com/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Get credentials <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Token Status */}
              {settings.meta.last_verified && (
                <div className={`p-4 rounded-lg flex items-center justify-between ${
                  settings.meta.token_expires_at && new Date(settings.meta.token_expires_at) > new Date()
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {settings.meta.token_expires_at && new Date(settings.meta.token_expires_at) > new Date() ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {settings.meta.token_expires_at && new Date(settings.meta.token_expires_at) > new Date()
                          ? 'Token Active'
                          : 'Token Expired'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {settings.meta.token_expires_at && (
                          <>Expires: {new Date(settings.meta.token_expires_at).toLocaleDateString()}</>
                        )}
                        {settings.meta.last_verified && (
                          <> | Last verified: {new Date(settings.meta.last_verified).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleTestConnection('meta')}
                    disabled={testing.meta}
                  >
                    {testing.meta ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Verify
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>App ID</Label>
                  <Input
                    value={settings.meta.app_id || ''}
                    onChange={(e) => updateSetting('meta', 'app_id', e.target.value)}
                    placeholder="Your Meta App ID"
                  />
                </div>
                <div>
                  <Label>App Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.meta_secret ? 'text' : 'password'}
                      value={settings.meta.app_secret || ''}
                      onChange={(e) => updateSetting('meta', 'app_secret', e.target.value)}
                      placeholder="Your Meta App Secret"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleShowSecret('meta_secret')}
                    >
                      {showSecrets.meta_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  Access Token
                  <Badge variant="outline" className="text-xs">Long-lived</Badge>
                </Label>
                <div className="relative">
                  <Input
                    type={showSecrets.meta_token ? 'text' : 'password'}
                    value={settings.meta.access_token || ''}
                    onChange={(e) => updateSetting('meta', 'access_token', e.target.value)}
                    placeholder="Your long-lived access token"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleShowSecret('meta_token')}
                  >
                    {showSecrets.meta_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get this from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Graph API Explorer</a> and exchange for a long-lived token.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Instagram Business Account ID</Label>
                  <Input
                    value={settings.meta.instagram_business_account_id || ''}
                    onChange={(e) => updateSetting('meta', 'instagram_business_account_id', e.target.value)}
                    placeholder="17841..."
                  />
                </div>
                <div>
                  <Label>Facebook Page ID</Label>
                  <Input
                    value={settings.meta.facebook_page_id || ''}
                    onChange={(e) => updateSetting('meta', 'facebook_page_id', e.target.value)}
                    placeholder="Your Facebook Page ID"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection('meta')}
                  disabled={testing.meta}
                >
                  {testing.meta ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-600" />
                YouTube API Credentials
              </CardTitle>
              <CardDescription>
                Configure YouTube Data API for video management.
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showSecrets.youtube_key ? 'text' : 'password'}
                    value={settings.youtube.api_key || ''}
                    onChange={(e) => updateSetting('youtube', 'api_key', e.target.value)}
                    placeholder="AIzaSy..."
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleShowSecret('youtube_key')}
                  >
                    {showSecrets.youtube_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>OAuth Client ID</Label>
                  <Input
                    value={settings.youtube.client_id || ''}
                    onChange={(e) => updateSetting('youtube', 'client_id', e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                  />
                </div>
                <div>
                  <Label>OAuth Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.youtube_secret ? 'text' : 'password'}
                      value={settings.youtube.client_secret || ''}
                      onChange={(e) => updateSetting('youtube', 'client_secret', e.target.value)}
                      placeholder="GOCSPX-..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleShowSecret('youtube_secret')}
                    >
                      {showSecrets.youtube_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleTestConnection('youtube')}
                disabled={testing.youtube}
              >
                {testing.youtube ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-700" />
                LinkedIn API Credentials
              </CardTitle>
              <CardDescription>
                Configure LinkedIn API for company page publishing.
                <a 
                  href="https://www.linkedin.com/developers/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  LinkedIn Developers <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client ID</Label>
                  <Input
                    value={settings.linkedin.client_id || ''}
                    onChange={(e) => updateSetting('linkedin', 'client_id', e.target.value)}
                    placeholder="Your LinkedIn App Client ID"
                  />
                </div>
                <div>
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.linkedin_secret ? 'text' : 'password'}
                      value={settings.linkedin.client_secret || ''}
                      onChange={(e) => updateSetting('linkedin', 'client_secret', e.target.value)}
                      placeholder="Your LinkedIn App Client Secret"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleShowSecret('linkedin_secret')}
                    >
                      {showSecrets.linkedin_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label>Company ID</Label>
                <Input
                  value={settings.linkedin.company_id || ''}
                  onChange={(e) => updateSetting('linkedin', 'company_id', e.target.value)}
                  placeholder="Your LinkedIn Company/Organization ID"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleTestConnection('linkedin')}
                disabled={testing.linkedin}
              >
                {testing.linkedin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Services Tab */}
        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Google Services
              </CardTitle>
              <CardDescription>
                Configure Google Custom Search API for AI Influencer Discovery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custom Search API Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.google_key ? 'text' : 'password'}
                      value={settings.google.search_api_key || ''}
                      onChange={(e) => updateSetting('google', 'search_api_key', e.target.value)}
                      placeholder="AIzaSy..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleShowSecret('google_key')}
                    >
                      {showSecrets.google_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Search Engine ID (CX)</Label>
                  <Input
                    value={settings.google.search_engine_id || ''}
                    onChange={(e) => updateSetting('google', 'search_engine_id', e.target.value)}
                    placeholder="Your Custom Search Engine ID"
                  />
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleTestConnection('google')}
                disabled={testing.google}
              >
                {testing.google ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button at bottom */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save All API Keys
        </Button>
      </div>
    </div>
  );
};

export default APIKeysSettingsPage;
