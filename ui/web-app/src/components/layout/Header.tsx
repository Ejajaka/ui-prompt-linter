import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FolderKanban,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react';
import type { ActiveTab } from '../../types/analysis.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useProject } from '../../context/ProjectContext.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
  publicMode?: boolean;
  onRequestSignIn?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  publicMode = false,
  onRequestSignIn,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, localMode } = useAuth();
  const { projects, currentProject, selectProject } = useProject();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!projectMenuRef.current?.contains(event.target as Node)) setProjectMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [projectMenuOpen]);

  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    about: { title: 'About Vector', subtitle: 'UI/UX Requirement Engineering' },
    overview: { title: 'Overview', subtitle: 'Projects & Analysis' },
    projects: { title: 'Projects', subtitle: 'Requirement Workspaces' },
    requirements: { title: 'Requirement Compiler', subtitle: 'Documents & Traceability' },
    intelligence: { title: 'Requirement Intelligence', subtitle: 'Graph, Conflicts & Dependencies' },
    review: { title: 'Review & Acceptance', subtitle: 'Suggestions, Edge Cases & Criteria' },
    prompt: { title: 'Specification & Prompt', subtitle: 'Design Brief Generator' },
    design: { title: 'Design Systems', subtitle: 'Tokens & Brand Context' },
    workspace: { title: 'Bolt Workspace', subtitle: 'Prompt → Generate → Refine' },
    'new-analysis': { title: 'New UI Prompt Analysis', subtitle: 'UI/UX Prompt Analyzer' },
    history: { title: 'Analysis History', subtitle: 'Past Evaluations' },
    settings: { title: 'System Settings', subtitle: 'Preferences & Engine' },
    privacy: { title: 'Privacy Policy', subtitle: 'Data & Processing' },
  };

  const current = titles[activeTab] || titles.overview;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmingLogout(false);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-[#FFFFFF] dark:bg-[#1B2426] border-b border-[#E5E2D8] dark:border-[#29383A] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 text-[#283638] dark:text-[#E7E4D9] hover:bg-[#F6F4EC] dark:hover:bg-[#263335] rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm text-[#737A72] min-w-0">
            <span className="font-semibold text-[#283638] dark:text-[#E7E4D9] text-base sm:text-lg tracking-tight truncate">
              {current.title}
            </span>
            <span className="hidden sm:inline-block text-[#CDC9BC]" aria-hidden="true">/</span>
            <span className="hidden sm:inline-block text-xs font-medium text-[#737A72] dark:text-[#8E9A93] truncate">
              {current.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {publicMode ? (
            <>
              <button
                type="button"
                onClick={onRequestSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            </>
          ) : (
            <>
              {/* Project switcher */}
              <div className="relative" ref={projectMenuRef}>
                <button
                  type="button"
                  onClick={() => setProjectMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F6F4EC] dark:bg-[#141C1D] border border-[#E5E2D8] dark:border-[#33403F] text-xs font-semibold text-[#49686C] dark:text-[#B9D1D4] hover:bg-[#F0EDE3] dark:hover:bg-[#222E30] transition-colors max-w-[190px]"
                  aria-haspopup="menu"
                  aria-expanded={projectMenuOpen}
                  aria-label="Switch project"
                >
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentProject?.name || 'No project'}</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {projectMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-72 bg-[#FFFFFF] dark:bg-[#1B2426] border border-[#E5E2D8] dark:border-[#33403F] rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-[#E5E2D8] dark:border-[#29383A]">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#737A72]">Switch project</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {projects.length === 0 && (
                        <p className="px-3 py-3 text-xs text-[#737A72]">No projects yet.</p>
                      )}
                      {projects.map((project) => {
                        const active = project.id === currentProject?.id;
                        return (
                          <button
                            key={project.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              selectProject(project.id);
                              setProjectMenuOpen(false);
                            }}
                            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[#F6F4EC] dark:hover:bg-[#222E30] transition-colors"
                          >
                            <span className="mt-0.5 w-4 h-4 rounded-full border border-[#E5E2D8] dark:border-[#33403F] flex items-center justify-center shrink-0">
                              {active && <Check className="w-2.5 h-2.5 text-[#3E6B33]" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-[#283638] dark:text-[#E7E4D9] truncate">
                                {project.name}
                              </span>
                              <span className="block text-[10px] text-[#737A72] truncate">
                                {project.description || 'No description'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActiveTab('projects');
                        setProjectMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 border-t border-[#E5E2D8] dark:border-[#29383A] text-xs font-bold text-[#49686C] dark:text-[#B9D1D4] hover:bg-[#F6F4EC] dark:hover:bg-[#222E30]"
                    >
                      Manage projects
                    </button>
                  </div>
                )}
              </div>

              {localMode ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-[11px] font-semibold text-[#9C4A28]">
                  Local mode
                </span>
              ) : (
                <span
                  className="hidden xl:inline-flex items-center gap-1 text-[11px] text-[#737A72] dark:text-[#8E9A93] max-w-[150px] truncate"
                  title={user?.email || ''}
                >
                  <UserRound className="w-3 h-3 shrink-0" />
                  {user?.email}
                </span>
              )}
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#737A72] dark:text-[#8E9A93] hover:text-[#283638] dark:hover:text-white hover:bg-[#F6F4EC] dark:hover:bg-[#263335] transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#D1B653]" />
            ) : (
              <Moon className="w-4 h-4 text-[#49686C]" />
            )}
          </button>

          {!publicMode && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-lg text-[#737A72] dark:text-[#8E9A93] hover:text-[#283638] dark:hover:text-white hover:bg-[#F6F4EC] dark:hover:bg-[#263335] transition-colors ${
                activeTab === 'settings' ? 'bg-[#F6F4EC] dark:bg-[#263335] text-[#283638] dark:text-white' : ''
              }`}
              aria-label="Open settings"
              title="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {!publicMode && !localMode && (
            <button
              type="button"
              onClick={() => setConfirmingLogout(true)}
              className="p-2 rounded-lg text-[#737A72] dark:text-[#8E9A93] hover:text-[#283638] dark:hover:text-white hover:bg-[#F6F4EC] dark:hover:bg-[#263335] transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <ConfirmDialog
        open={confirmingLogout}
        title="Log out of Vector?"
        message="You will be signed out of this browser. Your projects, documents and prompts stay saved in your account, and you can sign back in at any time."
        confirmLabel="Log out"
        tone="danger"
        busy={signingOut}
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmingLogout(false)}
      />
    </>
  );
};
