import React, { useEffect, useState } from 'react';
import { LogIn, Moon, Sun } from 'lucide-react';
import type { ActiveTab, AnalysisResult } from './types/analysis.ts';
import { ToastProvider } from './components/ui/Toast.tsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ProjectProvider, useProject } from './context/ProjectContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { NewAnalysisPage } from './pages/NewAnalysisPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { RequirementsPage } from './pages/RequirementsPage.tsx';
import { RequirementGraphPage } from './pages/RequirementGraphPage.tsx';
import { RequirementReviewPage } from './pages/RequirementReviewPage.tsx';
import { PromptStudioPage } from './pages/PromptStudioPage.tsx';
import { DesignSystemsPage } from './pages/DesignSystemsPage.tsx';
import { WorkspacePage } from './pages/WorkspacePage.tsx';
import { ManualPage } from './pages/ManualPage.tsx';

const PUBLIC_TABS: ActiveTab[] = ['about'];

const KNOWN_TABS: ActiveTab[] = [
  'about',
  'overview',
  'projects',
  'requirements',
  'intelligence',
  'review',
  'prompt',
  'design',
  'workspace',
  'new-analysis',
  'history',
  'manual',
  'settings',
  'privacy',
];

function isKnownTab(value: string | null): value is ActiveTab {
  return !!value && (KNOWN_TABS as string[]).includes(value);
}

function tabStorageKey(userId: string | undefined): string {
  return `vector_active_tab_${userId || 'guest'}`;
}

function AppShell() {
  const { configured, loading, user, passwordRecovery } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { projects, currentProject, selectProject } = useProject();
  const [activeTab, setActiveTab] = useState<ActiveTab>('about');
  const [showAuth, setShowAuth] = useState(false);
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const [tabHydrated, setTabHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [analysisToInspect, setAnalysisToInspect] = useState<AnalysisResult | null>(null);

  const publicMode = configured && !user;

  // Restore the last visited tab for this account (or for guests).
  useEffect(() => {
    let next: ActiveTab = user ? 'projects' : 'about';
    try {
      const saved = localStorage.getItem(tabStorageKey(user?.id));
      if (isKnownTab(saved)) next = saved;
    } catch {
      // ignore storage failures
    }
    if (!user && !PUBLIC_TABS.includes(next)) next = 'about';
    if (user && (next === 'about' || next === 'overview')) next = 'projects';
    setActiveTab(next);
    setTabHydrated(true);
  }, [user?.id]);

  // Persist the active tab so refresh, revisit and re-login return here.
  useEffect(() => {
    if (!tabHydrated) return;
    if (publicMode && !PUBLIC_TABS.includes(activeTab)) return;
    try {
      localStorage.setItem(tabStorageKey(user?.id), activeTab);
    } catch {
      // ignore storage failures
    }
  }, [activeTab, user?.id, tabHydrated, publicMode]);

  // Guests cannot open authenticated areas.
  useEffect(() => {
    if (publicMode && !PUBLIC_TABS.includes(activeTab)) setActiveTab('about');
    if (user && (activeTab === 'about' || activeTab === 'overview')) {
      // About and Overview are public onboarding pages only.
      setActiveTab('projects');
    }
  }, [publicMode, user, activeTab]);

  useEffect(() => {
    if (user) setShowAuth(false);
  }, [user]);

  useEffect(() => {
    if (user && pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }, [user, pendingTab]);

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

  if (configured && !user && showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  const handleOpenAnalysis = (item: AnalysisResult) => {
    if (item.projectId && item.projectId !== currentProject?.id && projects.some((project) => project.id === item.projectId)) {
      selectProject(item.projectId);
    }
    setAnalysisToInspect(item);
    setActiveTab('new-analysis');
  };

  const handleStartNewAnalysis = () => {
    if (publicMode) {
      requestAuth('new-analysis');
      return;
    }
    setAnalysisToInspect(null);
    setActiveTab('new-analysis');
  };

  const handleStartRequirementWorkflow = () => {
    if (publicMode) {
      requestAuth('requirements');
      return;
    }
    setActiveTab('requirements');
  };

  const requestAuth = (target?: ActiveTab) => {
    if (target) setPendingTab(target);
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-[#F6F4EC] dark:bg-[#131A1B] text-[#283638] dark:text-[#E7E4D9] flex flex-col antialiased">
      {!publicMode && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileNavOpen}
          setIsMobileOpen={setIsMobileNavOpen}
          publicMode={publicMode}
          onRequestSignIn={() => requestAuth()}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          publicMode ? '' : isSidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
        }`}
      >
        {!publicMode && (
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenMobileMenu={() => setIsMobileNavOpen(true)}
            publicMode={publicMode}
            onRequestSignIn={() => requestAuth()}
          />
        )}

        {publicMode && (
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-lg bg-[#FFFFFF] dark:bg-[#1B2426] border border-[#E5E2D8] dark:border-[#33403F] text-[#49686C] dark:text-[#B9D1D4] flex items-center justify-center shadow-sm hover:bg-[#F6F4EC] dark:hover:bg-[#222E30]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D1B653]" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => requestAuth()}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </button>
          </div>
        )}

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto ${publicMode ? '' : ''}`} role="main">
          {activeTab === 'about' && <AboutPage onStartAnalysis={handleStartRequirementWorkflow} />}

          {activeTab === 'overview' && (
            <OverviewPage
              publicMode={publicMode}
              onRequestSignIn={() => requestAuth()}
              onStartNewAnalysis={handleStartNewAnalysis}
              onOpenAnalysis={handleOpenAnalysis}
              onViewAllHistory={() => (publicMode ? requestAuth() : setActiveTab('history'))}
              onOpenProjects={() => (publicMode ? requestAuth() : setActiveTab('projects'))}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsPage
              onOpenProject={handleStartNewAnalysis}
              onOpenSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'requirements' && <RequirementsPage />}
          {activeTab === 'intelligence' && <RequirementGraphPage />}
          {activeTab === 'review' && <RequirementReviewPage />}
          {activeTab === 'prompt' && <PromptStudioPage />}
          {activeTab === 'design' && <DesignSystemsPage />}
          {activeTab === 'workspace' && <WorkspacePage />}

          {activeTab === 'new-analysis' && (
            <NewAnalysisPage
              initialResult={analysisToInspect}
              onClearInitialResult={() => setAnalysisToInspect(null)}
              onViewHistory={() => setActiveTab('history')}
              onOpenProjects={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'manual' && <ManualPage onOpenProjects={() => setActiveTab('projects')} />}

          {activeTab === 'history' && (
            <HistoryPage
              onOpenAnalysis={handleOpenAnalysis}
              onStartNewAnalysis={handleStartNewAnalysis}
              onOpenProjects={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage onOpenManual={() => setActiveTab('manual')} />
          )}
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
