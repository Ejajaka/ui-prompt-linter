import React from 'react';
import { 
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  History, 
  BookOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Shield,
  ShieldCheck,
  FolderKanban,
  FileText,
  Network,
  ClipboardCheck,
  FileOutput,
  Palette,
  Monitor,
  X
} from 'lucide-react';
import type { ActiveTab } from '../../types/analysis.ts';
import { Logo } from '../ui/Logo.tsx';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const navItems = [
    { id: 'about' as ActiveTab, label: 'About & Overview', icon: Sparkles },
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'projects' as ActiveTab, label: 'Projects', icon: FolderKanban },
    { id: 'requirements' as ActiveTab, label: 'Requirement Compiler', icon: FileText },
    { id: 'intelligence' as ActiveTab, label: 'Requirement Intelligence', icon: Network },
    { id: 'review' as ActiveTab, label: 'Review & Acceptance', icon: ClipboardCheck },
    { id: 'prompt' as ActiveTab, label: 'Specification & Prompt', icon: FileOutput },
    { id: 'design' as ActiveTab, label: 'Design Systems', icon: Palette },
    { id: 'workspace' as ActiveTab, label: 'Bolt Workspace', icon: Monitor },
    { id: 'new-analysis' as ActiveTab, label: 'New Analysis', icon: PlusCircle },
    { id: 'history' as ActiveTab, label: 'Analysis History', icon: History },
    { id: 'guidelines' as ActiveTab, label: 'Prompt Guidelines', icon: BookOpen },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
    { id: 'privacy' as ActiveTab, label: 'Privacy', icon: ShieldCheck },
  ];

  const handleNavClick = (id: ActiveTab) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[#283638]/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#FFFFFF] border-r border-[#E5E2D8] transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}
        aria-label="Application navigation"
      >
        {/* Border Edge Expand Toggle Button for Desktop (only visible when collapsed) */}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:flex items-center justify-center absolute -right-3 top-5 z-20 w-6 h-6 bg-white border border-[#E5E2D8] hover:border-[#49686C] text-[#737A72] hover:text-[#283638] rounded-full shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#49686C]"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Brand Header */}
        <div className={`h-16 flex items-center border-b border-[#E5E2D8] shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          {isCollapsed ? (
            /* Collapsed: Centered Logo Button */
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-lg hover:bg-[#F0EDE3] flex items-center justify-center shrink-0 transition-all cursor-pointer"
              title="Vector - Click to expand sidebar"
              aria-label="Vector - Click to expand sidebar"
            >
              <Logo size={28} />
            </button>
          ) : (
            /* Expanded: Logo + Typography + Collapse button */
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <Logo size={30} />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-base tracking-tight text-[#283638]">
                    Vector
                  </span>
                  <span className="text-[10px] text-[#737A72] tracking-wider uppercase font-semibold truncate">
                    UI/UX Prompt Review
                  </span>
                </div>
              </div>

              {/* Mobile close button (only visible on mobile drawer) */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 text-[#737A72] hover:text-[#283638] rounded-md"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Desktop collapse toggle in header */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex items-center justify-center p-1.5 text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] rounded-md transition-colors"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                  isCollapsed
                    ? 'w-10 h-10 mx-auto justify-center'
                    : 'w-full gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#49686C] text-[#FFFFFF] shadow-xs'
                    : 'text-[#283638] hover:bg-[#F6F4EC] hover:text-[#30494B]'
                }`}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFFFFF]' : 'text-[#737A72]'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Metadata */}
        <div className={`border-t border-[#E5E2D8] bg-[#FAFAF8] ${isCollapsed ? 'p-2.5' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center justify-center py-1 text-center" title="Vector v2.0 · Core Rules">
              <span className="text-[10px] font-mono font-semibold text-[#737A72]">
                v0.8.0
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-[#737A72]">
              <span className="font-mono">Vector v2.0</span>
              <span className="inline-flex items-center gap-1 text-[#49686C] font-medium">
                <Shield className="w-3 h-3" /> BERT + LLM fallback
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
