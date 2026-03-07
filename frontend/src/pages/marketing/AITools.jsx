import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
    Sparkles, Users, Newspaper
} from 'lucide-react';

export const AIToolsPage = () => {
    return (
        <div className="p-8 space-y-6" data-testid="ai-tools-page">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500 mb-1">AI-Powered Features</p>
                    <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
                        AI Tools & Discovery
                        <Sparkles className="w-6 h-6 text-amber-500" />
                    </h1>
                </div>
            </div>

            {/* AI Discovery CTA Card */}
            <Card className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/marketing/ai-discovery'}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Users className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">AI Influencer Discovery</h3>
                            <p className="text-gray-600">Input your campaign brief and let AI recommend the perfect influencers</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-amber-100 text-amber-700">Smart Matching</Badge>
                                <Badge className="bg-amber-100 text-amber-700">Campaign Insights</Badge>
                                <Badge className="bg-amber-100 text-amber-700">Quick Actions</Badge>
                            </div>
                        </div>
                    </div>
                    <Button className="bg-[#c4a35a] hover:bg-[#b39349] text-white h-12 px-6">
                        <Sparkles className="w-5 h-5 mr-2" /> Start Discovery
                    </Button>
                </CardContent>
            </Card>

            {/* PR & Media Discovery CTA Card */}
            <Card className="bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/marketing/ai-discovery?tab=pr'}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Newspaper className="w-8 h-8 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">AI PR & Media Discovery</h3>
                            <p className="text-gray-600">Find the right journalists and media contacts for your story</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-purple-100 text-purple-700">Beat Matching</Badge>
                                <Badge className="bg-purple-100 text-purple-700">Pitch Suggestions</Badge>
                                <Badge className="bg-purple-100 text-purple-700">PR Insights</Badge>
                            </div>
                        </div>
                    </div>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-6">
                        <Sparkles className="w-5 h-5 mr-2" /> Discover Media
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AIToolsPage;
