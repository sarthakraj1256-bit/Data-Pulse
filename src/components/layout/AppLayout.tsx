import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Database,
  UploadCloud,
  ShieldCheck,
  Wand2,
  GitBranch,
  BarChart3,
  Sparkles,
  FileText,
  Settings,
  Radio,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Layers,
  FlaskConical,
  UserCheck,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDataset } from '../../context/DatasetContext';
import { Toast } from '../common/Toast';
import { OfflineStatusIndicator } from '../common/OfflineStatusIndicator';
import { GlobalKeyboardManager } from '../common/GlobalKeyboardManager';

interface AppLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentPath, navigate, children }) => {
  const { user, logout } = useAuth();
  const { datasets, currentDataset, selectDataset, loadSyntheticBenchmark } = useDataset();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('datapulse_sidebar_collapsed') === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Sync sidebar collapsed state
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('datapulse_sidebar_collapsed', String(newState));
  };

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: 'Overview', path: '/app', icon: LayoutDashboard },
    { label: 'Datasets', path: '/app/datasets', icon: Database, badge: datasets.length > 0 ? `${datasets.length}` : undefined },
    { label: 'Upload Data', path: '/app/upload', icon: UploadCloud },
    { label: 'Data Quality', path: '/app/quality', icon: ShieldCheck },
    { label: 'Cleaning Studio', path: '/app/cleaning', icon: Wand2 },
    { label: 'Data Lineage', path: '/app/lineage', icon: GitBranch, badge: currentDataset?.lineage.length ? `${currentDataset.lineage.length}` : undefined },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { label: 'Predictions', path: '/app/predictions', icon: Sparkles, tag: 'EXP' },
    { label: 'Reports', path: '/app/reports', icon: FileText },
    { label: 'IoT / ESP32', path: '/app/iot', icon: Radio, tag: 'ROADMAP' },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Get current page title for breadcrumb
  const currentNavItem = navItems.find(item => item.path === currentPath);
  const pageTitle = currentNavItem?.label || 'Workspace';

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#29212A] flex flex-col antialiased">
      <Toast />

      {/* Top Application Bar */}
      <header className="h-16 border-b border-[#D9A0AE]/30 bg-[#FFF8EF]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-[#641B32] hover:bg-[#F8EFE5] focus:outline-none focus:ring-2 focus:ring-[#641B32]"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo / Brand */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#641B32] to-[#3D1023] flex items-center justify-center text-[#FFF8EF] shadow-sm">
              <FlaskConical className="w-5 h-5 text-[#FFF8EF]" />
            </div>
            <div className="hidden sm:block">
              <div className="font-serif font-bold text-base tracking-tight text-[#3D1023] group-hover:text-[#641B32] transition-colors">
                DataPulse
              </div>
              <div className="text-[10px] tracking-wider uppercase text-[#756772] -mt-1 font-mono">
                Trusted Intelligence
              </div>
            </div>
          </button>

          {/* Breadcrumb separator */}
          <div className="hidden md:flex items-center gap-2 ml-4 text-xs text-[#756772]">
            <ChevronRight className="w-3.5 h-3.5 text-[#D9A0AE]" />
            <span className="font-medium text-[#29212A]">{pageTitle}</span>
          </div>
        </div>

        {/* Center / Right controls: Offline status, shortcuts, dataset selector & User dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline Status & Queue Indicator */}
          <OfflineStatusIndicator />

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts (Press ? or Cmd+K)"
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-[#756772] hover:text-[#641B32] hover:bg-[#F8EFE5] rounded-xl transition-colors border border-transparent hover:border-[#D9A0AE]/30 flex items-center gap-1.5 text-xs focus:outline-none"
            aria-label="View keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4 text-[#641B32]" />
            <span className="hidden md:inline text-xs font-medium text-[#29212A]">Shortcuts</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded text-[#641B32]">
              ?
            </kbd>
          </button>

          {/* Active Dataset Quick Selector */}
          {datasets.length > 0 ? (
            <div className="relative">
              <select
                value={currentDataset?.id || ''}
                onChange={e => selectDataset(e.target.value)}
                className="text-xs bg-[#F8EFE5] border border-[#D9A0AE]/40 rounded-xl px-3 py-1.5 font-medium text-[#3D1023] focus:outline-none focus:border-[#641B32] max-w-[160px] sm:max-w-[220px] truncate"
                aria-label="Select active dataset"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.isSynthetic ? '🧪 ' : '📁 '} {d.name} ({d.rowCount}r)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={() => loadSyntheticBenchmark()}
              className="text-xs px-3 py-1.5 rounded-xl bg-[#641B32]/10 text-[#641B32] font-semibold hover:bg-[#641B32]/20 transition-colors flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Load Synthetic Benchmark</span>
            </button>
          )}

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F8EFE5] transition-colors focus:outline-none"
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#641B32] text-[#FFF8EF] font-semibold text-xs flex items-center justify-center border border-[#D9A0AE]/30">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#756772] hidden sm:block" />
            </button>

            {/* Profile Dropdown Popup */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-[#D9A0AE]/20">
                  <p className="text-xs font-bold text-[#29212A]">{user?.name}</p>
                  <p className="text-[11px] text-[#756772] truncate">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F8EFE5] text-[#641B32] border border-[#D9A0AE]/20">
                      {user?.role || 'Analyst'}
                    </span>
                    <span className="text-[10px] text-[#756772]">
                      {user?.organization || 'DataPulse Lab'}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/app/settings');
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-[#F8EFE5] text-[#29212A] flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#756772]" />
                    <span>Account Settings</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-[#D9A0AE]/20">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl text-[#B4233D] hover:bg-[#B4233D]/10 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main App Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-[#D9A0AE]/30 bg-[#F8EFE5]/50 transition-all duration-300 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Collapse Toggle */}
          <div className="p-3 border-b border-[#D9A0AE]/20 flex justify-end">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-[#756772] hover:text-[#641B32] hover:bg-[#FFF8EF] transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/app' && currentPath.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                      : 'text-[#756772] hover:text-[#29212A] hover:bg-[#FFF8EF]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#FFF8EF]' : 'text-[#756772] group-hover:text-[#641B32]'
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-[#FFF8EF]/20 text-[#FFF8EF]' : 'bg-[#D9A0AE]/30 text-[#641B32]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {!isSidebarCollapsed && item.tag && (
                    <span
                      className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded ${
                        item.tag === 'EXP'
                          ? 'bg-[#B77722]/15 text-[#B77722]'
                          : 'bg-[#756772]/15 text-[#756772]'
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-[#D9A0AE]/20 text-[11px] text-[#756772]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#277A58]" />
                <span className="font-semibold text-[#29212A]">Engine Operational</span>
              </div>
              <p className="text-[10px] leading-tight">
                Deterministic 6-D Quality Rules Active
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Slide-out Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#3D1023]/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer Container */}
            <div className="relative w-72 max-w-[85vw] bg-[#FFF8EF] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-[#D9A0AE]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#641B32] flex items-center justify-center text-[#FFF8EF]">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm text-[#3D1023]">DataPulse</h2>
                    <p className="text-[10px] text-[#756772]">From Raw to Trusted</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#756772] hover:text-[#29212A]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || (item.path !== '/app' && currentPath.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#641B32] text-[#FFF8EF]'
                          : 'text-[#756772] hover:bg-[#F8EFE5] hover:text-[#29212A]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/20">
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/10 font-mono">
                          {item.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="p-4 border-t border-[#D9A0AE]/30 bg-[#F8EFE5]/50">
                <div className="text-xs font-medium text-[#29212A] mb-1">
                  Signed in as {user?.name}
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="text-xs text-[#B4233D] font-medium flex items-center gap-1.5 hover:underline"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#FFF8EF] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Keyboard Shortcuts Manager & HUD */}
      <GlobalKeyboardManager
        navigate={navigate}
        isModalOpen={isShortcutsModalOpen}
        setIsModalOpen={setIsShortcutsModalOpen}
      />
    </div>
  );
};
