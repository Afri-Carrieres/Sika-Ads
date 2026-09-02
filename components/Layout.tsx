
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { LayoutDashboard, Megaphone, CheckCircle2, Wallet, Users, LogOut, StickyNote, Bell, ShieldCheck, Settings, Crown, CreditCard, User, PlusCircle, Menu, X, Check, BarChart2, ChevronDown } from 'lucide-react';
import { supabase } from '../supabase';
import { useUserData } from '../hooks/useUserData';
import BottomNavigation from './BottomNavigation';
import AdminBottomNavigation from './AdminBottomNavigation';
import { getAdminNavigation, NavGroup, NavItem } from '../config/adminNavigation';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentTab: string;
  setTab: (tab: string) => void;
  onRoleSwitch: () => void;
}

const AMBASSADOR_NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'marketplace', label: 'Campagnes', icon: Megaphone },
  { id: 'create-campaign', label: 'Créer une campagne', icon: PlusCircle },
  { id: 'my-campaigns', label: 'Mes Campagnes', icon: BarChart2 },
  { id: 'tasks', label: 'Mes Preuves', icon: CheckCircle2 },
  { id: 'wallet', label: 'Portefeuille', icon: Wallet },
  { id: 'profile', label: 'Mon Profil', icon: User },
];

const COLLAPSED_STORAGE_KEY = 'sikaads_admin_nav_collapsed';

const loadCollapsedState = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
};

