import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ContentStudio from './pages/ContentStudio';
import PostsAndSchedule from './pages/PostsAndSchedule';
import AvatarPage from './pages/AvatarPage';
import YouTubeExplorer from './pages/YouTubeExplorer';
import Platforms from './pages/Platforms';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" /></div>;
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" /></div>;
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
          <Route path="/studio" element={<ProtectedRoute><ContentStudio /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PostsAndSchedule /></ProtectedRoute>} />
          <Route path="/avatar" element={<ProtectedRoute><AvatarPage /></ProtectedRoute>} />
          <Route path="/youtube" element={<ProtectedRoute><YouTubeExplorer /></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Platforms /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
