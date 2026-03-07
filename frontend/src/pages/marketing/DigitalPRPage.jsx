import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, Newspaper, Send, Plus, ExternalLink, Clock, CheckCircle,
  TrendingUp, Eye, ThumbsUp, AlertCircle, RefreshCw
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  distributed: 'bg-purple-100 text-purple-700',
  published: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-amber-100 text-amber-700',
  responded: 'bg-green-100 text-green-700',
  interested: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
};

const SENTIMENT_COLORS = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-100 text-red-700',
};

const DigitalPRPage = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('releases');
  const [releases, setReleases] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  
  // Forms
  const [newRelease, setNewRelease] = useState({
    title: '', subtitle: '', body: '', boilerplate: '', target_publications: ''
  });
  const [newCoverage, setNewCoverage] = useState({
    title: '', publication: '', url: '', coverage_type: 'article', sentiment: 'positive', published_date: '', reach: ''
  });

  const fetchReleases = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/releases');
      setReleases(response.data || []);
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    }
  }, [api]);

  const fetchCoverage = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/coverage');
      setCoverage(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coverage:', error);
    }
  }, [api]);

  const fetchPitches = useCallback(async () => {
    try {
      const response = await api.get('/marketing/v2/pr/pitches');
      setPitches(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pitches:', error);
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchReleases(), fetchCoverage(), fetchPitches()]);
      setLoading(false);
    };
    loadData();
  }, [fetchReleases, fetchCoverage, fetchPitches]);

  const handleCreateRelease = async () => {
    try {
      const data = {
        ...newRelease,
        target_publications: newRelease.target_publications.split(',').map(p => p.trim()).filter(Boolean),
      };
      await api.post('/marketing/v2/pr/releases', data);
      toast.success('Press release created');
      setShowReleaseModal(false);
      setNewRelease({ title: '', subtitle: '', body: '', boilerplate: '', target_publications: '' });
      fetchReleases();
    } catch (error) {
      toast.error('Failed to create press release');
    }
  };

  const handleRecordCoverage = async () => {
    try {
      const data = {
        ...newCoverage,
        reach: newCoverage.reach ? parseInt(newCoverage.reach) : null,
      };
      await api.post('/marketing/v2/pr/coverage', data);
      toast.success('Coverage recorded');
      setShowCoverageModal(false);
      setNewCoverage({ title: '', publication: '', url: '', coverage_type: 'article', sentiment: 'positive', published_date: '', reach: '' });
      fetchCoverage();
    } catch (error) {
      toast.error('Failed to record coverage');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num;
  };

  // Stats
  const totalReleases = releases.length;
  const distributedReleases = releases.filter(r => r.status === 'distributed' || r.status === 'published').length;
  const totalCoverage = coverage.length;
  const positiveCoverage = coverage.filter(c => c.sentiment === 'positive').length;

  return (
    <div className="p-8 space-y-6" data-testid="digital-pr-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728]">Digital PR</h1>
          <p className="text-[#5D4A3A] mt-1">Manage press releases, media coverage, and PR outreach</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalReleases}</div>
                <div className="text-sm text-[#5D4A3A]">Press Releases</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{distributedReleases}</div>
                <div className="text-sm text-[#5D4A3A]">Distributed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{totalCoverage}</div>
                <div className="text-sm text-[#5D4A3A]">Media Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8D5C4]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ThumbsUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#4A3728]">{positiveCoverage}</div>
                <div className="text-sm text-[#5D4A3A]">Positive Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="releases">Press Releases</TabsTrigger>
          <TabsTrigger value="coverage">Media Coverage</TabsTrigger>
          <TabsTrigger value="pitches">PR Outreach</TabsTrigger>
        </TabsList>

        {/* Press Releases Tab */}
        <TabsContent value="releases" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showReleaseModal} onOpenChange={setShowReleaseModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800">
                  <Plus className="w-4 h-4 mr-2" /> New Press Release
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create Press Release</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newRelease.title} onChange={e => setNewRelease({...newRelease, title: e.target.value})} placeholder="Headline" />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input value={newRelease.subtitle} onChange={e => setNewRelease({...newRelease, subtitle: e.target.value})} placeholder="Subheadline" />
                  </div>
                  <div>
                    <Label>Body *</Label>
                    <Textarea rows={6} value={newRelease.body} onChange={e => setNewRelease({...newRelease, body: e.target.value})} placeholder="Press release content..." />
                  </div>
                  <div>
                    <Label>Boilerplate</Label>
                    <Textarea rows={3} value={newRelease.boilerplate} onChange={e => setNewRelease({...newRelease, boilerplate: e.target.value})} placeholder="About the company..." />
                  </div>
                  <div>
                    <Label>Target Publications (comma-separated)</Label>
                    <Input value={newRelease.target_publications} onChange={e => setNewRelease({...newRelease, target_publications: e.target.value})} placeholder="Vogue India, Elle India, Femina" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateRelease} className="bg-amber-700 hover:bg-amber-800">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-[#4A3728]" /></div>
          ) : releases.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No press releases yet</h3>
                <p className="text-[#5D4A3A]">Create your first press release</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {releases.map(release => (
                <Card key={release.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={STATUS_COLORS[release.status]}>{release.status}</Badge>
                          {release.coverage_count > 0 && (
                            <Badge variant="outline" className="bg-green-50">
                              <Newspaper className="w-3 h-3 mr-1" /> {release.coverage_count} coverage
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-[#4A3728] text-lg">{release.title}</h3>
                        {release.subtitle && <p className="text-[#5D4A3A] mt-1">{release.subtitle}</p>}
                        <p className="text-sm text-[#5D4A3A] mt-2 line-clamp-2">{release.body}</p>
                        {release.target_publications?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {release.target_publications.map((pub, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{pub}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-[#5D4A3A]">
                        {formatDate(release.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Media Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
              <DialogTrigger asChild>
                <Button className="bg-amber-700 hover:bg-amber-800">
                  <Plus className="w-4 h-4 mr-2" /> Record Coverage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Media Coverage</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={newCoverage.title} onChange={e => setNewCoverage({...newCoverage, title: e.target.value})} placeholder="Article title" />
                  </div>
                  <div>
                    <Label>Publication *</Label>
                    <Input value={newCoverage.publication} onChange={e => setNewCoverage({...newCoverage, publication: e.target.value})} placeholder="Vogue India" />
                  </div>
                  <div>
                    <Label>URL *</Label>
                    <Input value={newCoverage.url} onChange={e => setNewCoverage({...newCoverage, url: e.target.value})} placeholder="https://..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Coverage Type</Label>
                      <Select value={newCoverage.coverage_type} onValueChange={v => setNewCoverage({...newCoverage, coverage_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="mention">Mention</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sentiment</Label>
                      <Select value={newCoverage.sentiment} onValueChange={v => setNewCoverage({...newCoverage, sentiment: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Published Date</Label>
                      <Input type="date" value={newCoverage.published_date} onChange={e => setNewCoverage({...newCoverage, published_date: e.target.value})} />
                    </div>
                    <div>
                      <Label>Estimated Reach</Label>
                      <Input type="number" value={newCoverage.reach} onChange={e => setNewCoverage({...newCoverage, reach: e.target.value})} placeholder="1000000" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCoverageModal(false)}>Cancel</Button>
                  <Button onClick={handleRecordCoverage} className="bg-amber-700 hover:bg-amber-800">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {coverage.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Newspaper className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No coverage recorded yet</h3>
                <p className="text-[#5D4A3A]">Track your media mentions and features</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {coverage.map(item => (
                <Card key={item.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.coverage_type}</Badge>
                          <Badge className={SENTIMENT_COLORS[item.sentiment]}>{item.sentiment}</Badge>
                        </div>
                        <h3 className="font-medium text-[#4A3728]">{item.title}</h3>
                        <p className="text-sm text-[#5D4A3A]">{item.publication}</p>
                      </div>
                      <div className="text-right">
                        {item.reach && (
                          <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                            <Eye className="w-4 h-4" /> {formatNumber(item.reach)} reach
                          </div>
                        )}
                        <div className="text-xs text-[#5D4A3A] mt-1">{formatDate(item.published_date)}</div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PR Outreach Tab */}
        <TabsContent value="pitches" className="space-y-4">
          {pitches.length === 0 ? (
            <Card className="border-[#E8D5C4]">
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto text-[#5D4A3A] mb-4" />
                <h3 className="font-medium text-[#4A3728]">No pitches yet</h3>
                <p className="text-[#5D4A3A]">Start pitching to journalists from the Contacts Hub</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pitches.map(pitch => (
                <Card key={pitch.id} className="border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={STATUS_COLORS[pitch.status]}>{pitch.status}</Badge>
                        </div>
                        <h3 className="font-medium text-[#4A3728]">{pitch.subject}</h3>
                        <p className="text-sm text-[#5D4A3A]">To: {pitch.contact_name} • {pitch.publication}</p>
                        <p className="text-sm text-[#5D4A3A] mt-2 line-clamp-2">{pitch.message}</p>
                      </div>
                      <div className="text-xs text-[#5D4A3A]">
                        {formatDate(pitch.sent_at || pitch.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalPRPage;
