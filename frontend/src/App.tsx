import React, { useState } from 'react';
import type { ActiveTab, AnalysisResult } from './types/analysis.ts';
import { ToastProvider } from './components/ui/Toast.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { NewAnalysisPage } from './pages/NewAnalysisPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { GuidelinesPage } from './pages/GuidelinesPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('about');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [analysisToInspect, setAnalysisToInspect] = useState<AnalysisResult | null>(null);

  const handleOpenAnalysis = (item: AnalysisResult) => {
    setAnalysisToInspect(item);
    setActiveTab('new-analysis');
  };

  const handleStartNewAnalysis = () => {
    setAnalysisToInspect(null);
    setActiveTab('new-analysis');
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#F6F4EC] text-[#283638] flex flex-col antialiased">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'new-analysis' && activeTab !== 'new-analysis') {
              // preserve inspection if explicitly navigating
            }
          }}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
        />

        {/* Content Shell */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
          }`}
        >
          {/* Top Header */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto" role="main">
            {activeTab === 'about' && (
              <AboutPage onStartAnalysis={handleStartNewAnalysis} />
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
          </main>
        </div>
      </div>
    </ToastProvider>
  </ThemeProvider>
  );
}
