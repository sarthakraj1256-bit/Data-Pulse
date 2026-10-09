import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatasetProvider } from './context/DatasetContext';
import { AppLayout } from './components/layout/AppLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

// Authenticated Application Pages
import { DashboardOverview } from './pages/DashboardOverview';
import { DatasetLibrary } from './pages/DatasetLibrary';
import { UploadPage } from './pages/UploadPage';
import { DatasetWorkspace } from './pages/DatasetWorkspace';
import { QualityAnalysisPage } from './pages/QualityAnalysisPage';
import { CleaningStudioPage } from './pages/CleaningStudioPage';
import { LineagePage } from './pages/LineagePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { IotStatusPage } from './pages/IotStatusPage';

function RouterComponent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8EF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#641B32] border-t-transparent rounded-full animate-spin" />
          <span className="font-serif text-sm font-bold text-[#3D1023]">
            Initializing DataPulse Engine...
          </span>
        </div>
      </div>
    );
  }

  // Route Guard: Protected App routes
  const isAppRoute = currentPath.startsWith('/app');
  if (isAppRoute && !user) {
    return <LoginPage navigate={navigate} />;
  }

  // Public Route Rendering
  if (currentPath === '/') {
    return <LandingPage navigate={navigate} />;
  }
  if (currentPath === '/login') {
    if (user) {
      navigate('/app');
      return null;
    }
    return <LoginPage navigate={navigate} />;
  }
  if (currentPath === '/signup') {
    if (user) {
      navigate('/app');
      return null;
    }
    return <SignupPage navigate={navigate} />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage navigate={navigate} />;
  }

  // Dynamic Dataset workspace: /app/datasets/:id
  let activeDatasetId: string | undefined;
  if (currentPath.startsWith('/app/datasets/')) {
    activeDatasetId = currentPath.split('/app/datasets/')[1];
  }

  // Authenticated App Shell
  return (
    <AppLayout currentPath={currentPath} navigate={navigate}>
      {currentPath === '/app' && <DashboardOverview navigate={navigate} />}
      {currentPath === '/app/datasets' && <DatasetLibrary navigate={navigate} />}
      {currentPath.startsWith('/app/datasets/') && (
        <DatasetWorkspace navigate={navigate} datasetId={activeDatasetId} />
      )}
      {currentPath === '/app/upload' && <UploadPage navigate={navigate} />}
      {currentPath === '/app/quality' && <QualityAnalysisPage navigate={navigate} />}
      {currentPath === '/app/cleaning' && <CleaningStudioPage navigate={navigate} />}
      {currentPath === '/app/lineage' && <LineagePage navigate={navigate} />}
      {currentPath === '/app/analytics' && <AnalyticsPage navigate={navigate} />}
      {currentPath === '/app/predictions' && <PredictionsPage navigate={navigate} />}
      {currentPath === '/app/reports' && <ReportsPage navigate={navigate} />}
      {currentPath === '/app/settings' && <SettingsPage navigate={navigate} />}
      {currentPath === '/app/iot' && <IotStatusPage navigate={navigate} />}
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <DatasetProvider>
        <RouterComponent />
      </DatasetProvider>
    </AuthProvider>
  );
}

export default App;
