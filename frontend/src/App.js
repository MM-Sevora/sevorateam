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
import { InfluencersPage } from "./pages/marketing/Influencers";

// Sales Pages
import { SalesDashboard } from "./pages/sales/Dashboard";
import { LeadsPage } from "./pages/sales/Leads";

// Social Pages
import { SocialDashboard } from "./pages/social/Dashboard";

import "./App.css";

// Initialize MSAL
const msalInstance = new PublicClientApplication(msalConfig);

// Protected Route Component
const ProtectedRoute = ({ children, requiredDepartment }) => {
    const { isAuthenticated, loading, hasAccessToDepartment } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
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
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Placeholder Pages for routes not yet implemented
const PlaceholderPage = ({ title, department }) => (
    <div className="p-8">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-white/50 mt-2">This page is coming soon...</p>
        <div className={`mt-4 w-32 h-1 rounded ${
            department === 'marketing' ? 'bg-violet-500' :
            department === 'sales' ? 'bg-emerald-500' :
            'bg-pink-500'
        }`} />
    </div>
);

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

            {/* Main Dashboard */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Marketing Routes */}
            <Route path="/marketing" element={<ProtectedRoute requiredDepartment="marketing"><MarketingDashboard /></ProtectedRoute>} />
            <Route path="/marketing/influencers" element={<ProtectedRoute requiredDepartment="marketing"><InfluencersPage /></ProtectedRoute>} />
            <Route path="/marketing/campaigns" element={<ProtectedRoute requiredDepartment="marketing"><PlaceholderPage title="Campaigns" department="marketing" /></ProtectedRoute>} />
            <Route path="/marketing/outreach" element={<ProtectedRoute requiredDepartment="marketing"><PlaceholderPage title="Outreach" department="marketing" /></ProtectedRoute>} />
            <Route path="/marketing/negotiations" element={<ProtectedRoute requiredDepartment="marketing"><PlaceholderPage title="Negotiations" department="marketing" /></ProtectedRoute>} />
            <Route path="/marketing/analytics" element={<ProtectedRoute requiredDepartment="marketing"><PlaceholderPage title="Marketing Analytics" department="marketing" /></ProtectedRoute>} />

            {/* Sales Routes */}
            <Route path="/sales" element={<ProtectedRoute requiredDepartment="sales"><SalesDashboard /></ProtectedRoute>} />
            <Route path="/sales/leads" element={<ProtectedRoute requiredDepartment="sales"><LeadsPage /></ProtectedRoute>} />
            <Route path="/sales/customers" element={<ProtectedRoute requiredDepartment="sales"><PlaceholderPage title="Customers" department="sales" /></ProtectedRoute>} />
            <Route path="/sales/pipeline" element={<ProtectedRoute requiredDepartment="sales"><PlaceholderPage title="Pipeline" department="sales" /></ProtectedRoute>} />
            <Route path="/sales/wedding-planner" element={<ProtectedRoute requiredDepartment="sales"><PlaceholderPage title="Wedding Planner" department="sales" /></ProtectedRoute>} />
            <Route path="/sales/qrcodes" element={<ProtectedRoute requiredDepartment="sales"><PlaceholderPage title="QR Codes" department="sales" /></ProtectedRoute>} />
            <Route path="/sales/partners" element={<ProtectedRoute requiredDepartment="sales"><PlaceholderPage title="Partners" department="sales" /></ProtectedRoute>} />

            {/* Social Routes */}
            <Route path="/social" element={<ProtectedRoute requiredDepartment="social"><SocialDashboard /></ProtectedRoute>} />
            <Route path="/social/studio" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="Content Studio" department="social" /></ProtectedRoute>} />
            <Route path="/social/ai-tools" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="AI Tools" department="social" /></ProtectedRoute>} />
            <Route path="/social/autopilot" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="Autopilot" department="social" /></ProtectedRoute>} />
            <Route path="/social/posts" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="Posts & Schedule" department="social" /></ProtectedRoute>} />
            <Route path="/social/analytics" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="Social Analytics" department="social" /></ProtectedRoute>} />
            <Route path="/social/youtube" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="YouTube" department="social" /></ProtectedRoute>} />
            <Route path="/social/library" element={<ProtectedRoute requiredDepartment="social"><PlaceholderPage title="Content Library" department="social" /></ProtectedRoute>} />

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
