import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { TourProvider } from "./components/GuidedTour";
import { Layout } from "./components/Layout";
import { msalConfig } from "./authConfig";
import LazyLoader from "./components/LazyLoader";

// Core pages (loaded immediately for fast initial render)
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

// ===== LAZY LOADED PAGES =====

// Marketing Pages
const CampaignsPage = lazy(() => import("./pages/marketing/Campaigns"));
const OutreachPage = lazy(() => import("./pages/marketing/Outreach"));
const NegotiationsPage = lazy(() => import("./pages/marketing/Negotiations"));
const AIToolsPage = lazy(() => import("./pages/marketing/AITools"));
const BudgetPage = lazy(() => import("./pages/marketing/Budget"));
const ContentAssetsPage = lazy(() => import("./pages/marketing/ContentAssetsPage"));
const InfluencersListPage = lazy(() => import("./pages/marketing/InfluencersListPage"));
const InfluencerDetailPage = lazy(() => import("./pages/marketing/InfluencerDetailPage"));
const CampaignDetailPage = lazy(() => import("./pages/marketing/CampaignDetailsPage"));
const CampaignHubPage = lazy(() => import("./pages/marketing/CampaignHubPage"));
const MarketingInsightsPage = lazy(() => import("./pages/marketing/MarketingInsightsPage"));
const AIDiscoveryPage = lazy(() => import("./pages/marketing/AIDiscoveryPage"));
const InfluencerDiscoveryPage = lazy(() => import("./pages/marketing/InfluencerDiscoveryPage"));
const PublicInfluencerDiscoveryPage = lazy(() => import("./pages/marketing/PublicInfluencerDiscoveryPage"));
const PublicationsListPage = lazy(() => import("./pages/marketing/PublicationsListPage"));
const PublicationDetailPage = lazy(() => import("./pages/marketing/PublicationDetailPage"));
const UnifiedPipeline = lazy(() => import("./pages/marketing/UnifiedPipeline"));
const DigitalAdsPage = lazy(() => import("./pages/marketing/DigitalAdsPage"));
const CreativeAssetsPage = lazy(() => import("./pages/marketing/CreativeAssetsPage"));
const ContentProductionPage = lazy(() => import("./pages/marketing/ContentProductionPage"));
const ContentPromotionPage = lazy(() => import("./pages/marketing/ContentPromotionPage"));
const BudgetManagementPage = lazy(() => import("./pages/marketing/BudgetManagementPage"));
const PublicationsPipelinePage = lazy(() => import("./pages/marketing/PublicationsPipelinePage"));
const MarketingSettingsPage = lazy(() => import("./pages/marketing/MarketingSettingsPage"));
const MarketingCalendarPage = lazy(() => import("./pages/marketing/MarketingCalendarPage"));
const MarketingEmailCampaignsPage = lazy(() => import("./pages/marketing/EmailCampaignsPage"));
const CampaignDetailsPage = lazy(() => import("./pages/marketing/CampaignDetailsPage"));
const EmailPage = lazy(() => import("./pages/marketing/EmailPage"));

// Sales Pages
const SalesDashboard = lazy(() => import("./pages/sales/Dashboard").then(m => ({ default: m.SalesDashboard })));
const LeadsPage = lazy(() => import("./pages/sales/Leads").then(m => ({ default: m.LeadsPage })));
const CustomersPage = lazy(() => import("./pages/sales/Customers"));
const PipelinePage = lazy(() => import("./pages/sales/Pipeline"));
const QRCodesPage = lazy(() => import("./pages/sales/QRCodes"));
const PartnersPage = lazy(() => import("./pages/sales/Partners"));
const WeddingPlannerPage = lazy(() => import("./pages/sales/WeddingPlanner"));
const LeadCapturePage = lazy(() => import("./pages/sales/LeadCapture"));
const SalesAnalyticsPage = lazy(() => import("./pages/sales/Analytics"));

// Social Pages
const SocialDashboard = lazy(() => import("./pages/social/Dashboard").then(m => ({ default: m.SocialDashboard })));
const ContentStudio = lazy(() => import("./pages/social/ContentStudio"));
const PostsAndSchedulePage = lazy(() => import("./pages/social/PostsAndSchedule"));
const ContentLibraryPage = lazy(() => import("./pages/social/ContentLibrary"));
const SocialCampaigns = lazy(() => import("./pages/social/SocialCampaigns"));
const CampaignDetail = lazy(() => import("./pages/social/CampaignDetail"));
const ApprovalWorkflows = lazy(() => import("./pages/social/ApprovalWorkflows"));
const PostingQueues = lazy(() => import("./pages/social/PostingQueues"));
const SocialInbox = lazy(() => import("./pages/social/SocialInbox"));
const DirectMessages = lazy(() => import("./pages/social/DirectMessages"));
const AutoReplyRules = lazy(() => import("./pages/social/AutoReplyRules"));
const SocialAnalyticsDashboard = lazy(() => import("./pages/social/SocialAnalyticsDashboard"));
const SocialListening = lazy(() => import("./pages/social/SocialListening"));
const PlatformIntegrations = lazy(() => import("./pages/social/PlatformIntegrations"));
const EngagementTracker = lazy(() => import("./pages/social/EngagementTracker"));

// Pulse Pages
const PulseFeed = lazy(() => import("./pages/pulse/PulseFeed"));
const LeadershipDashboard = lazy(() => import("./pages/pulse/LeadershipDashboard"));
const DepartmentWall = lazy(() => import("./pages/pulse/DepartmentWall"));
const Recognition = lazy(() => import("./pages/pulse/Recognition"));
const WorkUpdates = lazy(() => import("./pages/pulse/WorkUpdates"));
const TeamCompliance = lazy(() => import("./pages/pulse/TeamCompliance"));
const EmployeeProfile = lazy(() => import("./pages/pulse/EmployeeProfile"));

