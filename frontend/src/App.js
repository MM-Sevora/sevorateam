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
import CampaignDetailPage from "./pages/marketing/CampaignDetailPage";
import CampaignHubPage from "./pages/marketing/CampaignHubPage";
import MarketingInsightsPage from "./pages/marketing/MarketingInsightsPage";
import AIDiscoveryPage from "./pages/marketing/AIDiscoveryPage";
import PublicationsListPage from "./pages/marketing/PublicationsListPage";
import PublicationDetailPage from "./pages/marketing/PublicationDetailPage";
import UnifiedPipeline from "./pages/marketing/UnifiedPipeline";

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

// Email Page
import EmailPage from "./pages/marketing/EmailPage";

// Admin Pages
import UserManagementPage from "./pages/admin/UserManagement";
import OrganizationManagement from "./pages/admin/OrganizationManagement";
import TeamDashboard from "./pages/admin/TeamDashboard";
import EmployeeDatabase from "./pages/admin/EmployeeDatabase";
import AccessControlPage from "./pages/admin/AccessControlPage";
import WebsiteSettings from "./pages/admin/WebsiteSettings";

// Settings Pages
import AutomationSettings from "./pages/settings/AutomationSettings";

// Project Management Pages
import MyTasks from "./pages/projects/MyTasks";
import ProjectsList from "./pages/projects/ProjectsList";
import ProjectDetail from "./pages/projects/ProjectDetail";
import ManagerDashboard from "./pages/projects/ManagerDashboard";
import RecurringTasks from "./pages/projects/RecurringTasks";

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

// Analytics & Insights
import AnalyticsTeamDashboard from "./pages/analytics/TeamDashboard";
import ReportsPage from "./pages/analytics/ReportsPage";

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
            {/* Redirect old PR route to Publications */}
            <Route path="/marketing/pr" element={<Navigate to="/marketing/publications" replace />} />
            {/* Publications (PR equivalent of Influencers) */}
            <Route path="/marketing/publications" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationsListPage /></ProtectedRoute>} />
            <Route path="/marketing/publication/:publicationId" element={<ProtectedRoute requiredModule="marketing_ops"><PublicationDetailPage /></ProtectedRoute>} />
            {/* Unified Campaign Hub (List + Calendar + Timeline) */}
            <Route path="/marketing/campaigns" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignHubPage /></ProtectedRoute>} />
            <Route path="/marketing/campaign/:campaignId" element={<ProtectedRoute requiredModule="marketing_ops"><CampaignDetailPage /></ProtectedRoute>} />
            {/* Legacy calendar route redirects to Campaign Hub */}
            <Route path="/marketing/calendar" element={<Navigate to="/marketing/campaigns" replace />} />
            {/* Redirect old contacts routes to influencers */}
            <Route path="/marketing/contacts" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/contacts/:contactId" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/assets" element={<ProtectedRoute requiredModule="marketing_ops"><ContentAssetsPage /></ProtectedRoute>} />
            {/* Budget now linked from Influencer Finance tab, keeping standalone for overview */}
            <Route path="/marketing/budget" element={<ProtectedRoute requiredModule="marketing_ops"><BudgetPage /></ProtectedRoute>} />
            {/* AI Tools with Influencer Discovery */}
            <Route path="/marketing/ai-tools" element={<ProtectedRoute requiredModule="marketing_ops"><AIToolsPage /></ProtectedRoute>} />
            <Route path="/marketing/ai-discovery" element={<ProtectedRoute requiredModule="marketing_ops"><AIDiscoveryPage /></ProtectedRoute>} />
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
            <Route path="/social" element={<ProtectedRoute requiredModule="social"><SocialDashboard /></ProtectedRoute>} />
            <Route path="/social/studio" element={<ProtectedRoute requiredModule="social"><ContentStudio /></ProtectedRoute>} />
            <Route path="/social/posts" element={<ProtectedRoute requiredModule="social"><PostsAndSchedulePage /></ProtectedRoute>} />
            <Route path="/social/library" element={<ProtectedRoute requiredModule="social"><ContentLibraryPage /></ProtectedRoute>} />
            {/* Redirect old routes to dashboard */}
            <Route path="/social/analytics" element={<Navigate to="/social" replace />} />
            <Route path="/social/ai-tools" element={<Navigate to="/social" replace />} />
            <Route path="/social/autopilot" element={<Navigate to="/social" replace />} />
            <Route path="/social/youtube" element={<Navigate to="/social" replace />} />
            <Route path="/social/avatar" element={<Navigate to="/social" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/users" element={<ProtectedRoute requiredModule="admin"><UserManagementPage /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute requiredModule="admin"><EmployeeDatabase /></ProtectedRoute>} />
            <Route path="/admin/access-control" element={<ProtectedRoute requiredModule="admin"><AccessControlPage /></ProtectedRoute>} />
            <Route path="/admin/organization" element={<ProtectedRoute requiredModule="admin"><OrganizationManagement /></ProtectedRoute>} />
            {/* /admin/org-structure merged into /admin/organization */}
            <Route path="/admin/org-structure" element={<Navigate to="/admin/organization" replace />} />
            <Route path="/admin/website-settings" element={<ProtectedRoute requiredModule="admin"><WebsiteSettings /></ProtectedRoute>} />
            <Route path="/admin/team" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />

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
            <Route path="/projects/manager" element={<ProtectedRoute requiredModule="project_management"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute requiredModule="project_management"><ProjectDetail /></ProtectedRoute>} />

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
            <Route path="/teams/callback" element={<TeamsCallback />} />

            {/* Analytics & Insights Routes */}
            <Route path="/analytics" element={<ProtectedRoute requiredModule="dashboard"><AnalyticsTeamDashboard /></ProtectedRoute>} />
            <Route path="/analytics/team-dashboard" element={<ProtectedRoute requiredModule="dashboard"><AnalyticsTeamDashboard /></ProtectedRoute>} />
            <Route path="/analytics/reports" element={<ProtectedRoute requiredModule="dashboard"><ReportsPage /></ProtectedRoute>} />

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
