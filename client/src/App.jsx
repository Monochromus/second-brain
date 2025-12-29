import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import CustomToolsPage from './pages/CustomToolsPage';
import AreasPage from './pages/AreasPage';
import AreaPage from './pages/AreaPage';
import ResourcesPage from './pages/ResourcesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ThemeSetupModal from './components/shared/ThemeSetupModal';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { themeConfigured } = useTheme();
  const [showThemeSetup, setShowThemeSetup] = useState(false);

  // Show theme setup modal when user is loaded and theme is not configured
  useEffect(() => {
    if (user && !themeConfigured) {
      setShowThemeSetup(true);
    }
  }, [user, themeConfigured]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      <ThemeSetupModal
        isOpen={showThemeSetup}
        onComplete={() => setShowThemeSetup(false)}
      />
    </>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
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
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="project/:id" element={<ProjectPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="area/:id" element={<AreaPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="tools" element={<CustomToolsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
