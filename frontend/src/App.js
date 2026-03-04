import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DiscoveryPage } from "./pages/DiscoveryPage";
import { InfluencerCRMPage } from "./pages/InfluencerCRMPage";
import { OutreachPage } from "./pages/OutreachPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { BudgetPage } from "./pages/BudgetPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ContentLibraryPage } from "./pages/ContentLibraryPage";
import { AIStudioPage } from "./pages/AIStudioPage";
import { AIAutoDiscoveryPage } from "./pages/AIAutoDiscoveryPage";
import "./App.css";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <span className="font-serif text-xl text-gold">S</span>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <span className="font-serif text-xl text-gold">S</span>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/discovery"
                element={
                    <ProtectedRoute>
                        <DiscoveryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/influencers"
                element={
                    <ProtectedRoute>
                        <InfluencerCRMPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/outreach"
                element={
                    <ProtectedRoute>
                        <OutreachPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/campaigns"
                element={
                    <ProtectedRoute>
                        <CampaignsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/budget"
                element={
                    <ProtectedRoute>
                        <BudgetPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/analytics"
                element={
                    <ProtectedRoute>
                        <AnalyticsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/content"
                element={
                    <ProtectedRoute>
                        <ContentLibraryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/ai"
                element={
                    <ProtectedRoute>
                        <AIStudioPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/ai-discovery"
                element={
                    <ProtectedRoute>
                        <AIAutoDiscoveryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <div className="p-8">
                            <h1 className="font-serif text-4xl mb-4">Settings</h1>
                            <p className="text-muted-foreground">Settings page coming soon...</p>
                        </div>
                    </ProtectedRoute>
                }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
