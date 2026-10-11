import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewInvestigationPage } from './pages/NewInvestigationPage';
import { InvestigationOverviewPage } from './pages/InvestigationOverviewPage';
import { EvidenceExplorerPage } from './pages/EvidenceExplorerPage';
import { TemporalTimelinePage } from './pages/TemporalTimelinePage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ConflictAnalysisPage } from './pages/ConflictAnalysisPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';
import { TimeToExploitPage } from './pages/TimeToExploitPage';
import { ExplainableReasoningPage } from './pages/ExplainableReasoningPage';
import { DefensiveRecommendationsPage } from './pages/DefensiveRecommendationsPage';
import { ForensicReportPage } from './pages/ForensicReportPage';
import { SettingsHistoryPage } from './pages/SettingsHistoryPage';
import { EvaluationLabPage } from './pages/EvaluationLabPage';
import { SearchResultsPage } from './pages/SearchResultsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white font-mono text-xs text-slate-500">
        VALIDATING ANALYST SESSION...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    // Only show on first launch in session
    return !sessionStorage.getItem('temporal_splash_shown');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('temporal_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Investigation & Forensics Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/investigations/new" element={<NewInvestigationPage />} />
          <Route path="/investigations/:id" element={<InvestigationOverviewPage />} />
          <Route path="/investigations/:id/evidence" element={<EvidenceExplorerPage />} />
          <Route path="/investigations/:id/timeline" element={<TemporalTimelinePage />} />
          <Route path="/investigations/:id/graph" element={<KnowledgeGraphPage />} />
          <Route path="/investigations/:id/conflicts" element={<ConflictAnalysisPage />} />
          <Route path="/investigations/:id/risk" element={<RiskAssessmentPage />} />
          <Route path="/investigations/:id/time-to-exploit" element={<TimeToExploitPage />} />
          <Route path="/investigations/:id/reasoning" element={<ExplainableReasoningPage />} />
          <Route path="/investigations/:id/recommendations" element={<DefensiveRecommendationsPage />} />
          <Route path="/investigations/:id/report" element={<ForensicReportPage />} />
          <Route path="/evaluation" element={<EvaluationLabPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/settings" element={<SettingsHistoryPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
