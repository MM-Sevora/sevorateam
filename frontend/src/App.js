import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { TourProvider } from "./components/GuidedTour";
import { Layout } from "./components/Layout";
import { msalConfig } from "./authConfig";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

// Marketing Pages
import CampaignsPage from "./pages/marketing/Campaigns";
import OutreachPage from "./pages/marketing/Outreach";
import NegotiationsPage from "./pages/marketing/Negotiations";
import AIToolsPage from "./pages/marketing/AITools";
import BudgetPage from "./pages/marketing/Budget";

// Marketing V2 Pages (Current)
import ContentAssetsPage from "./pages/marketing/ContentAssetsPage";
import InfluencersListPage from "./pages/marketing/InfluencersListPage";
import InfluencerDetailPage from "./pages/marketing/InfluencerDetailPage";
import CampaignDetailPage from "./pages/marketing/CampaignDetailsPage"; // Enhanced version with cross-module tabs
import CampaignHubPage from "./pages/marketing/CampaignHubPage";
import MarketingInsightsPage from "./pages/marketing/MarketingInsightsPage";
import AIDiscoveryPage from "./pages/marketing/AIDiscoveryPage";
import InfluencerDiscoveryPage from "./pages/marketing/InfluencerDiscoveryPage";
import PublicInfluencerDiscoveryPage from "./pages/marketing/PublicInfluencerDiscoveryPage";
import PublicationsListPage from "./pages/marketing/PublicationsListPage";
import PublicationDetailPage from "./pages/marketing/PublicationDetailPage";
import UnifiedPipeline from "./pages/marketing/UnifiedPipeline";

// Marketing V3 Pages (Phase 1 - Digital Ads & Creative Assets)
import DigitalAdsPage from "./pages/marketing/DigitalAdsPage";
import CreativeAssetsPage from "./pages/marketing/CreativeAssetsPage";

// Marketing V3 Pages (Phase 2 - Content Production & Promotion)
import ContentProductionPage from "./pages/marketing/ContentProductionPage";
import ContentPromotionPage from "./pages/marketing/ContentPromotionPage";

// Marketing V3 Pages (Phase 3 - Budget Management)
import BudgetManagementPage from "./pages/marketing/BudgetManagementPage";

// Marketing V3 Pages - Publications Pipeline
import PublicationsPipelinePage from "./pages/marketing/PublicationsPipelinePage";

// Marketing V3 Pages - Settings
import MarketingSettingsPage from "./pages/marketing/MarketingSettingsPage";
import MarketingCalendarPage from "./pages/marketing/MarketingCalendarPage";
import MarketingEmailCampaignsPage from "./pages/marketing/EmailCampaignsPage";

// Marketing V3 Pages - Campaign Details
import CampaignDetailsPage from "./pages/marketing/CampaignDetailsPage";

// Sales Pages
import { SalesDashboard } from "./pages/sales/Dashboard";
import { LeadsPage } from "./pages/sales/Leads";
import CustomersPage from "./pages/sales/Customers";
import PipelinePage from "./pages/sales/Pipeline";
import QRCodesPage from "./pages/sales/QRCodes";
import PartnersPage from "./pages/sales/Partners";
import WeddingPlannerPage from "./pages/sales/WeddingPlanner";
import LeadCapturePage from "./pages/sales/LeadCapture";
import SalesAnalyticsPage from "./pages/sales/Analytics";

// Social Pages
import { SocialDashboard } from "./pages/social/Dashboard";
import ContentStudio from "./pages/social/ContentStudio";
import PostsAndSchedulePage from "./pages/social/PostsAndSchedule";
import ContentLibraryPage from "./pages/social/ContentLibrary";
import SocialCampaigns from "./pages/social/SocialCampaigns";
import CampaignDetail from "./pages/social/CampaignDetail";
import ApprovalWorkflows from "./pages/social/ApprovalWorkflows";
import PostingQueues from "./pages/social/PostingQueues";
import SocialInbox from "./pages/social/SocialInbox";
import DirectMessages from "./pages/social/DirectMessages";
import AutoReplyRules from "./pages/social/AutoReplyRules";
import SocialAnalyticsDashboard from "./pages/social/SocialAnalyticsDashboard";
import SocialListening from "./pages/social/SocialListening";
import PlatformIntegrations from "./pages/social/PlatformIntegrations";
import EngagementTracker from "./pages/social/EngagementTracker";
import PulseFeed from "./pages/pulse/PulseFeed";
import LeadershipDashboard from "./pages/pulse/LeadershipDashboard";
import DepartmentWall from "./pages/pulse/DepartmentWall";
import Recognition from "./pages/pulse/Recognition";
import WorkUpdates from "./pages/pulse/WorkUpdates";
import EmployeeProfile from "./pages/pulse/EmployeeProfile";