const saveCollapsedState = (state: Record<string, boolean>) => {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const Layout: React.FC<LayoutProps> = ({ children, role, currentTab, setTab, onRoleSwitch }) => {
  const { userData } = useUserData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(loadCollapsedState);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      saveCollapsedState(next);
      return next;
    });
  }, []);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const getRoleLabel = () => {
    if (userData?.role === UserRole.ADMIN) return 'Directeur Plateforme';
    if (userData?.role === UserRole.MODERATOR) return 'Staff Opérationnel';
    return 'Ambassadeur';
  };

  const isStaff = role === UserRole.ADMIN || role === UserRole.MODERATOR;
  const adminNavGroups = isStaff ? getAdminNavigation(userData?.role as 'ADMIN' | 'MODERATOR' | null) : [];

  const isItemActive = (itemId: string) => currentTab === itemId;

  const isGroupActive = (group: NavGroup) => group.items.some(item => isItemActive(item.id));

  const getItemRoute = (item: NavItem) => item.route;

  const renderNavItem = (item: NavItem | typeof AMBASSADOR_NAV_ITEMS[number], isAmbassador: boolean) => {
    const isActive = isItemActive(item.id);
    const to = 'route' in item ? (item as NavItem).route : (item.id === 'profile' ? '/profile' : `/app/${item.id}`);
    return (
      <Link
        key={item.id}
        to={to}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
          ${isActive
            ? 'bg-[#128686] text-white shadow-lg shadow-[#062127]/40'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        <item.icon
          size={20}
          className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <span className={`text-sm tracking-wide ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
          {item.label}
        </span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </Link>
    );
  };

  const renderGroupLabel = (group: NavGroup) => {
    const groupIsActive = isGroupActive(group);
    const isCollapsed = collapsedGroups[group.id] ?? !group.defaultOpen;

    if (!group.collapsible) {
      return (
        <div className="pt-4 pb-2 px-4 first:pt-2">
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${groupIsActive ? 'text-[#7FD1D1]' : 'text-slate-500'}`}>
            {group.label}
          </span>
        </div>
      );
    }

    return (
      <div className="pt-4 pb-1 px-1 first:pt-2">
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors duration-150 hover:bg-white/5 ${groupIsActive ? 'text-[#7FD1D1]' : 'text-slate-500 hover:text-slate-300'}`}
          aria-expanded={!isCollapsed}
          aria-controls={`nav-group-${group.id}`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
            {group.label}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
    );
  };

  const renderAdminNav = (onNavigate?: () => void) => {
    return adminNavGroups.map((group) => {
      const isCollapsed = group.collapsible ? (collapsedGroups[group.id] ?? !group.defaultOpen) : false;
      return (
        <div key={group.id}>
          {renderGroupLabel(group)}
          {(!group.collapsible || !isCollapsed) && (
            <div
              id={`nav-group-${group.id}`}
              className="space-y-0.5 px-1"
            >
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  to={getItemRoute(item)}
                  onClick={onNavigate}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                    ${isItemActive(item.id)
                      ? 'bg-[#128686] text-white shadow-lg shadow-[#062127]/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    size={18}
                    className={`shrink-0 ${isItemActive(item.id) ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
                    strokeWidth={isItemActive(item.id) ? 2.5 : 2}
                  />
                  <span className={`text-[13px] tracking-wide ${isItemActive(item.id) ? 'font-bold text-white' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {isItemActive(item.id) && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderAmbassadorNav = (onNavigate?: () => void) => {
    return AMBASSADOR_NAV_ITEMS.map((item) => {
      const isActive = currentTab === item.id;
      const to = item.id === 'profile' ? '/profile' : `/app/${item.id}`;
      return (
        <Link
          key={item.id}
          to={to}
          onClick={onNavigate}
          className={`
            w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
            ${isActive
              ? 'bg-[#128686] text-white shadow-lg shadow-[#062127]/40'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }
          `}
        >
          <item.icon
            size={20}
            className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span className={`text-sm tracking-wide ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
            {item.label}
          </span>
          {isActive && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </Link>
      );
    });
  };

  const renderSidebarFooter = () => (
    <div className="p-4 border-t border-[#128686]/30 bg-[#062127] shrink-0 z-10">
      <div className="flex items-center gap-3 mb-4 px-2">
        <div className="w-9 h-9 rounded-full bg-[#128686]/20 flex items-center justify-center text-[#7FD1D1] font-bold border border-[#128686]/30 text-xs">
          {userData?.name?.charAt(0) || 'U'}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-white truncate max-w-[140px]">{userData?.name || 'Utilisateur'}</p>
          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{userData?.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/30"
      >
        <LogOut size={14} />
        Déconnexion
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">

      {isStaff ? (
        <>
          <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-72 bg-[#062127] text-white border-r border-[#128686]/25 h-screen transition-all duration-300">

            <div className="p-3 shrink-0 border-b border-[#128686]/30 bg-[#062127] z-10">
              <div className="p-1 rounded-lg flex flex-col items-center">
                <img className="w-40" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
                <p className="text-[10px] bg-[#128686]/30 p-2 font-bold text-[#7FD1D1] uppercase tracking-widest mt-1">
                  {getRoleLabel()}
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
              {renderAdminNav()}
            </nav>

            {renderSidebarFooter()}
          </aside>

          <div
            className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside
              className={`absolute inset-y-0 left-0 w-72 bg-[#062127] text-white shadow-2xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="p-3 shrink-0 border-b border-[#128686]/30 bg-[#062127] flex items-center justify-between">
                <div className="flex flex-col items-center gap-1">
                  <img className="w-40" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
                  <p className="text-[10px] bg-[#128686]/30 p-2 font-bold text-[#7FD1D1] uppercase tracking-widest mt-1">
                    {getRoleLabel()}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide h-[calc(100vh-220px)]">
                {renderAdminNav(() => setIsMobileMenuOpen(false))}
              </nav>

              {renderSidebarFooter()}
            </aside>
          </div>
        </>
      ) : (
        <>
          <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-72 bg-[#062127] text-white border-r border-[#128686]/25 h-screen transition-all duration-300">

            <div className="p-3 shrink-0 border-b border-[#128686]/30 bg-[#062127] z-10">
              <div className="p-1 rounded-lg flex flex-col items-center">
                <img className="w-40" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
                <p className="text-[10px] bg-[#128686]/30 p-2 font-bold text-[#7FD1D1] uppercase tracking-widest mt-1">
                  {getRoleLabel()}
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
              {renderAmbassadorNav()}
            </nav>

            {renderSidebarFooter()}
          </aside>

          <div
            className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside
              className={`absolute inset-y-0 left-0 w-72 bg-[#062127] text-white shadow-2xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="p-3 shrink-0 border-b border-[#128686]/30 bg-[#062127] flex items-center justify-between">
                <div className="flex flex-col items-center gap-3">
                  <img className="w-40" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
                  <p className="text-[10px] bg-[#128686]/30 p-2 font-bold text-[#7FD1D1] uppercase tracking-widest mt-1">
                    {getRoleLabel()}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide h-[calc(100vh-280px)]">
                {renderAmbassadorNav(() => setIsMobileMenuOpen(false))}
              </nav>

              {renderSidebarFooter()}
            </aside>
          </div>
        </>
      )}

      <div className="md:hidden sticky top-0 z-[40] bg-[#062127] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-[#7FD1D1] hover:text-white transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2" onClick={() => navigate('/app')}>
            <img className="w-40" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
          </div>
        </div>
        <p className="text-[10px] font-bold uppercase bg-white/10 px-2 py-1 rounded text-[#A9DADA]">{getRoleLabel()}</p>
      </div>


      <main className="
        relative
        min-h-screen
        w-auto
        md:ml-72 
        p-4 sm:p-6 md:p-8 lg:p-10
        pb-24 md:pb-8
        transition-all duration-300 ease-in-out
        bg-transparent backdrop-blur-sm rounded-2xl shadow-lg shadow-[#062127]/40
      ">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>

      {role === UserRole.AMBASSADOR ? (
        <BottomNavigation 
          currentTab={currentTab} 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
        />
      ) : (
        <AdminBottomNavigation 
          currentTab={currentTab} 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Layout;
