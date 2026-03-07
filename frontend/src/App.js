import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { msalConfig } from "./authConfig";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

// Marketing Pages
import { MarketingDashboard } from "./pages/marketing/Dashboard";
import CampaignsPage from "./pages/marketing/Campaigns";
import OutreachPage from "./pages/marketing/Outreach";
import NegotiationsPage from "./pages/marketing/Negotiations";
import MarketingAnalyticsPage from "./pages/marketing/Analytics";
import AIToolsPage from "./pages/marketing/AITools";
import BudgetPage from "./pages/marketing/Budget";

// Marketing V2 Pages (Current)
import DigitalPRPage from "./pages/marketing/DigitalPRPage";
import EventsPage from "./pages/marketing/EventsPage";
import MarketingCalendarPage from "./pages/marketing/MarketingCalendarPage";
import ContentAssetsPage from "./pages/marketing/ContentAssetsPage";
import InfluencersListPage from "./pages/marketing/InfluencersListPage";
import InfluencerDetailPage from "./pages/marketing/InfluencerDetailPage";
import CampaignDetailPage from "./pages/marketing/CampaignDetailPage";

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
import SocialAIToolsPage from "./pages/social/AITools";
import AutopilotPage from "./pages/social/Autopilot";
import PostsAndSchedulePage from "./pages/social/PostsAndSchedule";
import SocialAnalyticsPage from "./pages/social/Analytics";
import YouTubePage from "./pages/social/YouTube";
import ContentLibraryPage from "./pages/social/ContentLibrary";
import AvatarPage from "./pages/social/Avatar";

// Email Page
import EmailPage from "./pages/marketing/EmailPage";

// Admin Pages
import UserManagementPage from "./pages/admin/UserManagement";
import PermissionsPage from "./pages/admin/PermissionsPage";

import "./App.css";

// Initialize MSAL
const msalInstance = new PublicClientApplication(msalConfig);

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

    return <Layout>{children}</Layout>;
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
            <Route path="/marketing" element={<ProtectedRoute requiredDepartment="marketing"><MarketingDashboard /></ProtectedRoute>} />
            <Route path="/marketing/influencers" element={<ProtectedRoute requiredDepartment="marketing"><InfluencersListPage /></ProtectedRoute>} />
            <Route path="/marketing/influencer/:influencerId" element={<ProtectedRoute requiredDepartment="marketing"><InfluencerDetailPage /></ProtectedRoute>} />
            <Route path="/marketing/pr" element={<ProtectedRoute requiredDepartment="marketing"><DigitalPRPage /></ProtectedRoute>} />
            <Route path="/marketing/events" element={<ProtectedRoute requiredDepartment="marketing"><EventsPage /></ProtectedRoute>} />
            <Route path="/marketing/campaigns" element={<ProtectedRoute requiredDepartment="marketing"><CampaignsPage /></ProtectedRoute>} />
            <Route path="/marketing/campaign/:campaignId" element={<ProtectedRoute requiredDepartment="marketing"><CampaignDetailPage /></ProtectedRoute>} />
            <Route path="/marketing/calendar" element={<ProtectedRoute requiredDepartment="marketing"><MarketingCalendarPage /></ProtectedRoute>} />
            {/* Redirect old contacts routes to influencers */}
            <Route path="/marketing/contacts" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/contacts/:contactId" element={<Navigate to="/marketing/influencers" replace />} />
            <Route path="/marketing/assets" element={<ProtectedRoute requiredDepartment="marketing"><ContentAssetsPage /></ProtectedRoute>} />
            <Route path="/marketing/budget" element={<ProtectedRoute requiredDepartment="marketing"><BudgetPage /></ProtectedRoute>} />
            <Route path="/marketing/ai-tools" element={<ProtectedRoute requiredDepartment="marketing"><AIToolsPage /></ProtectedRoute>} />
            <Route path="/marketing/analytics" element={<ProtectedRoute requiredDepartment="marketing"><MarketingAnalyticsPage /></ProtectedRoute>} />
            {/* Legacy Marketing Routes - kept for backward compatibility */}
            <Route path="/marketing/outreach" element={<ProtectedRoute requiredDepartment="marketing"><OutreachPage /></ProtectedRoute>} />
            <Route path="/marketing/negotiations" element={<ProtectedRoute requiredDepartment="marketing"><NegotiationsPage /></ProtectedRoute>} />

            {/* Mail Routes */}
            <Route path="/mail/inbox" element={<ProtectedRoute requiredDepartment="mail"><EmailPage /></ProtectedRoute>} />

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
            <Route path="/social/ai-tools" element={<ProtectedRoute requiredDepartment="social"><SocialAIToolsPage /></ProtectedRoute>} />
            <Route path="/social/autopilot" element={<ProtectedRoute requiredDepartment="social"><AutopilotPage /></ProtectedRoute>} />
            <Route path="/social/posts" element={<ProtectedRoute requiredDepartment="social"><PostsAndSchedulePage /></ProtectedRoute>} />
            <Route path="/social/analytics" element={<ProtectedRoute requiredDepartment="social"><SocialAnalyticsPage /></ProtectedRoute>} />
            <Route path="/social/youtube" element={<ProtectedRoute requiredDepartment="social"><YouTubePage /></ProtectedRoute>} />
            <Route path="/social/library" element={<ProtectedRoute requiredDepartment="social"><ContentLibraryPage /></ProtectedRoute>} />
            <Route path="/social/avatar" element={<ProtectedRoute requiredDepartment="social"><AvatarPage /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/users" element={<ProtectedRoute requiredDepartment="admin"><UserManagementPage /></ProtectedRoute>} />
            <Route path="/admin/permissions" element={<ProtectedRoute requiredDepartment="admin"><PermissionsPage /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <MsalProvider instance={msalInstance}>
            <BrowserRouter>
                <AuthProvider>
                    <AppRoutes />
                    <Toaster position="top-right" richColors />
                </AuthProvider>
            </BrowserRouter>
        </MsalProvider>
    );
}

export default App;