// Email Page
import EmailPage from "./pages/marketing/EmailPage";

// Admin Pages
import UserManagementPage from "./pages/admin/UserManagement";
import OrganizationManagement from "./pages/admin/OrganizationManagement";
import TeamDashboard from "./pages/admin/TeamDashboard";
import EmployeeDatabase from "./pages/admin/EmployeeDatabase";
import AccessControlPage from "./pages/admin/AccessControlPage";
import WebsiteSettings from "./pages/admin/WebsiteSettings";
import SystemModulesPage from "./pages/admin/SystemModulesPage";
import UsersPermissionsPage from "./pages/admin/UsersPermissionsPage";
import DataImportPage from "./pages/admin/DataImportPage";
import SharedMailboxesPage from "./pages/admin/SharedMailboxesPage";
import MailSettingsPage from "./pages/admin/MailSettingsPage";
import NotificationSettingsPage from "./pages/admin/NotificationSettingsPage";
import APIKeysSettingsPage from "./pages/admin/APIKeysSettingsPage";

// Settings Pages
import AutomationSettings from "./pages/settings/AutomationSettings";

// Project Management Pages
import MyTasks from "./pages/projects/MyTasks";
import ProjectsList from "./pages/projects/ProjectsList";
import ProjectDetail from "./pages/projects/ProjectDetail";
import ManagerDashboard from "./pages/projects/ManagerDashboard";
import RecurringTasks from "./pages/projects/RecurringTasks";
import KanbanBoard from "./pages/projects/KanbanBoard";
import SprintsPage from "./pages/projects/SprintsPage";
import SprintPlanningPage from "./pages/projects/SprintPlanningPage";
import MilestonesPage from "./pages/projects/MilestonesPage";
import EpicsPage from "./pages/projects/EpicsPage";
import BacklogPage from "./pages/projects/BacklogPage";
import GlobalBacklogPage from "./pages/projects/GlobalBacklogPage";
import EngineeringReportsPage from "./pages/projects/EngineeringReportsPage";

// Engineering Module Pages
import GlobalEpicsPage from "./pages/engineering/GlobalEpicsPage";
import GlobalSprintPlanningPage from "./pages/engineering/GlobalSprintPlanningPage";
import WorkflowsPage from "./pages/engineering/WorkflowsPage";
import EngineeringProjectsPage from "./pages/engineering/EngineeringProjectsPage";

// Knowledge Base Pages
import KnowledgeBasePage from "./pages/knowledge/KnowledgeBasePage";
import SpaceDetailPage from "./pages/knowledge/SpaceDetailPage";
import PageEditorPage from "./pages/knowledge/PageEditorPage";

// Unified Task Management Pages
import UnifiedTasksPage from "./pages/tasks/UnifiedTasksPage";
import ActivityFeedPage from "./pages/tasks/ActivityFeedPage";
import TaskTriggersPage from "./pages/tasks/TaskTriggersPage";
import ApprovalsPage from "./pages/tasks/ApprovalsPage";

// Goals & Objectives Pages
import GoalsDashboard from "./pages/goals/GoalsDashboard";
import StrategicGoals from "./pages/goals/StrategicGoals";
import FiscalYears from "./pages/goals/FiscalYears";
import Objectives from "./pages/goals/Objectives";
import ObjectiveDetail from "./pages/goals/ObjectiveDetail";

// Meetings & Reviews Pages
import MeetingList from "./pages/meetings/MeetingList";
import CreateMeeting from "./pages/meetings/CreateMeeting";
import MeetingDetail from "./pages/meetings/MeetingDetail";
import MeetingTemplates from "./pages/meetings/MeetingTemplates";

// Notifications
import NotificationCenter from "./pages/notifications/NotificationCenter";

// Help & Support
import HelpCenter from "./pages/help/HelpCenter";
import HelpModuleDetail from "./pages/help/HelpModuleDetail";
import TicketDetail from "./pages/help/TicketDetail";
import ArticleViewer from "./pages/help/ArticleViewer";
import HelpAdminDashboard from "./pages/help/HelpAdminDashboard";

// HR Pages
import ExpenseManagement from "./pages/hr/ExpenseManagement";