// Admin Pages
const UserManagementPage = lazy(() => import("./pages/admin/UserManagement"));
const OrganizationManagement = lazy(() => import("./pages/admin/OrganizationManagement"));
const TeamDashboard = lazy(() => import("./pages/admin/TeamDashboard"));
const EmployeeDatabase = lazy(() => import("./pages/admin/EmployeeDatabase"));
const AccessControlPage = lazy(() => import("./pages/admin/AccessControlPage"));
const WebsiteSettings = lazy(() => import("./pages/admin/WebsiteSettings"));
const SystemModulesPage = lazy(() => import("./pages/admin/SystemModulesPage"));
const UsersPermissionsPage = lazy(() => import("./pages/admin/UsersPermissionsPage"));
const DataImportPage = lazy(() => import("./pages/admin/DataImportPage"));
const SharedMailboxesPage = lazy(() => import("./pages/admin/SharedMailboxesPage"));
const MailSettingsPage = lazy(() => import("./pages/admin/MailSettingsPage"));
const NotificationSettingsPage = lazy(() => import("./pages/admin/NotificationSettingsPage"));
const APIKeysSettingsPage = lazy(() => import("./pages/admin/APIKeysSettingsPage"));

// Settings Pages
const AutomationSettings = lazy(() => import("./pages/settings/AutomationSettings"));

// Project Management Pages
const MyTasks = lazy(() => import("./pages/projects/MyTasks"));
const ProjectsList = lazy(() => import("./pages/projects/ProjectsList"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const ManagerDashboard = lazy(() => import("./pages/projects/ManagerDashboard"));
const RecurringTasks = lazy(() => import("./pages/projects/RecurringTasks"));
const KanbanBoard = lazy(() => import("./pages/projects/KanbanBoard"));
const SprintsPage = lazy(() => import("./pages/projects/SprintsPage"));
const SprintPlanningPage = lazy(() => import("./pages/projects/SprintPlanningPage"));
const MilestonesPage = lazy(() => import("./pages/projects/MilestonesPage"));
const EpicsPage = lazy(() => import("./pages/projects/EpicsPage"));
const BacklogPage = lazy(() => import("./pages/projects/BacklogPage"));
const GlobalBacklogPage = lazy(() => import("./pages/projects/GlobalBacklogPage"));
const EngineeringReportsPage = lazy(() => import("./pages/projects/EngineeringReportsPage"));

// Engineering Module Pages
const GlobalEpicsPage = lazy(() => import("./pages/engineering/GlobalEpicsPage"));
const GlobalSprintPlanningPage = lazy(() => import("./pages/engineering/GlobalSprintPlanningPage"));
const GlobalSprintBoardPage = lazy(() => import("./pages/engineering/GlobalSprintBoardPage"));
const WorkflowsPage = lazy(() => import("./pages/engineering/WorkflowsPage"));
const AutomationsPage = lazy(() => import("./pages/engineering/AutomationsPage"));
const EngineeringProjectsPage = lazy(() => import("./pages/engineering/EngineeringProjectsPage"));
const SprintBoardPage = lazy(() => import("./pages/engineering/SprintBoardPage"));
const RoadmapPage = lazy(() => import("./pages/engineering/RoadmapPage"));
const ReleasesPage = lazy(() => import("./pages/engineering/ReleasesPage"));
const FeatureParserPage = lazy(() => import("./pages/engineering/FeatureParserPage"));

// Knowledge Base Pages
const KnowledgeBasePage = lazy(() => import("./pages/knowledge/KnowledgeBasePage"));
const SpaceDetailPage = lazy(() => import("./pages/knowledge/SpaceDetailPage"));
const PageEditorPage = lazy(() => import("./pages/knowledge/PageEditorPage"));

// Unified Task Management Pages
const UnifiedTasksPage = lazy(() => import("./pages/tasks/UnifiedTasksPage"));
const ActivityFeedPage = lazy(() => import("./pages/tasks/ActivityFeedPage"));
const TaskTriggersPage = lazy(() => import("./pages/tasks/TaskTriggersPage"));
const ApprovalsPage = lazy(() => import("./pages/tasks/ApprovalsPage"));

// Goals & Objectives Pages
const GoalsDashboard = lazy(() => import("./pages/goals/GoalsDashboard"));
const StrategicGoals = lazy(() => import("./pages/goals/StrategicGoals"));
const FiscalYears = lazy(() => import("./pages/goals/FiscalYears"));
const Objectives = lazy(() => import("./pages/goals/Objectives"));
const ObjectiveDetail = lazy(() => import("./pages/goals/ObjectiveDetail"));

// Meetings & Reviews Pages
const MeetingList = lazy(() => import("./pages/meetings/MeetingList"));
const CreateMeeting = lazy(() => import("./pages/meetings/CreateMeeting"));
const MeetingDetail = lazy(() => import("./pages/meetings/MeetingDetail"));
const MeetingTemplates = lazy(() => import("./pages/meetings/MeetingTemplates"));

// Notifications
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));

// Help & Support
const HelpCenter = lazy(() => import("./pages/help/HelpCenter"));
const HelpModuleDetail = lazy(() => import("./pages/help/HelpModuleDetail"));
const TicketDetail = lazy(() => import("./pages/help/TicketDetail"));
const ArticleViewer = lazy(() => import("./pages/help/ArticleViewer"));
const HelpAdminDashboard = lazy(() => import("./pages/help/HelpAdminDashboard"));

