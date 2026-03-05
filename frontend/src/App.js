import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ContentIdeas from './pages/ContentIdeas';
import ContentCreator from './pages/ContentCreator';
import Posts from './pages/Posts';
import Scheduler from './pages/Scheduler';
import Platforms from './pages/Platforms';
import AvatarPage from './pages/AvatarPage';
import PerformancePredictor from './pages/PerformancePredictor';
import YouTubeExplorer from './pages/YouTubeExplorer';
import Autopilot from './pages/Autopilot';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ideas" element={<ProtectedRoute><ContentIdeas /></ProtectedRoute>} />
          <Route path="/creator" element={<ProtectedRoute><ContentCreator /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
          <Route path="/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Platforms /></ProtectedRoute>} />
          <Route path="/avatar" element={<ProtectedRoute><AvatarPage /></ProtectedRoute>} />
          <Route path="/predictor" element={<ProtectedRoute><PerformancePredictor /></ProtectedRoute>} />
          <Route path="/youtube" element={<ProtectedRoute><YouTubeExplorer /></ProtectedRoute>} />
          <Route path="/autopilot" element={<ProtectedRoute><Autopilot /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
