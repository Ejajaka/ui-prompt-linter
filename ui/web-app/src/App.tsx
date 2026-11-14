import React, { useState } from 'react';
import type { ActiveTab, AnalysisResult } from './types/analysis.ts';
import { ToastProvider } from './components/ui/Toast.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ProjectProvider } from './context/ProjectContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { NewAnalysisPage } from './pages/NewAnalysisPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { GuidelinesPage } from './pages/GuidelinesPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';

function AppShell() {
  const { configured, loading, user, passwordRecovery } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('about');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [analysisToInspect, setAnalysisToInspect] = useState<AnalysisResult | null>(null);

  if (configured && loading) {
    return (
      <div className="min-h-screen bg-[#F6F4EC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 rounded-xl bg-[#2D5D4F] text-white mx-auto flex items-center justify-center font-black">V</div>
          <p className="mt-3 text-xs font-semibold text-[#737A72]">Restoring your session…</p>
        </div>
      </div>
    );
  }

  if (configured && passwordRecovery) {
    return <ResetPasswordPage />;
  }

  if (configured && !user) {
    return <AuthPage />;
  }

  const handleOpenAnalysis = (item: AnalysisResult) => {
    setAnalysisToInspect(item);
    setActiveTab('new-analysis');
  };

  const handleStartNewAnalysis = () => {
    setAnalysisToInspect(null);
    setActiveTab('new-analysis');
  };

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#283638] flex flex-col antialiased">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileNavOpen}
        setIsMobileOpen={setIsMobileNavOpen}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
        }`}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto" role="main">
          {activeTab === 'about' && <AboutPage onStartAnalysis={handleStartNewAnalysis} />}

          {activeTab === 'projects' && (
            <ProjectsPage onOpenProject={handleStartNewAnalysis} onOpenSettings={() => setActiveTab('settings')} />
          )}

          {activeTab === 'overview' && (
            <OverviewPage
              onStartNewAnalysis={handleStartNewAnalysis}
              onOpenAnalysis={handleOpenAnalysis}
              onViewAllHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'new-analysis' && (
            <NewAnalysisPage
              initialResult={analysisToInspect}
              onClearInitialResult={() => setAnalysisToInspect(null)}
              onViewHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              onOpenAnalysis={handleOpenAnalysis}
              onStartNewAnalysis={handleStartNewAnalysis}
            />
          )}

          {activeTab === 'guidelines' && <GuidelinesPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'privacy' && <PrivacyPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <AppShell />
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