// HR Pages
const ExpenseManagement = lazy(() => import("./pages/hr/ExpenseManagement"));
const MyTeam = lazy(() => import("./pages/hr/MyTeam"));

// Teams Pages
const TeamsChat = lazy(() => import("./pages/teams/TeamsChat"));
const TeamsCallback = lazy(() => import("./pages/teams/TeamsCallback"));
const TeamsCalendar = lazy(() => import("./pages/teams/TeamsCalendar"));
const TeamsEventDetail = lazy(() => import("./pages/teams/TeamsEventDetail"));
const UnifiedCalendarPage = lazy(() => import("./pages/calendar/UnifiedCalendarPage"));
const CombinedCalendarPage = lazy(() => import("./pages/calendar/CombinedCalendarPage"));

// Analytics & Insights
const AnalyticsTeamDashboard = lazy(() => import("./pages/analytics/TeamDashboard"));
const ReportsPage = lazy(() => import("./pages/analytics/ReportsPage"));

// Buying & Sourcing
const SourcingDashboard = lazy(() => import("./pages/sourcing/SourcingDashboard"));
const BrandsPage = lazy(() => import("./pages/sourcing/BrandsPage"));
const BrandDetailPage = lazy(() => import("./pages/sourcing/BrandDetailPage"));
const BrandPipeline = lazy(() => import("./pages/sourcing/BrandPipeline"));
const BrandOnboardingPipeline = lazy(() => import("./pages/sourcing/BrandOnboardingPipeline"));
const EmailTemplatesPage = lazy(() => import("./pages/sourcing/EmailTemplatesPage"));
const SuppliersPage = lazy(() => import("./pages/sourcing/SuppliersPage"));
const SupplierDetailPage = lazy(() => import("./pages/sourcing/SupplierDetailPage"));
const SupplierPipeline = lazy(() => import("./pages/sourcing/SupplierPipeline"));
const ManufacturersPage = lazy(() => import("./pages/sourcing/ManufacturersPage"));
const ManufacturerDetailPage = lazy(() => import("./pages/sourcing/ManufacturerDetailPage"));
const ManufacturerPipeline = lazy(() => import("./pages/sourcing/ManufacturerPipeline"));
const SamplesPage = lazy(() => import("./pages/sourcing/SamplesPage"));
const SourcingAIDiscoveryPage = lazy(() => import("./pages/sourcing/AIDiscoveryPage"));
const SourcingEmailCampaignsPage = lazy(() => import("./pages/sourcing/EmailCampaignsPage"));
const SourcingCalendarPage = lazy(() => import("./pages/sourcing/SourcingCalendarPage"));
const SourcingSettingsPage = lazy(() => import("./pages/sourcing/SourcingSettingsPage"));

// Systems Module
const SystemsPage = lazy(() => import("./pages/systems/SystemsPage"));
const IntegrationsPage = lazy(() => import("./pages/systems/IntegrationsPage"));
const SystemConfigPage = lazy(() => import("./pages/systems/SystemConfigPage"));

// IT Admin Module
const ITAdminHub = lazy(() => import("./pages/it-admin/ITAdminHub"));
const ToolsAccessTable = lazy(() => import("./pages/it-admin/ToolsAccessTable"));

// Finance Admin
const BudgetPlanning = lazy(() => import("./pages/finance/BudgetPlanning"));
const PaymentRequests = lazy(() => import("./pages/finance/PaymentRequests"));
const PaymentCategorySettings = lazy(() => import("./pages/finance/PaymentCategorySettings"));

// Vendor Management
const VendorDashboard = lazy(() => import("./pages/vendors/VendorDashboard"));
const VendorDatabase = lazy(() => import("./pages/vendors/VendorDatabase"));
const VendorDetails = lazy(() => import("./pages/vendors/VendorDetails"));
const WorkRequests = lazy(() => import("./pages/vendors/WorkRequests"));
const WorkOrders = lazy(() => import("./pages/vendors/WorkOrders"));
const RecurringWork = lazy(() => import("./pages/vendors/RecurringWork"));
const VendorApprovals = lazy(() => import("./pages/vendors/Approvals"));