// Teams Pages
import TeamsChat from "./pages/teams/TeamsChat";
import TeamsCallback from "./pages/teams/TeamsCallback";
import TeamsCalendar from "./pages/teams/TeamsCalendar";
import TeamsEventDetail from "./pages/teams/TeamsEventDetail";
import UnifiedCalendarPage from "./pages/calendar/UnifiedCalendarPage";
import CombinedCalendarPage from "./pages/calendar/CombinedCalendarPage";

// Analytics & Insights
import AnalyticsTeamDashboard from "./pages/analytics/TeamDashboard";
import ReportsPage from "./pages/analytics/ReportsPage";

// Buying & Sourcing
import SourcingDashboard from "./pages/sourcing/SourcingDashboard";
import BrandsPage from "./pages/sourcing/BrandsPage";
import BrandDetailPage from "./pages/sourcing/BrandDetailPage";
import BrandPipeline from "./pages/sourcing/BrandPipeline";
import SuppliersPage from "./pages/sourcing/SuppliersPage";
import SupplierDetailPage from "./pages/sourcing/SupplierDetailPage";
import SupplierPipeline from "./pages/sourcing/SupplierPipeline";
import ManufacturersPage from "./pages/sourcing/ManufacturersPage";
import ManufacturerDetailPage from "./pages/sourcing/ManufacturerDetailPage";
import ManufacturerPipeline from "./pages/sourcing/ManufacturerPipeline";
import SamplesPage from "./pages/sourcing/SamplesPage";
import SourcingAIDiscoveryPage from "./pages/sourcing/AIDiscoveryPage";
import EmailCampaignsPage from "./pages/sourcing/EmailCampaignsPage";
import SourcingCalendarPage from "./pages/sourcing/SourcingCalendarPage";
import SourcingSettingsPage from "./pages/sourcing/SourcingSettingsPage";

// Systems Module
import SystemsPage from "./pages/systems/SystemsPage";
import IntegrationsPage from "./pages/systems/IntegrationsPage";
import SystemConfigPage from "./pages/systems/SystemConfigPage";

// IT Admin Module
import ITAdminHub from "./pages/it-admin/ITAdminHub";
import ToolsAccessTable from "./pages/it-admin/ToolsAccessTable";

// Finance Admin
import BudgetPlanning from "./pages/finance/BudgetPlanning";
import PaymentRequests from "./pages/finance/PaymentRequests";
import PaymentCategorySettings from "./pages/finance/PaymentCategorySettings";

