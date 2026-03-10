import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Target, Users, Hash, FileText, Plus, Link2, Unlink,
  Clock, CheckCircle, Eye, Edit2, Loader2, Play, Pause
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { format } from 'date-fns';

const platforms = [
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0077B5' },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { key: 'twitter', label: 'X/Twitter', icon: FaTwitter, color: '#1DA1F2' },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000' },
];

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  pending_review: 'bg-amber-100 text-amber-700',
};

const campaignStatusColors = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availablePosts, setAvailablePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [linking, setLinking] = useState('');

  useEffect(() => {
    fetchCampaignPosts();
  }, [campaignId]);

  const fetchCampaignPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/social/campaigns/${campaignId}/posts`);
      setCampaign(res.data.campaign);
      setPosts(res.data.posts);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load campaign');
      navigate('/social/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePosts = async () => {
    setLoadingPosts(true);
    try {
      // Get all posts that are not linked to any campaign
      const res = await api.get('/api/posts');
      const unlinked = res.data.filter(p => !p.campaign_id);
      setAvailablePosts(unlinked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLinkPost = async (postId) => {
    setLinking(postId);
    try {
      await api.post(`/api/social/campaigns/${campaignId}/link-post/${postId}`);
      toast.success('Post linked to campaign');
      fetchCampaignPosts();
      fetchAvailablePosts();
    } catch (err) {
      toast.error('Failed to link post');
    } finally {
      setLinking('');
    }
  };

  const handleUnlinkPost = async (postId) => {
    if (!window.confirm('Unlink this post from the campaign?')) return;
    try {
      await api.post(`/api/social/campaigns/${campaignId}/unlink-post/${postId}`);
      toast.success('Post unlinked');
      fetchCampaignPosts();
    } catch (err) {
      toast.error('Failed to unlink post');
    }
  };

  const handleOpenLinkModal = () => {
    setShowLinkModal(true);
    fetchAvailablePosts();
  };

  const getPlatformIcon = (platformKey) => {
    const p = platforms.find(x => x.key === platformKey);
    if (!p) return null;
    const Icon = p.icon;
    return <Icon className="w-4 h-4" style={{ color: p.color }} />;
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF7F5] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4BBA6]" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="p-6 bg-[#FAF7F5] min-h-screen" data-testid="campaign-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/social/campaigns')} className="text-[#5D4A3A]">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {/* Campaign Header Card */}
      <Card className="bg-white border-[#E8D5C4] mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-2 h-full min-h-[100px] rounded-full" style={{ backgroundColor: campaign.color || '#E11D48' }} />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold text-[#4A3728]">{campaign.name}</h1>
                  {campaign.description && (
                    <p className="text-sm text-[#5D4A3A] mt-1">{campaign.description}</p>
                  )}
                </div>
                <Badge className={campaignStatusColors[campaign.status]}>
                  {campaign.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-[#5D4A3A]">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(campaign.start_date), 'MMM d')} - {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {campaign.objective}
                </span>
                {campaign.owner_name && (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {campaign.owner_name}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {posts.length} posts
                </span>
              </div>

              {/* Platforms & Hashtags */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  {campaign.platforms?.map(p => (
                    <div key={p} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {getPlatformIcon(p)}
                    </div>
                  ))}
                </div>
                {campaign.hashtags?.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-[#5D4A3A]">
                    <Hash className="w-4 h-4" />
                    {campaign.hashtags.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#4A3728]">Campaign Posts</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenLinkModal} className="border-[#D4BBA6] text-[#4A3728]">
            <Link2 className="w-4 h-4 mr-2" /> Link Existing Post
          </Button>
          <Button onClick={() => navigate('/social/posts')} className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create New Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card className="bg-white border-[#E8D5C4]">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-[#D4BBA6] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#4A3728] mb-2">No posts yet</h3>
            <p className="text-sm text-[#5D4A3A] mb-4">Link existing posts or create new ones for this campaign</p>
            <Button onClick={handleOpenLinkModal} variant="outline" className="border-[#D4BBA6]">
              <Link2 className="w-4 h-4 mr-2" /> Link Posts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {posts.map(post => (
            <Card key={post.post_id} className="bg-white border-[#E8D5C4] hover:border-[#D4BBA6] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Platform icon */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(post.platform)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#4A3728] line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#5D4A3A]">
                      {post.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(post.scheduled_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                      <Badge className={statusColors[post.status] || 'bg-gray-100 text-gray-700'}>
                        {post.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkPost(post.post_id)} className="text-[#5D4A3A] hover:text-red-600">
                      <Unlink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Posts Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Posts to Campaign</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#D4BBA6]" />
              </div>
            ) : availablePosts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-[#D4BBA6] mx-auto mb-3" />
                <p className="text-sm text-[#5D4A3A]">No unlinked posts available</p>
                <Button onClick={() => { setShowLinkModal(false); navigate('/social/posts'); }} className="mt-4 bg-[#4A3728] text-white">
                  Create New Post
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {availablePosts.map(post => (
                  <div key={post.post_id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E8D5C4] hover:border-[#D4BBA6]">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getPlatformIcon(post.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A3728] line-clamp-1">{post.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColors[post.status] || 'bg-gray-100'} style={{ fontSize: '10px' }}>
                          {post.status}
                        </Badge>
                        {post.scheduled_at && (
                          <span className="text-xs text-[#5D4A3A]">
                            {format(new Date(post.scheduled_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLinkPost(post.post_id)}
                      disabled={linking === post.post_id}
                      className="bg-[#4A3728] hover:bg-[#3A2A1E] text-white"
                    >
                      {linking === post.post_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-1" /> Link
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
