import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Play, MapPin, Tag, Building2, History } from 'lucide-react';

const AIDiscoveryPage = () => {
  const { api } = useAuth();
  const [options, setOptions] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
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
      const [optionsRes, historyRes] = await Promise.all([
        api.get('/sourcing/discovery/options'),
        api.get('/sourcing/discovery/history')
      ]);
      setOptions(optionsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Failed to fetch discovery options');
    } finally {
      setLoading(false);
    }
  };

  const runDiscovery = async () => {
    setRunning(true);
    try {
      const res = await api.post('/sourcing/discovery/run-now', config);
      toast.success(res.data.message);
      if (res.data.note) {
        toast.info(res.data.note, { duration: 5000 });
      }
      fetchData();
    } catch (error) {
      toast.error('Failed to run discovery');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ai-discovery-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider">Buying & Sourcing</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-orange-500" /> AI Discovery
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discovery Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Discovery Configuration
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
                  <label className="text-sm font-medium mb-2 block">Segment</label>
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
                      <SelectItem value="50">50 brands</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={runDiscovery}
                disabled={running}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {running ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Discovery...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Run AI Discovery
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Available Subcategories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" /> Subcategories for {config.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {options?.subcategories?.[config.category]?.map(sub => (
                  <Badge
                    key={sub}
                    variant={config.subcategories.includes(sub) ? 'default' : 'outline'}
                    className="cursor-pointer"
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Cities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Target Cities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {options?.cities?.slice(0, 10).map(city => (
                  <Badge key={city} variant="outline" className="text-xs">{city}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Segment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {options?.target_segments?.map(seg => (
                  <div key={seg} className="p-2 bg-orange-50 rounded-lg">
                    <div className="font-medium text-sm">{seg}</div>
                    <div className="text-xs text-gray-500">{options?.segments?.[seg]?.price_range}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Recent Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No discovery jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map(job => (
                    <div key={job.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                      <div className="font-medium">{job.category}</div>
                      <div className="text-xs text-gray-500">
                        {job.city || 'All cities'} • {job.segment}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIDiscoveryPage;