// Vendor Management
import VendorDashboard from "./pages/vendors/VendorDashboard";
import VendorDatabase from "./pages/vendors/VendorDatabase";
import VendorDetails from "./pages/vendors/VendorDetails";
import WorkRequests from "./pages/vendors/WorkRequests";
import WorkOrders from "./pages/vendors/WorkOrders";
import RecurringWork from "./pages/vendors/RecurringWork";
import Approvals from "./pages/vendors/Approvals";

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
                
                // Check if this is a redirect from Microsoft (has code in hash)
                const hasAuthCode = window.location.hash.includes('code=');
                console.log('Has auth code in URL:', hasAuthCode);
                
                // Check login type before processing
                const loginType = sessionStorage.getItem('msalLoginType');
                const redirectPath = sessionStorage.getItem('msalRedirectPath');
                console.log('Login type from session:', loginType);
                console.log('Redirect path from session:', redirectPath);
                
                if (hasAuthCode) {
                    console.log('Processing redirect response...');
                    
                    try {
                        const response = await msalInstance.handleRedirectPromise();
                        console.log('Redirect response:', response ? 'GOT RESPONSE with token' : 'NO RESPONSE');
                        
                        // Clear session storage
                        sessionStorage.removeItem('msalLoginType');
                        sessionStorage.removeItem('msalRedirectPath');
                        
                        if (response && response.accessToken) {
                            console.log('Token acquired for account:', response.account?.username);
                            
                            if (loginType === 'email') {
                                // This was for email/mail connection - redirect back to mail page
                                console.log('Email connection successful! Redirecting to mail...');
                                window.history.replaceState({}, document.title, redirectPath || '/mail/inbox');
                                window.location.href = redirectPath || '/mail/inbox';
                                return;
                            } else if (loginType === 'calendar') {
                                // This was for calendar connection - redirect back to calendar page
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
                                        
                                        // Store tokens
                                        localStorage.setItem('sevora_token', data.access_token);
                                        localStorage.setItem('token', data.access_token);
                                        localStorage.setItem('user', JSON.stringify(data.user));
                                        localStorage.setItem('sevora_auth_method', 'azure');
                                        
                                        // Clear the hash and redirect
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
                                // Unknown login type but we have tokens - just clean URL
                                console.log('Unknown login type, cleaning URL');
                                window.history.replaceState({}, document.title, '/');
                            }
                        } else {
                            // No response but had auth code - clean up URL
                            console.log('No token in response, cleaning URL');
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } catch (handleError) {
                        console.error('handleRedirectPromise error:', handleError);
                        
                        // Clear session storage
                        sessionStorage.removeItem('msalLoginType');
                        sessionStorage.removeItem('msalRedirectPath');
                        
                        // Clear the hash to prevent infinite loop
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
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check module-based access (NEW system - preferred)
    if (requiredModule && !hasModuleAccess(requiredModule)) {
        return <Navigate to="/" replace />;
    }

    // DEPRECATED: Check department-based access (OLD system - for backward compatibility only)
    // This will be removed in a future version
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
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/capture" element={<LeadCapturePage />} />

            {/* Main Dashboard */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Marketing Routes */}
            {/* Unified Insights & Analytics (Dashboard + Analytics merged) */}
            <Route path="/marketing" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingInsightsPage /></ProtectedRoute>} />
            <Route path="/marketing/dashboard" element={<Navigate to="/marketing" replace />} />
            <Route path="/marketing/analytics" element={<Navigate to="/marketing" replace />} />
            <Route path="/marketing/influencers" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencersListPage /></ProtectedRoute>} />
            <Route path="/marketing/influencer/:influencerId" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencerDetailPage /></ProtectedRoute>} />
            <Route path="/marketing/discovery" element={<ProtectedRoute requiredModule="marketing_ops"><InfluencerDiscoveryPage /></ProtectedRoute>} />
            <Route path="/marketing/public-discovery" element={<ProtectedRoute requiredModule="marketing_ops"><PublicInfluencerDiscoveryPage /></ProtectedRoute>} />
            {/* Redirect old PR route to Publications */}
            <Route path="/marketing/pr" element={<Navigate to="/marketing/publications" replace />} />
            {/* Publications (PR equivalent of Influencers) */}
            <Route path="/marketing/publications" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationsListPage /></ProtectedRoute>} />
            <Route path="/marketing/publications/pipeline" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationsPipelinePage /></ProtectedRoute>} />
            <Route path="/marketing/publication/:publicationId" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationDetailPage /></ProtectedRoute>} />
            {/* Unified Campaign Hub (List + Calendar + Timeline) */}
            <Route path="/marketing/campaigns" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignHubPage /></ProtectedRoute>} />
            <Route path="/marketing/campaign/:campaignId" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignDetailPage /></ProtectedRoute>} />
            {/* Legacy calendar route redirects to Campaign Hub */}
            <Route path="/marketing/calendar" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingCalendarPage /></ProtectedRoute>} />
            {/* Redirect old contacts routes to influencers */}
            <Route path="/marketing/contacts" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/contacts/:contactId" element={<Navigate to="/marketing/influencers" replace />} />
            {/* Phase 1: Digital Ads & Creative Assets */}
            <Route path="/marketing/ads" element={<ProtectedRoute requiredModule="marketing_ops"><DigitalAdsPage /></ProtectedRoute>} />
            <Route path="/marketing/assets" element={<ProtectedRoute requiredModule="marketing_ops"><CreativeAssetsPage /></ProtectedRoute>} />
            {/* Legacy redirect */}
            <Route path="/marketing/creative-assets" element={<Navigate to="/marketing/assets" replace />} />
            {/* Phase 2: Content Production & Promotion */}
            <Route path="/marketing/content" element={<ProtectedRoute requiredModule="marketing_ops"><ContentProductionPage /></ProtectedRoute>} />
            <Route path="/marketing/content-promotion" element={<ProtectedRoute requiredModule="marketing_ops"><ContentPromotionPage /></ProtectedRoute>} />
            {/* Phase 3: Budget Management */}
            <Route path="/marketing/budget-management" element={<ProtectedRoute requiredModule="marketing_ops"><BudgetManagementPage /></ProtectedRoute>} />
            {/* Legacy Budget page */}
            <Route path="/marketing/budget" element={<ProtectedRoute requiredModule="marketing_ops"><BudgetPage /></ProtectedRoute>} />
            {/* AI Tools with Influencer Discovery */}
            <Route path="/marketing/ai-tools" element={<ProtectedRoute requiredModule="marketing_ops"><AIToolsPage /></ProtectedRoute>} />
            <Route path="/marketing/ai-discovery" element={<ProtectedRoute requiredModule="marketing_ops"><AIDiscoveryPage /></ProtectedRoute>} />
            {/* Marketing Settings/Config */}
            <Route path="/marketing/settings" element={<ProtectedRoute requiredModule="marketing_ops"><MarketingSettingsPage /></ProtectedRoute>} />
            {/* Legacy Marketing Routes - kept for backward compatibility */}
            <Route path="/marketing/outreach" element={<ProtectedRoute requiredModule="marketing_ops"><OutreachPage /></ProtectedRoute>} />
            <Route path="/marketing/negotiations" element={<ProtectedRoute requiredModule="marketing_ops"><NegotiationsPage /></ProtectedRoute>} />
            {/* Unified Pipeline - replaces Outreach Dashboard & Deal Pipeline */}
            <Route path="/marketing/pipeline" element={<ProtectedRoute requiredModule="marketing_ops"><UnifiedPipeline /></ProtectedRoute>} />
            {/* Redirect old routes to unified pipeline */}
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
            <Route path="/pulse/employee/:employeeId" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            {/* Redirect old routes to dashboard */}
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
            {/* /admin/org-structure merged into /admin/organization */}
            <Route path="/admin/org-structure" element={<Navigate to="/admin/organization" replace />} />
            <Route path="/admin/website-settings" element={<ProtectedRoute requiredModule="admin"><WebsiteSettings /></ProtectedRoute>} />
            <Route path="/admin/data-import" element={<ProtectedRoute requiredModule="admin"><DataImportPage /></ProtectedRoute>} />
            <Route path="/admin/shared-mailboxes" element={<ProtectedRoute requiredModule="admin"><SharedMailboxesPage /></ProtectedRoute>} />
            <Route path="/admin/mail-settings" element={<ProtectedRoute requiredModule="admin"><MailSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/notification-settings" element={<ProtectedRoute requiredModule="admin"><NotificationSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/api-keys" element={<ProtectedRoute requiredModule="admin"><APIKeysSettingsPage /></ProtectedRoute>} />
            {/* /admin/team removed - use Team Dashboard under Analytics & Insights instead */}

            {/* Systems Module Routes */}
            <Route path="/systems" element={<ProtectedRoute requiredModule="systems"><SystemsPage /></ProtectedRoute>} />
            <Route path="/systems/integrations" element={<ProtectedRoute requiredModule="systems"><IntegrationsPage /></ProtectedRoute>} />
            <Route path="/systems/config" element={<ProtectedRoute requiredModule="systems"><SystemConfigPage /></ProtectedRoute>} />

            {/* IT Admin Module Routes (Access & Credential Management) */}
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
            <Route path="/vendors/approvals" element={<ProtectedRoute requiredModule="finance"><Approvals /></ProtectedRoute>} />

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
            <Route path="/engineering/backlog" element={<ProtectedRoute requiredModule="project_management"><GlobalBacklogPage /></ProtectedRoute>} />
            <Route path="/engineering/epics" element={<ProtectedRoute requiredModule="project_management"><GlobalEpicsPage /></ProtectedRoute>} />
            <Route path="/engineering/sprints" element={<ProtectedRoute requiredModule="project_management"><GlobalSprintPlanningPage /></ProtectedRoute>} />
            <Route path="/engineering/reports" element={<ProtectedRoute requiredModule="project_management"><EngineeringReportsPage /></ProtectedRoute>} />
            <Route path="/engineering/workflows" element={<ProtectedRoute requiredModule="project_management"><WorkflowsPage /></ProtectedRoute>} />
            <Route path="/engineering/knowledge" element={<ProtectedRoute requiredModule="project_management"><KnowledgeBasePage /></ProtectedRoute>} />
            <Route path="/engineering/knowledge/search" element={<ProtectedRoute requiredModule="project_management"><KnowledgeBasePage /></ProtectedRoute>} />
            {/* Legacy routes - redirect to new paths */}
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
            <Route path="/sourcing/campaigns" element={<ProtectedRoute requiredModule="project_management"><EmailCampaignsPage /></ProtectedRoute>} />
            <Route path="/sourcing/calendar" element={<ProtectedRoute requiredModule="project_management"><SourcingCalendarPage /></ProtectedRoute>} />
            <Route path="/sourcing/settings" element={<ProtectedRoute requiredModule="project_management"><SourcingSettingsPage /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
