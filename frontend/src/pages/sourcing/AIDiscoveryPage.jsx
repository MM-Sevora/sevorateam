import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Sparkles, Play, MapPin, Tag, Building2, History, CheckCircle2, 
  AlertCircle, Globe, Star, ExternalLink, Plus, Loader2,
  Search, TrendingUp, Target
} from 'lucide-react';

const AIDiscoveryPage = () => {
  const { api } = useAuth();
  const [options, setOptions] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [config, setConfig] = useState({
    category: 'Womenswear',
    subcategories: [],
    segment: 'Affordable Luxury',
    city: '',
    count: 10
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [optionsRes, historyRes, statusRes] = await Promise.all([
        api.get('/sourcing/discovery/options'),
        api.get('/sourcing/discovery/history'),
        api.get('/sourcing/discovery/status')
      ]);
      setOptions(optionsRes.data);
      setHistory(historyRes.data);
      setServiceStatus(statusRes.data);
    } catch (error) {
      toast.error('Failed to fetch discovery options');
    } finally {
      setLoading(false);
    }
  };

  const runDiscovery = async () => {
    setRunning(true);
    setDiscoveryResults(null);
    try {
      const res = await api.post('/sourcing/discovery/run-now', config);
      toast.success(res.data.message);
      setDiscoveryResults(res.data);
      setShowResults(true);
      fetchData(); // Refresh history
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run discovery');
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFitScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#F5EBE0] min-h-screen" data-testid="ai-discovery-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#9C8C74] uppercase tracking-wider font-medium">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-[#4A3728] flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-orange-500" /> AI Brand Discovery
          </h1>
        </div>
        
        {/* Service Status */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          serviceStatus?.configured ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {serviceStatus?.configured ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">
            {serviceStatus?.configured ? 'AI Service Ready' : 'Service Not Configured'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList className="bg-[#E8D5C4]/50">
          <TabsTrigger value="discover" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Search className="h-4 w-4" /> Discover Brands
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Discovery Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" /> Discovery Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={config.category} onValueChange={(v) => setConfig(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {options?.categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Target Segment</label>
                      <Select value={config.segment} onValueChange={(v) => setConfig(prev => ({ ...prev, segment: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(options?.segments || {}).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">City (Optional)</label>
                      <Select value={config.city || 'all'} onValueChange={(v) => setConfig(prev => ({ ...prev, city: v === 'all' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="All Cities" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {options?.cities?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Brands to Discover</label>
                      <Select value={config.count.toString()} onValueChange={(v) => setConfig(prev => ({ ...prev, count: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 brands</SelectItem>
                          <SelectItem value="10">10 brands</SelectItem>
                          <SelectItem value="20">20 brands</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subcategories (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {options?.subcategories?.[config.category]?.map(sub => (
                        <Badge
                          key={sub}
                          variant={config.subcategories.includes(sub) ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-orange-100"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              subcategories: prev.subcategories.includes(sub)
                                ? prev.subcategories.filter(s => s !== sub)
                                : [...prev.subcategories, sub]
                            }));
                          }}
                        >
                          {sub}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={runDiscovery}
                    disabled={running || !serviceStatus?.configured}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 h-12"
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Discovering Brands...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" /> Run AI Discovery
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Discovery Results Preview */}
              {discoveryResults && discoveryResults.brands?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Discovery Results
                      </span>
                      <Badge variant="secondary">
                        {discoveryResults.stats?.new_brands_saved || 0} new brands saved
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {discoveryResults.brands.slice(0, 5).map((brand, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-medium">{brand.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                {brand.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{brand.city}</span>}
                                <span>{brand.segment}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1 font-semibold ${getFitScoreColor(brand.fit_score)}`}>
                              <Star className="h-4 w-4" /> {brand.fit_score}
                            </div>
                            {brand.website && (
                              <a href={brand.website} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {discoveryResults.brands.length > 5 && (
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        +{discoveryResults.brands.length - 5} more brands discovered
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" /> How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-600">1</span>
                    </div>
                    <p>Google searches for brands matching your criteria</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-600">2</span>
                    </div>
                    <p>AI analyzes results and extracts brand information</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-600">3</span>
                    </div>
                    <p>Brands are scored and added to your database</p>
                  </div>
                </CardContent>
              </Card>

              {/* Target Segments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Target Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {options?.target_segments?.map(seg => (
                      <div key={seg} className={`p-2 rounded-lg ${
                        config.segment === seg ? 'bg-orange-100 border border-orange-200' : 'bg-gray-50'
                      }`}>
                        <div className="font-medium text-sm">{seg}</div>
                        <div className="text-xs text-gray-500">₹{options?.segments?.[seg]?.price_range}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500">No discovery jobs yet</p>
                  ) : (
                    <div className="space-y-2">
                      {history.slice(0, 3).map(job => (
                        <div key={job.id} className="p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{job.category}</span>
                            <Badge className={getStatusColor(job.status)} variant="secondary">
                              {job.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {job.city || 'All cities'} • {job.found_count || 0} found
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Discovery History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No discovery jobs yet</p>
                  <p className="text-sm">Run your first AI discovery to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          job.status === 'completed' ? 'bg-green-100' :
                          job.status === 'running' ? 'bg-blue-100' :
                          job.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {job.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
                           job.status === 'running' ? <Loader2 className="h-5 w-5 text-blue-600 animate-spin" /> :
                           job.status === 'failed' ? <AlertCircle className="h-5 w-5 text-red-600" /> :
                           <History className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div>
                          <div className="font-medium">{job.category} - {job.segment}</div>
                          <div className="text-sm text-gray-500">
                            {job.city || 'All cities'} • Requested: {job.requested_count}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(job.status)} variant="secondary">
                          {job.status}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          {job.found_count > 0 && <span className="text-green-600 font-medium">{job.found_count} found</span>}
                          {job.saved_count > 0 && <span className="text-blue-600 ml-2">{job.saved_count} new</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(job.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIDiscoveryPage;