import "./App.css";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// MSAL initialization wrapper component
const MsalInitializer = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);

    useEffect(() => {
        const initializeMsal = async () => {
            console.log('=== MSAL Init Starting ===');
            console.log('Current URL:', window.location.href);
            
            try {
                await msalInstance.initialize();
                console.log('MSAL initialized');
                
                const hasAuthCode = window.location.hash.includes('code=');
                console.log('Has auth code in URL:', hasAuthCode);
                
                const loginType = sessionStorage.getItem('msalLoginType');
                const redirectPath = sessionStorage.getItem('msalRedirectPath');
                console.log('Login type from session:', loginType);
                console.log('Redirect path from session:', redirectPath);
                
                if (hasAuthCode) {
                    console.log('Processing redirect response...');
                    
                    try {
                        const response = await msalInstance.handleRedirectPromise();
                        console.log('Redirect response:', response ? 'GOT RESPONSE with token' : 'NO RESPONSE');
                        
                        sessionStorage.removeItem('msalLoginType');
                        sessionStorage.removeItem('msalRedirectPath');
                        
                        if (response && response.accessToken) {
                            console.log('Token acquired for account:', response.account?.username);
                            
                            if (loginType === 'email') {
                                console.log('Email connection successful! Redirecting to mail...');
                                window.history.replaceState({}, document.title, redirectPath || '/mail/inbox');
                                window.location.href = redirectPath || '/mail/inbox';
                                return;
                            } else if (loginType === 'calendar') {
                                console.log('Calendar connection successful! Redirecting to calendar...');
                                window.history.replaceState({}, document.title, redirectPath || '/teams/calendar');
                                window.location.href = redirectPath || '/teams/calendar';
                                return;
                            } else if (loginType === 'app') {
                                console.log('Processing app login...');
                                try {
                                    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
                                    console.log('Calling backend:', backendUrl + '/api/auth/azure');
                                    
                                    const authResponse = await fetch(`${backendUrl}/api/auth/azure`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ azure_token: response.accessToken })
                                    });
                                    
                                    console.log('Backend status:', authResponse.status);
                                    
                                    if (authResponse.ok) {
                                        const data = await authResponse.json();
                                        console.log('Login success! User:', data.user?.email);
                                        
                                        localStorage.setItem('sevora_token', data.access_token);
                                        localStorage.setItem('token', data.access_token);
                                        localStorage.setItem('user', JSON.stringify(data.user));
                                        localStorage.setItem('sevora_auth_method', 'azure');
                                        
                                        window.history.replaceState({}, document.title, '/');
                                        window.location.reload();
                                        return;
                                    } else {
                                        const error = await authResponse.json();
                                        console.error('Backend error:', error);
                                        setInitError(error.detail || 'Authentication failed');
                                    }
                                } catch (backendError) {
                                    console.error('Backend call failed:', backendError);
                                    setInitError('Failed to connect to server');
                                }
                            } else {
                                console.log('Unknown login type, cleaning URL');
                                window.history.replaceState({}, document.title, '/');
                            }
                        } else {
                            console.log('No token in response, cleaning URL');
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } catch (handleError) {
                        console.error('handleRedirectPromise error:', handleError);
                        
                        sessionStorage.removeItem('msalLoginType');
                        sessionStorage.removeItem('msalRedirectPath');
                        
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }
            } catch (error) {
                console.error('MSAL init error:', error);
            }
            
            setIsInitialized(true);
        };

        initializeMsal();
    }, []);

    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Authenticating...</p>
                    {initError && <p className="text-sm text-red-500 mt-2">{initError}</p>}
                </div>
            </div>
        );
    }

    return children;
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredDepartment, requiredModule }) => {
    const { isAuthenticated, loading, hasAccessToDepartment, hasModuleAccess } = useAuth();

    if (loading) {
        return <LazyLoader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredModule && !hasModuleAccess(requiredModule)) {
        return <Navigate to="/" replace />;
    }

    if (requiredDepartment && !hasAccessToDepartment(requiredDepartment)) {
        console.warn(`DEPRECATED: requiredDepartment="${requiredDepartment}" used. Migrate to requiredModule.`);
        return <Navigate to="/" replace />;
    }

    return (
        <TourProvider>
            <Layout>{children}</Layout>
        </TourProvider>
    );
};

