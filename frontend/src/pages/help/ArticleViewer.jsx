import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ChevronRight, ThumbsUp, ThumbsDown, Clock, Eye,
    Loader2, BookOpen, Tag
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const ArticleViewer = () => {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [relatedArticles, setRelatedArticles] = useState([]);

    useEffect(() => {
        if (articleId) {
            fetchArticle();
        }
    }, [articleId]);

    const fetchArticle = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/help/articles/${articleId}`);
            setArticle(res.data);
            
            // Fetch related articles from same module
            const relatedRes = await api.get(`/help/articles?module_key=${res.data.module_key}&limit=5`);
            setRelatedArticles(relatedRes.data.filter(a => a.id !== articleId && a.status === 'published'));
        } catch (e) {
            console.error('Failed to fetch article:', e);
            toast.error('Failed to load article');
        } finally {
            setLoading(false);
        }
    };

    const handleFeedback = async (helpful) => {
        if (feedbackGiven) return;
        
        try {
            await api.post(`/help/articles/${articleId}/helpful?helpful=${helpful}`);
            setFeedbackGiven(true);
            toast.success('Thank you for your feedback!');
            
            // Update local count
            setArticle(prev => ({
                ...prev,
                helpful_count: helpful ? prev.helpful_count + 1 : prev.helpful_count,
                not_helpful_count: !helpful ? prev.not_helpful_count + 1 : prev.not_helpful_count
            }));
        } catch (e) {
            toast.error('Failed to submit feedback');
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#9C8C74]" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] p-6">
                <div className="max-w-4xl mx-auto text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" />
                    <h2 className="text-xl font-semibold text-[#4A3728]">Article not found</h2>
                    <Button 
                        onClick={() => navigate('/help')} 
                        className="mt-4 bg-[#4A3728]"
                    >
                        Back to Help Center
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDF8F3] p-6" data-testid="article-viewer">
            <div className="max-w-4xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[#6B5D52] mb-6">
                    <button 
                        onClick={() => navigate('/help')}
                        className="hover:text-[#4A3728] transition-colors"
                    >
                        Help Center
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <button 
                        onClick={() => navigate(`/help/modules/${article.module_key}`)}
                        className="hover:text-[#4A3728] transition-colors"
                    >
                        {article.module_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[#4A3728] font-medium truncate max-w-[200px]">
                        {article.title}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    {/* Main Content */}
                    <div className="col-span-3">
                        {/* Article Header */}
                        <div className="mb-6">
                            <Button 
                                variant="ghost" 
                                onClick={() => navigate(`/help/modules/${article.module_key}`)}
                                className="mb-4 -ml-2 text-[#6B5D52] hover:text-[#4A3728]"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to {article.module_key.replace(/_/g, ' ')}
                            </Button>
                            
                            <h1 className="text-3xl font-semibold text-[#4A3728] mb-4">
                                {article.title}
                            </h1>
                            
                            <div className="flex items-center gap-4 text-sm text-[#6B5D52]">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Updated {formatDate(article.updated_at || article.created_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {article.views} views
                                </span>
                            </div>
                        </div>

                        {/* Article Content */}
                        <Card className="bg-white border-[#E8D5C4]">
                            <CardContent className="p-8">
                                <article className="prose prose-stone max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({node, ...props}) => (
                                                <h1 className="text-2xl font-bold text-[#4A3728] mt-8 mb-4" {...props} />
                                            ),
                                            h2: ({node, ...props}) => (
                                                <h2 className="text-xl font-semibold text-[#4A3728] mt-6 mb-3" {...props} />
                                            ),
                                            h3: ({node, ...props}) => (
                                                <h3 className="text-lg font-medium text-[#4A3728] mt-4 mb-2" {...props} />
                                            ),
                                            p: ({node, ...props}) => (
                                                <p className="text-[#4A3728] leading-relaxed mb-4" {...props} />
                                            ),
                                            ul: ({node, ...props}) => (
                                                <ul className="list-disc pl-6 mb-4 space-y-2 text-[#4A3728]" {...props} />
                                            ),
                                            ol: ({node, ...props}) => (
                                                <ol className="list-decimal pl-6 mb-4 space-y-2 text-[#4A3728]" {...props} />
                                            ),
                                            li: ({node, ...props}) => (
                                                <li className="text-[#4A3728]" {...props} />
                                            ),
                                            code: ({node, inline, ...props}) => (
                                                inline 
                                                    ? <code className="bg-[#F5EDE5] px-1.5 py-0.5 rounded text-sm font-mono text-[#4A3728]" {...props} />
                                                    : <code className="block bg-[#F5EDE5] p-4 rounded-lg text-sm font-mono text-[#4A3728] overflow-x-auto" {...props} />
                                            ),
                                            blockquote: ({node, ...props}) => (
                                                <blockquote className="border-l-4 border-[#D4BBA6] pl-4 italic text-[#6B5D52] my-4" {...props} />
                                            ),
                                            a: ({node, ...props}) => (
                                                <a className="text-blue-600 hover:underline" {...props} />
                                            ),
                                            em: ({node, ...props}) => (
                                                <em className="text-[#6B5D52] italic" {...props} />
                                            ),
                                        }}
                                    >
                                        {article.content}
                                    </ReactMarkdown>
                                </article>
                            </CardContent>
                        </Card>

                        {/* Feedback */}
                        <Card className="bg-white border-[#E8D5C4] mt-6">
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <p className="text-[#4A3728] font-medium mb-4">
                                        Was this article helpful?
                                    </p>
                                    {feedbackGiven ? (
                                        <p className="text-[#6B5D52]">
                                            Thank you for your feedback!
                                        </p>
                                    ) : (
                                        <div className="flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleFeedback(true)}
                                                className="border-green-300 text-green-700 hover:bg-green-50"
                                            >
                                                <ThumbsUp className="w-4 h-4 mr-2" />
                                                Yes ({article.helpful_count})
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleFeedback(false)}
                                                className="border-red-300 text-red-700 hover:bg-red-50"
                                            >
                                                <ThumbsDown className="w-4 h-4 mr-2" />
                                                No ({article.not_helpful_count})
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Tags */}
                        {article.tags?.length > 0 && (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="p-4">
                                    <p className="text-xs text-[#9C8C74] mb-3 flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        Tags
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map((tag) => (
                                            <Badge 
                                                key={tag} 
                                                variant="outline"
                                                className="border-[#D4BBA6] text-[#6B5D52]"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Related Articles */}
                        {relatedArticles.length > 0 && (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="p-4">
                                    <p className="text-xs text-[#9C8C74] mb-3">
                                        Related Articles
                                    </p>
                                    <div className="space-y-3">
                                        {relatedArticles.slice(0, 4).map((related) => (
                                            <button
                                                key={related.id}
                                                onClick={() => navigate(`/help/articles/${related.id}`)}
                                                className="block w-full text-left p-2 rounded hover:bg-[#FDF8F3] transition-colors"
                                            >
                                                <p className="text-sm text-[#4A3728] line-clamp-2">
                                                    {related.title}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Need Help CTA */}
                        <Card className="bg-[#4A3728] border-none text-white">
                            <CardContent className="p-4">
                                <p className="font-medium mb-2">Still need help?</p>
                                <p className="text-sm text-white/80 mb-4">
                                    Submit a ticket and we'll assist you.
                                </p>
                                <Button
                                    onClick={() => navigate('/help?tab=tickets')}
                                    className="w-full bg-white text-[#4A3728] hover:bg-white/90"
                                >
                                    Submit Ticket
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArticleViewer;
