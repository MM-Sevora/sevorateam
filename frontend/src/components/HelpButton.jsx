import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, X, Book, MessageSquare, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import api from '../lib/api';

// Map of module keys to their help module keys
const MODULE_HELP_MAP = {
    'projects': 'project_management',
    'project': 'project_management',
    'tasks': 'project_management',
    'marketing': 'marketing',
    'influencers': 'marketing',
    'campaigns': 'marketing',
    'mail': 'mail',
    'email': 'mail',
    'social': 'social',
    'instagram': 'social',
    'youtube': 'social',
    'overview': 'overview',
    'dashboard': 'overview'
};

/**
 * Contextual Help Button Component
 * Displays a floating help button that opens a side panel with relevant help content
 * 
 * Usage:
 * <HelpButton moduleKey="project_management" />
 * or
 * <HelpButton /> // Auto-detects from URL path
 */
const HelpButton = ({ moduleKey, position = 'bottom-right', variant = 'floating' }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [helpData, setHelpData] = useState({ module: null, articles: [], faqs: [] });
    const [loading, setLoading] = useState(false);

    // Auto-detect module from URL if not provided
    const detectModuleKey = () => {
        if (moduleKey) return moduleKey;
        
        const path = window.location.pathname.toLowerCase();
        for (const [urlPart, helpKey] of Object.entries(MODULE_HELP_MAP)) {
            if (path.includes(urlPart)) {
                return helpKey;
            }
        }
        return 'overview';
    };

    const fetchHelpContent = async () => {
        const key = detectModuleKey();
        setLoading(true);
        
        try {
            const [moduleRes, articlesRes, faqsRes] = await Promise.all([
                api.get(`/help/modules/${key}`).catch(() => ({ data: null })),
                api.get(`/help/articles?module_key=${key}&status=published&limit=5`).catch(() => ({ data: [] })),
                api.get(`/help/faqs?module_key=${key}&limit=5`).catch(() => ({ data: [] }))
            ]);
            
            setHelpData({
                module: moduleRes.data,
                articles: articlesRes.data || [],
                faqs: faqsRes.data?.filter(f => f.is_active) || []
            });
        } catch (e) {
            console.error('Failed to fetch help content:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = (isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
            fetchHelpContent();
        }
    };

    const positionClasses = {
        'bottom-right': 'fixed bottom-20 right-6',
        'bottom-left': 'fixed bottom-20 left-6',
        'inline': 'relative'
    };

    return (
        <Sheet open={open} onOpenChange={handleOpen}>
            <SheetTrigger asChild>
                {variant === 'floating' ? (
                    <Button
                        className={`${positionClasses[position]} z-50 rounded-full w-12 h-12 shadow-lg bg-[#4A3728] hover:bg-[#3A2A1E] text-white`}
                        data-testid="help-button"
                    >
                        <HelpCircle className="w-6 h-6" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#6B5D52] hover:text-[#4A3728]"
                        data-testid="help-button-inline"
                    >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        Help
                    </Button>
                )}
            </SheetTrigger>
            
            <SheetContent className="w-[400px] sm:w-[450px] bg-white border-l-[#E8D5C4]">
                <SheetHeader>
                    <SheetTitle className="text-[#4A3728] flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />
                        {helpData.module?.module_name || 'Help'} 
                    </SheetTitle>
                    <SheetDescription className="text-[#6B5D52]">
                        {helpData.module?.description || 'Find answers and get help'}
                    </SheetDescription>
                </SheetHeader>
                
                <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Quick Links */}
                            <div>
                                <h3 className="text-sm font-medium text-[#4A3728] mb-3">Quick Links</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            navigate(`/help/modules/${detectModuleKey()}`);
                                        }}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-[#FDF8F3] hover:bg-[#F5EDE5] transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-[#4A3728]">
                                            <Book className="w-4 h-4" />
                                            View All Documentation
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-[#9C8C74]" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            navigate('/help?tab=tickets');
                                        }}
                                        className="w-full flex items-center justify-between p-3 rounded-lg bg-[#FDF8F3] hover:bg-[#F5EDE5] transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-[#4A3728]">
                                            <MessageSquare className="w-4 h-4" />
                                            Submit Support Ticket
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-[#9C8C74]" />
                                    </button>
                                </div>
                            </div>

                            {/* Articles */}
                            {helpData.articles.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-[#4A3728] mb-3">
                                        Related Articles
                                    </h3>
                                    <div className="space-y-2">
                                        {helpData.articles.map(article => (
                                            <button
                                                key={article.id}
                                                onClick={() => {
                                                    setOpen(false);
                                                    navigate(`/help/articles/${article.id}`);
                                                }}
                                                className="w-full text-left p-3 rounded-lg border border-[#E8D5C4] hover:bg-[#FDF8F3] transition-colors"
                                            >
                                                <p className="text-sm font-medium text-[#4A3728] line-clamp-1">
                                                    {article.title}
                                                </p>
                                                <p className="text-xs text-[#9C8C74] mt-1">
                                                    {article.section.replace(/_/g, ' ')}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* FAQs */}
                            {helpData.faqs.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-[#4A3728] mb-3">
                                        Common Questions
                                    </h3>
                                    <div className="space-y-3">
                                        {helpData.faqs.map(faq => (
                                            <div
                                                key={faq.id}
                                                className="p-3 rounded-lg border border-[#E8D5C4]"
                                            >
                                                <p className="text-sm font-medium text-[#4A3728]">
                                                    {faq.question}
                                                </p>
                                                <p className="text-sm text-[#6B5D52] mt-2">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Content State */}
                            {helpData.articles.length === 0 && helpData.faqs.length === 0 && (
                                <div className="text-center py-8">
                                    <HelpCircle className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                                    <p className="text-sm text-[#6B5D52]">
                                        Documentation for this module is being prepared.
                                    </p>
                                    <Button
                                        onClick={() => {
                                            setOpen(false);
                                            navigate('/help?tab=tickets');
                                        }}
                                        className="mt-4 bg-[#4A3728] hover:bg-[#3A2A1E]"
                                    >
                                        Submit a Question
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8D5C4]">
                    <Button
                        onClick={() => {
                            setOpen(false);
                            navigate('/help');
                        }}
                        variant="outline"
                        className="w-full border-[#D4BBA6] text-[#4A3728]"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Help Center
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default HelpButton;
