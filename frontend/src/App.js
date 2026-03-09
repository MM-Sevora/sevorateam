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
                
                if (hasAuthCode) {
                    console.log('Processing redirect response...');
                    try {
                        const response = await msalInstance.handleRedirectPromise();
                        console.log('Redirect response:', response ? 'GOT RESPONSE' : 'NO RESPONSE');
                        
                        if (response && response.accessToken) {
                            console.log('Account:', response.account?.username);
                            
                            // Check if this was for app login
                            const loginType = sessionStorage.getItem('msalLoginType');
                            console.log('Login type from session:', loginType);
                            sessionStorage.removeItem('msalLoginType');
                            
                            if (loginType === 'app') {
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
                            }
                        }
                    } catch (handleError) {
                        console.error('handleRedirectPromise error:', handleError);
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
const ProtectedRoute = ({ children, requiredDepartment }) => {
    const { isAuthenticated, loading, hasAccessToDepartment } = useAuth();

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

    if (requiredDepartment && !hasAccessToDepartment(requiredDepartment)) {
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
            <Route path="/marketing" element={<ProtectedRoute requiredDepartment="marketing"><MarketingInsightsPage /></ProtectedRoute>} />
            <Route path="/marketing/dashboard" element={<Navigate to="/marketing" replace />} />
            <Route path="/marketing/analytics" element={<Navigate to="/marketing" replace />} />
            <Route path="/marketing/influencers" element={<ProtectedRoute requiredDepartment="marketing"><InfluencersListPage /></ProtectedRoute>} />
            <Route path="/marketing/influencer/:influencerId" element={<ProtectedRoute requiredDepartment="marketing"><InfluencerDetailPage /></ProtectedRoute>} />
            {/* Redirect old PR route to Publications */}
            <Route path="/marketing/pr" element={<Navigate to="/marketing/publications" replace />} />
            {/* Publications (PR equivalent of Influencers) */}
            <Route path="/marketing/publications" element={<ProtectedRoute requiredDepartment="marketing"><PublicationsListPage /></ProtectedRoute>} />
            <Route path="/marketing/publication/:publicationId" element={<ProtectedRoute requiredDepartment="marketing"><PublicationDetailPage /></ProtectedRoute>} />
            {/* Unified Campaign Hub (List + Calendar + Timeline) */}
            <Route path="/marketing/campaigns" element={<ProtectedRoute requiredDepartment="marketing"><CampaignHubPage /></ProtectedRoute>} />
            <Route path="/marketing/campaign/:campaignId" element={<ProtectedRoute requiredDepartment="marketing"><CampaignDetailPage /></ProtectedRoute>} />
            {/* Legacy calendar route redirects to Campaign Hub */}
            <Route path="/marketing/calendar" element={<Navigate to="/marketing/campaigns" replace />} />
            {/* Redirect old contacts routes to influencers */}
            <Route path="/marketing/contacts" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/contacts/:contactId" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/assets" element={<ProtectedRoute requiredDepartment="marketing"><ContentAssetsPage /></ProtectedRoute>} />
            {/* Budget now linked from Influencer Finance tab, keeping standalone for overview */}
            <Route path="/marketing/budget" element={<ProtectedRoute requiredDepartment="marketing"><BudgetPage /></ProtectedRoute>} />
            {/* AI Tools with Influencer Discovery */}
            <Route path="/marketing/ai-tools" element={<ProtectedRoute requiredDepartment="marketing"><AIToolsPage /></ProtectedRoute>} />
            <Route path="/marketing/ai-discovery" element={<ProtectedRoute requiredDepartment="marketing"><AIDiscoveryPage /></ProtectedRoute>} />
            {/* Legacy Marketing Routes - kept for backward compatibility */}
            <Route path="/marketing/outreach" element={<ProtectedRoute requiredDepartment="marketing"><OutreachPage /></ProtectedRoute>} />
            <Route path="/marketing/negotiations" element={<ProtectedRoute requiredDepartment="marketing"><NegotiationsPage /></ProtectedRoute>} />
            {/* Unified Pipeline - replaces Outreach Dashboard & Deal Pipeline */}
            <Route path="/marketing/pipeline" element={<ProtectedRoute requiredDepartment="marketing"><UnifiedPipeline /></ProtectedRoute>} />
            {/* Redirect old routes to unified pipeline */}
            <Route path="/marketing/outreach-dashboard" element={<Navigate to="/marketing/pipeline" replace />} />
            <Route path="/marketing/deals" element={<Navigate to="/marketing/pipeline" replace />} />

            {/* Mail Routes */}
            <Route path="/mail/inbox" element={<ProtectedRoute requiredDepartment="mail"><EmailPage /></ProtectedRoute>} />
            <Route path="/marketing/email" element={<ProtectedRoute requiredDepartment="marketing"><EmailPage /></ProtectedRoute>} />

            {/* Sales Routes */}
            <Route path="/sales" element={<ProtectedRoute requiredDepartment="sales"><SalesDashboard /></ProtectedRoute>} />
            <Route path="/sales/leads" element={<ProtectedRoute requiredDepartment="sales"><LeadsPage /></ProtectedRoute>} />
            <Route path="/sales/customers" element={<ProtectedRoute requiredDepartment="sales"><CustomersPage /></ProtectedRoute>} />
            <Route path="/sales/pipeline" element={<ProtectedRoute requiredDepartment="sales"><PipelinePage /></ProtectedRoute>} />
            <Route path="/sales/wedding-planner" element={<ProtectedRoute requiredDepartment="sales"><WeddingPlannerPage /></ProtectedRoute>} />
            <Route path="/sales/qrcodes" element={<ProtectedRoute requiredDepartment="sales"><QRCodesPage /></ProtectedRoute>} />
            <Route path="/sales/partners" element={<ProtectedRoute requiredDepartment="sales"><PartnersPage /></ProtectedRoute>} />
            <Route path="/sales/analytics" element={<ProtectedRoute requiredDepartment="sales"><SalesAnalyticsPage /></ProtectedRoute>} />

            {/* Social Routes */}
            <Route path="/social" element={<ProtectedRoute requiredDepartment="social"><SocialDashboard /></ProtectedRoute>} />
            <Route path="/social/studio" element={<ProtectedRoute requiredDepartment="social"><ContentStudio /></ProtectedRoute>} />
            <Route path="/social/posts" element={<ProtectedRoute requiredDepartment="social"><PostsAndSchedulePage /></ProtectedRoute>} />
            <Route path="/social/library" element={<ProtectedRoute requiredDepartment="social"><ContentLibraryPage /></ProtectedRoute>} />
            {/* Redirect old routes to dashboard */}
            <Route path="/social/analytics" element={<Navigate to="/social" replace />} />
            <Route path="/social/ai-tools" element={<Navigate to="/social" replace />} />
            <Route path="/social/autopilot" element={<Navigate to="/social" replace />} />
            <Route path="/social/youtube" element={<Navigate to="/social" replace />} />
            <Route path="/social/avatar" element={<Navigate to="/social" replace />} />

            {/* Admin Routes */}
            <Route path="/admin/users" element={<ProtectedRoute requiredDepartment="admin"><UserManagementPage /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute requiredDepartment="admin"><EmployeeDatabase /></ProtectedRoute>} />
            <Route path="/admin/access-control" element={<ProtectedRoute requiredDepartment="admin"><AccessControlPage /></ProtectedRoute>} />
            <Route path="/admin/organization" element={<ProtectedRoute requiredDepartment="admin"><OrganizationManagement /></ProtectedRoute>} />
            {/* /admin/org-structure merged into /admin/organization */}
            <Route path="/admin/org-structure" element={<Navigate to="/admin/organization" replace />} />
            <Route path="/admin/team" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />

            {/* Settings Routes */}
            <Route path="/settings/automations" element={<ProtectedRoute><AutomationSettings /></ProtectedRoute>} />

            {/* Goals & Objectives Routes */}
            <Route path="/goals" element={<ProtectedRoute><GoalsDashboard /></ProtectedRoute>} />
            <Route path="/goals/strategic" element={<ProtectedRoute><StrategicGoals /></ProtectedRoute>} />
            <Route path="/goals/objectives" element={<ProtectedRoute><Objectives /></ProtectedRoute>} />
            <Route path="/goals/objectives/:objectiveId" element={<ProtectedRoute><ObjectiveDetail /></ProtectedRoute>} />
            <Route path="/goals/fiscal-years" element={<ProtectedRoute><FiscalYears /></ProtectedRoute>} />

            {/* Project Management Routes */}
            <Route path="/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
            <Route path="/projects/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
            <Route path="/projects/recurring" element={<ProtectedRoute><RecurringTasks /></ProtectedRoute>} />
            <Route path="/projects/manager" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

            {/* Notifications */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />

            {/* Help & Support */}
            <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
            <Route path="/help/admin" element={<ProtectedRoute><HelpAdminDashboard /></ProtectedRoute>} />
            <Route path="/help/modules/:moduleKey" element={<ProtectedRoute><HelpModuleDetail /></ProtectedRoute>} />
            <Route path="/help/tickets/:ticketId" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
            <Route path="/help/articles/:articleId" element={<ProtectedRoute><ArticleViewer /></ProtectedRoute>} />

            {/* HR Routes */}
            <Route path="/hr/expenses" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />

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