// Public Route Component
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LazyLoader />;
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Suspense fallback={<LazyLoader />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/capture" element={<LeadCapturePage />} />

                {/* Main Dashboard */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                {/* Marketing Routes */}
                <Route path="/marketing" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingInsightsPage /></ProtectedRoute>} />
                <Route path="/marketing/dashboard" element={<Navigate to="/marketing" replace />} />
                <Route path="/marketing/analytics" element={<Navigate to="/marketing" replace />} />
                <Route path="/marketing/influencers" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencersListPage /></ProtectedRoute>} />
                <Route path="/marketing/influencer/:influencerId" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencerDetailPage /></ProtectedRoute>} />
                <Route path="/marketing/discovery" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencerDiscoveryPage /></ProtectedRoute>} />
                <Route path="/marketing/public-discovery" element={<ProtectedRoute requiredModule="marketing_ops"><PublicInfluencerDiscoveryPage /></ProtectedRoute>} />
                <Route path="/marketing/pr" element={<Navigate to="/marketing/publications" replace />} />
                <Route path="/marketing/publications" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationsListPage /></ProtectedRoute>} />
                <Route path="/marketing/publications/pipeline" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationsPipelinePage /></ProtectedRoute>} />
                <Route path="/marketing/publication/:publicationId" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationDetailPage /></ProtectedRoute>} />
                <Route path="/marketing/campaigns" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignHubPage /></ProtectedRoute>} />
                <Route path="/marketing/campaign/:campaignId" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignDetailPage /></ProtectedRoute>} />
                <Route path="/marketing/calendar" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingCalendarPage /></ProtectedRoute>} />
                <Route path="/marketing/contacts" element={<Navigate to="/marketing/influencers" replace />} />
                <Route path="/marketing/contacts/:contactId" element={<Navigate to="/marketing/influencers" replace />} />
                <Route path="/marketing/ads" element={<ProtectedRoute requiredModule="marketing_ops"><DigitalAdsPage /></ProtectedRoute>} />
                <Route path="/marketing/assets" element={<ProtectedRoute requiredModule="marketing_ops"><CreativeAssetsPage /></ProtectedRoute>} />
                <Route path="/marketing/creative-assets" element={<Navigate to="/marketing/assets" replace />} />
                <Route path="/marketing/content" element={<ProtectedRoute requiredModule="marketing_ops"><ContentProductionPage /></ProtectedRoute>} />
                <Route path="/marketing/content-promotion" element={<ProtectedRoute requiredModule="marketing_ops"><ContentPromotionPage /></ProtectedRoute>} />
                <Route path="/marketing/budget-management" element={<ProtectedRoute requiredModule="marketing_ops"><BudgetManagementPage /></ProtectedRoute>} />
                <Route path="/marketing/budget" element={<ProtectedRoute requiredModule="marketing_ops"><BudgetPage /></ProtectedRoute>} />
                <Route path="/marketing/ai-tools" element={<ProtectedRoute requiredModule="marketing_ops"><AIToolsPage /></ProtectedRoute>} />
                <Route path="/marketing/ai-discovery" element={<ProtectedRoute requiredModule="marketing_ops"><AIDiscoveryPage /></ProtectedRoute>} />
                <Route path="/marketing/settings" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingSettingsPage /></ProtectedRoute>} />
                <Route path="/marketing/outreach" element={<ProtectedRoute requiredModule="marketing_ops"><OutreachPage /></ProtectedRoute>} />
                <Route path="/marketing/negotiations" element={<ProtectedRoute requiredModule="marketing_ops"><NegotiationsPage /></ProtectedRoute>} />
                <Route path="/marketing/pipeline" element={<ProtectedRoute requiredModule="marketing_ops"><UnifiedPipeline /></ProtectedRoute>} />
                <Route path="/marketing/outreach-dashboard" element={<Navigate to="/marketing/pipeline" replace />} />
                <Route path="/marketing/deals" element={<Navigate to="/marketing/pipeline" replace />} />

                {/* Mail Routes */}
                <Route path="/mail/inbox" element={<ProtectedRoute requiredModule="mail"><EmailPage /></ProtectedRoute>} />
                <Route path="/marketing/email" element={<ProtectedRoute requiredModule="marketing_ops"><EmailPage /></ProtectedRoute>} />
                <Route path="/marketing/email-campaigns" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingEmailCampaignsPage /></ProtectedRoute>} />

                {/* Sales Routes */}
                <Route path="/sales" element={<ProtectedRoute requiredModule="project_management"><SalesDashboard /></ProtectedRoute>} />
                <Route path="/sales/leads" element={<ProtectedRoute requiredModule="project_management"><LeadsPage /></ProtectedRoute>} />
                <Route path="/sales/customers" element={<ProtectedRoute requiredModule="project_management"><CustomersPage /></ProtectedRoute>} />
                <Route path="/sales/pipeline" element={<ProtectedRoute requiredModule="project_management"><PipelinePage /></ProtectedRoute>} />
                <Route path="/sales/wedding-planner" element={<ProtectedRoute requiredModule="project_management"><WeddingPlannerPage /></ProtectedRoute>} />
                <Route path="/sales/qrcodes" element={<ProtectedRoute requiredModule="project_management"><QRCodesPage /></ProtectedRoute>} />
                <Route path="/sales/partners" element={<ProtectedRoute requiredModule="project_management"><PartnersPage /></ProtectedRoute>} />
                <Route path="/sales/analytics" element={<ProtectedRoute requiredModule="project_management"><SalesAnalyticsPage /></ProtectedRoute>} />

                {/* Social Routes */}
                <Route path="/social" element={<ProtectedRoute requiredModule="social"><SocialAnalyticsDashboard /></ProtectedRoute>} />
                <Route path="/social/studio" element={<ProtectedRoute requiredModule="social"><ContentStudio /></ProtectedRoute>} />
                <Route path="/social/posts" element={<ProtectedRoute requiredModule="social"><PostsAndSchedulePage /></ProtectedRoute>} />
                <Route path="/social/library" element={<ProtectedRoute requiredModule="social"><ContentLibraryPage /></ProtectedRoute>} />
                <Route path="/social/campaigns" element={<ProtectedRoute requiredModule="social"><SocialCampaigns /></ProtectedRoute>} />
                <Route path="/social/campaigns/:campaignId" element={<ProtectedRoute requiredModule="social"><CampaignDetail /></ProtectedRoute>} />
                <Route path="/social/workflows" element={<ProtectedRoute requiredModule="social"><ApprovalWorkflows /></ProtectedRoute>} />
                <Route path="/social/queues" element={<ProtectedRoute requiredModule="social"><PostingQueues /></ProtectedRoute>} />
                <Route path="/social/inbox" element={<ProtectedRoute requiredModule="social"><SocialInbox /></ProtectedRoute>} />
                <Route path="/social/messages" element={<ProtectedRoute requiredModule="social"><DirectMessages /></ProtectedRoute>} />
                <Route path="/social/auto-reply" element={<ProtectedRoute requiredModule="social"><AutoReplyRules /></ProtectedRoute>} />
                <Route path="/social/listening" element={<ProtectedRoute requiredModule="social"><SocialListening /></ProtectedRoute>} />
                <Route path="/social/integrations" element={<ProtectedRoute requiredModule="social"><PlatformIntegrations /></ProtectedRoute>} />
                <Route path="/social/engagement" element={<ProtectedRoute requiredModule="social"><EngagementTracker /></ProtectedRoute>} />
                
                {/* Sevora Pulse - Company Wall */}
                <Route path="/pulse" element={<ProtectedRoute><PulseFeed /></ProtectedRoute>} />
                <Route path="/pulse/feed" element={<ProtectedRoute><PulseFeed /></ProtectedRoute>} />
                <Route path="/pulse/leadership" element={<ProtectedRoute><LeadershipDashboard /></ProtectedRoute>} />
                <Route path="/pulse/departments" element={<ProtectedRoute><DepartmentWall /></ProtectedRoute>} />
                <Route path="/pulse/departments/:department" element={<ProtectedRoute><DepartmentWall /></ProtectedRoute>} />
                <Route path="/pulse/recognition" element={<ProtectedRoute><Recognition /></ProtectedRoute>} />
                <Route path="/pulse/updates" element={<ProtectedRoute><WorkUpdates /></ProtectedRoute>} />
                <Route path="/pulse/compliance" element={<ProtectedRoute><TeamCompliance /></ProtectedRoute>} />
                <Route path="/pulse/employee/:employeeId" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
                <Route path="/social/analytics" element={<Navigate to="/social" replace />} />
                <Route path="/social/ai-tools" element={<Navigate to="/social" replace />} />
                <Route path="/social/autopilot" element={<Navigate to="/social" replace />} />
                <Route path="/social/youtube" element={<Navigate to="/social" replace />} />
                <Route path="/social/avatar" element={<Navigate to="/social" replace />} />

                {/* Admin Routes */}
                <Route path="/admin/users-permissions" element={<ProtectedRoute requiredModule="admin"><UsersPermissionsPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<Navigate to="/admin/users-permissions" replace />} />
                <Route path="/admin/employees" element={<ProtectedRoute requiredModule="admin"><EmployeeDatabase /></ProtectedRoute>} />
                <Route path="/admin/access-control" element={<Navigate to="/admin/users-permissions" replace />} />
                <Route path="/admin/system-modules" element={<Navigate to="/admin/users-permissions" replace />} />
                <Route path="/admin/organization" element={<ProtectedRoute requiredModule="admin"><OrganizationManagement /></ProtectedRoute>} />
                <Route path="/admin/org-structure" element={<Navigate to="/admin/organization" replace />} />
                <Route path="/admin/website-settings" element={<ProtectedRoute requiredModule="admin"><WebsiteSettings /></ProtectedRoute>} />
                <Route path="/admin/data-import" element={<ProtectedRoute requiredModule="admin"><DataImportPage /></ProtectedRoute>} />
                <Route path="/admin/shared-mailboxes" element={<ProtectedRoute requiredModule="admin"><SharedMailboxesPage /></ProtectedRoute>} />
                <Route path="/admin/mail-settings" element={<ProtectedRoute requiredModule="admin"><MailSettingsPage /></ProtectedRoute>} />
                <Route path="/admin/notification-settings" element={<ProtectedRoute requiredModule="admin"><NotificationSettingsPage /></ProtectedRoute>} />
                <Route path="/admin/api-keys" element={<ProtectedRoute requiredModule="admin"><APIKeysSettingsPage /></ProtectedRoute>} />

                {/* Systems Module Routes */}
                <Route path="/systems" element={<ProtectedRoute requiredModule="systems"><SystemsPage /></ProtectedRoute>} />
                <Route path="/systems/integrations" element={<ProtectedRoute requiredModule="systems"><IntegrationsPage /></ProtectedRoute>} />
                <Route path="/systems/config" element={<ProtectedRoute requiredModule="systems"><SystemConfigPage /></ProtectedRoute>} />

                {/* IT Admin Module Routes */}
                <Route path="/it-admin" element={<ProtectedRoute requiredModule="admin"><ITAdminHub /></ProtectedRoute>} />
                <Route path="/it-admin/tools-access" element={<ProtectedRoute requiredModule="admin"><ToolsAccessTable /></ProtectedRoute>} />
                <Route path="/it-admin/credentials" element={<ProtectedRoute requiredModule="admin"><ITAdminHub defaultTab="credentials" /></ProtectedRoute>} />
                <Route path="/it-admin/*" element={<ProtectedRoute requiredModule="admin"><ITAdminHub /></ProtectedRoute>} />

                {/* Finance Admin Routes */}
                <Route path="/finance/budgets" element={<ProtectedRoute requiredModule="finance"><BudgetPlanning /></ProtectedRoute>} />
                <Route path="/finance/payments" element={<ProtectedRoute requiredModule="finance"><PaymentRequests /></ProtectedRoute>} />
                <Route path="/finance/payment-categories" element={<ProtectedRoute requiredModule="finance"><PaymentCategorySettings /></ProtectedRoute>} />

                {/* Vendor Management Routes */}
                <Route path="/vendors" element={<ProtectedRoute requiredModule="finance"><VendorDashboard /></ProtectedRoute>} />
                <Route path="/vendors/database" element={<ProtectedRoute requiredModule="finance"><VendorDatabase /></ProtectedRoute>} />
                <Route path="/vendors/details/:vendorId" element={<ProtectedRoute requiredModule="finance"><VendorDetails /></ProtectedRoute>} />
                <Route path="/vendors/requests" element={<ProtectedRoute requiredModule="finance"><WorkRequests /></ProtectedRoute>} />
                <Route path="/vendors/work-orders" element={<ProtectedRoute requiredModule="finance"><WorkOrders /></ProtectedRoute>} />
                <Route path="/vendors/recurring" element={<ProtectedRoute requiredModule="finance"><RecurringWork /></ProtectedRoute>} />
                <Route path="/vendors/approvals" element={<ProtectedRoute requiredModule="finance"><VendorApprovals /></ProtectedRoute>} />

                {/* Settings Routes */}
                <Route path="/settings/automations" element={<ProtectedRoute requiredModule="automations"><AutomationSettings /></ProtectedRoute>} />

                {/* Goals & Objectives Routes */}
                <Route path="/goals" element={<ProtectedRoute requiredModule="project_management"><GoalsDashboard /></ProtectedRoute>} />
                <Route path="/goals/strategic" element={<ProtectedRoute requiredModule="project_management"><StrategicGoals /></ProtectedRoute>} />
                <Route path="/goals/objectives" element={<ProtectedRoute requiredModule="project_management"><Objectives /></ProtectedRoute>} />
                <Route path="/goals/objectives/:objectiveId" element={<ProtectedRoute requiredModule="project_management"><ObjectiveDetail /></ProtectedRoute>} />
                <Route path="/goals/fiscal-years" element={<ProtectedRoute requiredModule="project_management"><FiscalYears /></ProtectedRoute>} />

                {/* Project Management Routes */}
                <Route path="/projects" element={<ProtectedRoute requiredModule="project_management"><ProjectsList /></ProtectedRoute>} />
                <Route path="/projects/my-tasks" element={<ProtectedRoute requiredModule="project_management"><MyTasks /></ProtectedRoute>} />
                <Route path="/projects/recurring" element={<ProtectedRoute requiredModule="project_management"><RecurringTasks /></ProtectedRoute>} />
                <Route path="/projects/kanban" element={<ProtectedRoute requiredModule="project_management"><KanbanBoard /></ProtectedRoute>} />
                <Route path="/projects/sprints" element={<ProtectedRoute requiredModule="project_management"><SprintsPage /></ProtectedRoute>} />
                <Route path="/projects/sprints/:projectId" element={<ProtectedRoute requiredModule="project_management"><SprintsPage /></ProtectedRoute>} />
                <Route path="/projects/milestones" element={<ProtectedRoute requiredModule="project_management"><MilestonesPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/epics" element={<ProtectedRoute requiredModule="project_management"><EpicsPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/backlog" element={<ProtectedRoute requiredModule="project_management"><BacklogPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/sprint-planning" element={<ProtectedRoute requiredModule="project_management"><SprintPlanningPage /></ProtectedRoute>} />
                <Route path="/projects/manager" element={<ProtectedRoute requiredModule="project_management"><ManagerDashboard /></ProtectedRoute>} />
                <Route path="/projects/:projectId" element={<ProtectedRoute requiredModule="project_management"><ProjectDetail /></ProtectedRoute>} />

                {/* Engineering Module Routes */}
                <Route path="/engineering/projects" element={<ProtectedRoute requiredModule="project_management"><EngineeringProjectsPage /></ProtectedRoute>} />
                <Route path="/engineering/sprint-board" element={<ProtectedRoute requiredModule="project_management"><GlobalSprintBoardPage /></ProtectedRoute>} />
                <Route path="/engineering/backlog" element={<ProtectedRoute requiredModule="project_management"><GlobalBacklogPage /></ProtectedRoute>} />
                <Route path="/engineering/epics" element={<ProtectedRoute requiredModule="project_management"><GlobalEpicsPage /></ProtectedRoute>} />
                <Route path="/engineering/sprints" element={<ProtectedRoute requiredModule="project_management"><GlobalSprintPlanningPage /></ProtectedRoute>} />
                <Route path="/engineering/reports" element={<ProtectedRoute requiredModule="project_management"><EngineeringReportsPage /></ProtectedRoute>} />
                <Route path="/engineering/roadmap" element={<ProtectedRoute requiredModule="project_management"><RoadmapPage /></ProtectedRoute>} />
                <Route path="/engineering/releases" element={<ProtectedRoute requiredModule="project_management"><ReleasesPage /></ProtectedRoute>} />
                <Route path="/engineering/workflows" element={<ProtectedRoute requiredModule="project_management"><WorkflowsPage /></ProtectedRoute>} />
                <Route path="/engineering/automations" element={<ProtectedRoute requiredModule="project_management"><AutomationsPage /></ProtectedRoute>} />
                <Route path="/engineering/feature-parser" element={<ProtectedRoute requiredModule="project_management"><FeatureParserPage /></ProtectedRoute>} />
                <Route path="/engineering/knowledge" element={<ProtectedRoute requiredModule="project_management"><KnowledgeBasePage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/sprint-board" element={<ProtectedRoute requiredModule="project_management"><SprintBoardPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/sprint-board/:sprintId" element={<ProtectedRoute requiredModule="project_management"><SprintBoardPage /></ProtectedRoute>} />
                <Route path="/projects/engineering/backlog" element={<ProtectedRoute requiredModule="project_management"><GlobalBacklogPage /></ProtectedRoute>} />
                <Route path="/projects/engineering/reports" element={<ProtectedRoute requiredModule="project_management"><EngineeringReportsPage /></ProtectedRoute>} />

                {/* Knowledge Base Routes */}
                <Route path="/knowledge" element={<ProtectedRoute requiredModule="project_management"><KnowledgeBasePage /></ProtectedRoute>} />
                <Route path="/knowledge/space/:spaceId" element={<ProtectedRoute requiredModule="project_management"><SpaceDetailPage /></ProtectedRoute>} />
                <Route path="/knowledge/page/:pageId" element={<ProtectedRoute requiredModule="project_management"><PageEditorPage /></ProtectedRoute>} />

                {/* Unified Task Management Routes */}
                <Route path="/tasks" element={<ProtectedRoute requiredModule="project_management"><UnifiedTasksPage /></ProtectedRoute>} />
                <Route path="/tasks/approvals" element={<ProtectedRoute requiredModule="project_management"><ApprovalsPage /></ProtectedRoute>} />
                <Route path="/tasks/activities" element={<ProtectedRoute requiredModule="project_management"><ActivityFeedPage /></ProtectedRoute>} />
                <Route path="/tasks/triggers" element={<ProtectedRoute requiredModule="project_management"><TaskTriggersPage /></ProtectedRoute>} />

                {/* Notifications */}
                <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />

                {/* Help & Support */}
                <Route path="/help" element={<ProtectedRoute requiredModule="help_support"><HelpCenter /></ProtectedRoute>} />
                <Route path="/help/admin" element={<ProtectedRoute requiredModule="admin"><HelpAdminDashboard /></ProtectedRoute>} />
                <Route path="/help/modules/:moduleKey" element={<ProtectedRoute requiredModule="help_support"><HelpModuleDetail /></ProtectedRoute>} />
                <Route path="/help/tickets/:ticketId" element={<ProtectedRoute requiredModule="help_support"><TicketDetail /></ProtectedRoute>} />
                <Route path="/help/articles/:articleId" element={<ProtectedRoute requiredModule="help_support"><ArticleViewer /></ProtectedRoute>} />

                {/* Meetings & Reviews */}
                <Route path="/meetings" element={<ProtectedRoute requiredModule="meetings"><MeetingList /></ProtectedRoute>} />
                <Route path="/meetings/new" element={<ProtectedRoute requiredModule="meetings"><CreateMeeting /></ProtectedRoute>} />
                <Route path="/meetings/templates" element={<ProtectedRoute requiredModule="meetings"><MeetingTemplates /></ProtectedRoute>} />
                <Route path="/meetings/:meetingId" element={<ProtectedRoute requiredModule="meetings"><MeetingDetail /></ProtectedRoute>} />
                <Route path="/meetings/:meetingId/edit" element={<ProtectedRoute requiredModule="meetings"><CreateMeeting /></ProtectedRoute>} />

                {/* HR Routes */}
                <Route path="/hr/expenses" element={<ProtectedRoute requiredModule="hr"><ExpenseManagement /></ProtectedRoute>} />
                <Route path="/hr/my-team" element={<ProtectedRoute><MyTeam /></ProtectedRoute>} />

                {/* Teams Routes */}
                <Route path="/teams/chat" element={<ProtectedRoute requiredModule="communication_hub"><TeamsChat /></ProtectedRoute>} />
                <Route path="/teams/calendar" element={<ProtectedRoute requiredModule="communication_hub"><TeamsCalendar /></ProtectedRoute>} />
                <Route path="/teams/calendar/:eventId" element={<ProtectedRoute requiredModule="communication_hub"><TeamsEventDetail /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute requiredModule="communication_hub"><CombinedCalendarPage /></ProtectedRoute>} />
                <Route path="/calendar/unified" element={<ProtectedRoute><UnifiedCalendarPage /></ProtectedRoute>} />
                <Route path="/teams/callback" element={<TeamsCallback />} />

                {/* Analytics & Insights Routes */}
                <Route path="/analytics" element={<ProtectedRoute requiredModule="dashboard"><AnalyticsTeamDashboard /></ProtectedRoute>} />
                <Route path="/analytics/team-dashboard" element={<ProtectedRoute requiredModule="dashboard"><AnalyticsTeamDashboard /></ProtectedRoute>} />
                <Route path="/analytics/reports" element={<ProtectedRoute requiredModule="dashboard"><ReportsPage /></ProtectedRoute>} />

                {/* Buying & Sourcing Routes */}
                <Route path="/sourcing" element={<ProtectedRoute requiredModule="project_management"><SourcingDashboard /></ProtectedRoute>} />
                <Route path="/sourcing/brands" element={<ProtectedRoute requiredModule="project_management"><BrandsPage /></ProtectedRoute>} />
                <Route path="/sourcing/brands/pipeline" element={<ProtectedRoute requiredModule="project_management"><BrandPipeline /></ProtectedRoute>} />
                <Route path="/sourcing/brands/onboarding" element={<ProtectedRoute requiredModule="project_management"><BrandOnboardingPipeline /></ProtectedRoute>} />
                <Route path="/sourcing/templates" element={<ProtectedRoute requiredModule="project_management"><EmailTemplatesPage /></ProtectedRoute>} />
                <Route path="/sourcing/brands/:id" element={<ProtectedRoute requiredModule="project_management"><BrandDetailPage /></ProtectedRoute>} />
                <Route path="/sourcing/brands/:id/edit" element={<ProtectedRoute requiredModule="project_management"><BrandDetailPage editMode={true} /></ProtectedRoute>} />
                <Route path="/sourcing/suppliers" element={<ProtectedRoute requiredModule="project_management"><SuppliersPage /></ProtectedRoute>} />
                <Route path="/sourcing/suppliers/pipeline" element={<ProtectedRoute requiredModule="project_management"><SupplierPipeline /></ProtectedRoute>} />
                <Route path="/sourcing/suppliers/:id" element={<ProtectedRoute requiredModule="project_management"><SupplierDetailPage /></ProtectedRoute>} />
                <Route path="/sourcing/manufacturers" element={<ProtectedRoute requiredModule="project_management"><ManufacturersPage /></ProtectedRoute>} />
                <Route path="/sourcing/manufacturers/pipeline" element={<ProtectedRoute requiredModule="project_management"><ManufacturerPipeline /></ProtectedRoute>} />
                <Route path="/sourcing/manufacturers/:id" element={<ProtectedRoute requiredModule="project_management"><ManufacturerDetailPage /></ProtectedRoute>} />
                <Route path="/sourcing/samples" element={<ProtectedRoute requiredModule="project_management"><SamplesPage /></ProtectedRoute>} />
                <Route path="/sourcing/discovery" element={<ProtectedRoute requiredModule="project_management"><SourcingAIDiscoveryPage /></ProtectedRoute>} />
                <Route path="/sourcing/campaigns" element={<ProtectedRoute requiredModule="project_management"><SourcingEmailCampaignsPage /></ProtectedRoute>} />
                <Route path="/sourcing/calendar" element={<ProtectedRoute requiredModule="project_management"><SourcingCalendarPage /></ProtectedRoute>} />
                <Route path="/sourcing/settings" element={<ProtectedRoute requiredModule="project_management"><SourcingSettingsPage /></ProtectedRoute>} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

function App() {
    return (
        <MsalInitializer>
            <MsalProvider instance={msalInstance}>
                <BrowserRouter>
                    <AuthProvider>
                        <PermissionProvider>
                            <AppRoutes />
                            <Toaster position="top-right" richColors />
                        </PermissionProvider>
                    </AuthProvider>
                </BrowserRouter>
            </MsalProvider>
        </MsalInitializer>
    );
}

export default App;
