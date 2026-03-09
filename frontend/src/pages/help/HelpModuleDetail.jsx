import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Book, MessageSquare, FileText, ChevronRight, ChevronDown,
    ThumbsUp, ThumbsDown, Clock, Eye, Loader2, HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../../components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import api from '../../lib/api';
import { toast } from 'sonner';

const SECTION_ORDER = ['overview', 'how_it_works', 'features', 'troubleshooting'];
const SECTION_LABELS = {
    'overview': 'Overview',
    'how_it_works': 'How It Works',
    'features': 'Key Features',
    'troubleshooting': 'Troubleshooting'
};

const HelpModuleDetail = () => {
    const { moduleKey } = useParams();
    const navigate = useNavigate();
    const [module, setModule] = useState(null);
    const [articles, setArticles] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('articles');

    useEffect(() => {
        if (moduleKey) {
            fetchModuleData();
        }
    }, [moduleKey]);

    const fetchModuleData = async () => {
        setLoading(true);
        try {
            const [moduleRes, articlesRes, faqsRes] = await Promise.all([
                api.get(`/help/modules/${moduleKey}`),
                api.get(`/help/articles?module_key=${moduleKey}`),
                api.get(`/help/faqs?module_key=${moduleKey}&include_inactive=true`)
            ]);
            setModule(moduleRes.data);
            setArticles(articlesRes.data);
            setFaqs(faqsRes.data);
        } catch (e) {
            console.error('Failed to fetch module data:', e);
            toast.error('Failed to load module');
        } finally {
            setLoading(false);
        }
    };

    // Group articles by section
    const articlesBySection = SECTION_ORDER.reduce((acc, section) => {
        acc[section] = articles.filter(a => a.section === section);
        return acc;
    }, {});

    const publishedArticles = articles.filter(a => a.status === 'published');
    const activeFaqs = faqs.filter(f => f.is_active);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#9C8C74]" />
            </div>
        );
    }

    if (!module) {
        return (
            <div className="min-h-screen bg-[#FDF8F3] p-6">
                <div className="max-w-4xl mx-auto text-center py-12">
                    <HelpCircle className="w-16 h-16 mx-auto mb-4 text-[#D4BBA6]" />
                    <h2 className="text-xl font-semibold text-[#4A3728]">Module not found</h2>
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
        <div className="min-h-screen bg-[#FDF8F3] p-6" data-testid="help-module-detail">
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
                    <span className="text-[#4A3728] font-medium">{module.module_name}</span>
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#4A3728] mb-2">
                            {module.module_name}
                        </h1>
                        <p className="text-[#6B5D52]">{module.description}</p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/help')}
                        className="border-[#D4BBA6]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 mb-6 text-sm text-[#6B5D52]">
                    <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {publishedArticles.length} articles
                    </span>
                    <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {activeFaqs.length} FAQs
                    </span>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white border border-[#E8D5C4]">
                        <TabsTrigger 
                            value="articles" 
                            className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white"
                        >
                            <Book className="w-4 h-4 mr-2" />
                            Articles
                        </TabsTrigger>
                        <TabsTrigger 
                            value="faqs" 
                            className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            FAQs
                        </TabsTrigger>
                    </TabsList>

                    {/* Articles Tab */}
                    <TabsContent value="articles">
                        {publishedArticles.length === 0 ? (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="text-center py-12">
                                    <Book className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                                    <p className="font-medium text-[#4A3728]">No articles yet</p>
                                    <p className="text-sm text-[#6B5D52] mt-1">
                                        Documentation is being prepared for this module
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {SECTION_ORDER.map(section => {
                                    const sectionArticles = articlesBySection[section]?.filter(
                                        a => a.status === 'published'
                                    );
                                    if (!sectionArticles?.length) return null;
                                    
                                    return (
                                        <div key={section}>
                                            <h3 className="text-sm font-medium text-[#6B5D52] uppercase tracking-wider mb-3">
                                                {SECTION_LABELS[section]}
                                            </h3>
                                            <Card className="bg-white border-[#E8D5C4]">
                                                <CardContent className="p-0 divide-y divide-[#E8D5C4]">
                                                    {sectionArticles.map(article => (
                                                        <ArticleListItem 
                                                            key={article.id} 
                                                            article={article}
                                                            onClick={() => navigate(`/help/articles/${article.id}`)}
                                                        />
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* FAQs Tab */}
                    <TabsContent value="faqs">
                        {activeFaqs.length === 0 ? (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="text-center py-12">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                                    <p className="font-medium text-[#4A3728]">No FAQs yet</p>
                                    <p className="text-sm text-[#6B5D52] mt-1">
                                        Frequently asked questions will be added soon
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-white border-[#E8D5C4]">
                                <CardContent className="p-4">
                                    <Accordion type="single" collapsible className="space-y-2">
                                        {activeFaqs.map((faq, index) => (
                                            <AccordionItem 
                                                key={faq.id} 
                                                value={faq.id}
                                                className="border border-[#E8D5C4] rounded-lg px-4"
                                            >
                                                <AccordionTrigger className="text-left text-[#4A3728] hover:no-underline">
                                                    <span className="flex items-start gap-3">
                                                        <span className="text-[#9C8C74] font-mono text-sm mt-0.5">
                                                            Q{index + 1}
                                                        </span>
                                                        <span>{faq.question}</span>
                                                    </span>
                                                </AccordionTrigger>
                                                <AccordionContent className="text-[#6B5D52] pl-8">
                                                    {faq.answer}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Submit Ticket CTA */}
                <div className="mt-8 p-6 bg-[#F5EDE5] rounded-xl border border-[#E8D5C4]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-[#4A3728]">Still need help?</h3>
                            <p className="text-sm text-[#6B5D52] mt-1">
                                Submit a support ticket and we'll get back to you
                            </p>
                        </div>
                        <Button 
                            onClick={() => navigate('/help?tab=tickets')}
                            className="bg-[#4A3728] hover:bg-[#3A2A1E]"
                        >
                            Submit Ticket
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Article List Item Component
const ArticleListItem = ({ article, onClick }) => {
    return (
        <div 
            className="p-4 hover:bg-[#FDF8F3] cursor-pointer transition-colors group"
            onClick={onClick}
            data-testid={`article-${article.id}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="font-medium text-[#4A3728] group-hover:text-[#3A2A1E]">
                        {article.title}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#9C8C74]">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views} views
                        </span>
                        <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {article.helpful_count} found helpful
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#D4BBA6] group-hover:text-[#4A3728] transition-colors" />
            </div>
        </div>
    );
};

export default HelpModuleDetail;
