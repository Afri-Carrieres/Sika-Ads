
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { LayoutDashboard, Megaphone, CheckCircle2, Wallet, Users, LogOut, StickyNote, Bell, ShieldCheck, Settings, Crown, CreditCard, User, PlusCircle, Menu, X, Check } from 'lucide-react';
import { supabase } from '../supabase';
import { useUserData } from '../hooks/useUserData';
import LandingLogo from "@/public/Header-LogoSika-Ads.png";

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentTab: string;
  setTab: (tab: string) => void;
  onRoleSwitch: () => void;
  onNavigateToProfile: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, currentTab, setTab, onRoleSwitch, onNavigateToProfile }) => {
  const { userData } = useUserData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavItems = () => {
    // Navigation AMBASSADEUR
    if (role === UserRole.AMBASSADOR) {
      return [
        { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'marketplace', label: 'Campagnes', icon: Megaphone },
        { id: 'create-campaign', label: 'Créer une campagne', icon: PlusCircle },
        { id: 'tasks', label: 'Mes Preuves', icon: CheckCircle2 },
        // { id: 'notes', label: 'Stratégies', icon: StickyNote },
        { id: 'wallet', label: 'Portefeuille', icon: Wallet },
        { id: 'profile', label: 'Mon Profil', icon: User },
      ];
    }

    // Navigation STAFF (Commun)
    const adminItems = [
      { id: 'admin-dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      { id: 'admin-campaigns', label: 'Gestion Campagnes', icon: Megaphone },
      // { id: 'create-campaign', label: 'Créer une campagne', icon: PlusCircle },
      { id: 'admin-validation', label: 'Validations', icon: CheckCircle2 },
      { id: 'admin-withdrawals', label: 'Retraits', icon: Wallet },
    ];

    // Navigation RESTREINTE (SUPER_ADMIN Uniquement)
    if (userData?.role === UserRole.ADMIN) {
      adminItems.push(
        { id: 'admin-campaign-payments', label: 'Paiements Campagnes', icon: CreditCard },
        { id: 'admin-create-vip', label: 'Création VIP', icon: Crown },
        { id: 'admin-payouts', label: 'Finances', icon: CreditCard },
        { id: 'admin-users', label: 'Utilisateurs', icon: Users },
        { id: 'admin-team', label: 'Mon Équipe', icon: ShieldCheck },
        { id: 'admin-gombo-status', label: 'Vérif GomboPlus', icon: Check },
        { id: 'profile', label: 'Mon Profil', icon: User },
      );
    }

    return adminItems;
  };


  const navItems = getNavItems();
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

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">

      {/* SIDEBAR DESKTOP (FIXED) */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white border-r border-indigo-900/20 h-screen transition-all duration-300">

        {/* 1. Header Sticky */}
        <div className="p-3 shrink-0 border-b border-indigo-800/30 bg-[#0F172A] z-10">
          <div className="p-1  rounded-lg flex flex-col items-center">
            <img className="w-80 " src={LandingLogo} alt="Logo SikaAds" />
            {/* <h2 className="text-lg font-black tracking-tight leading-none text-white">
              {userData?.role === UserRole.ADMIN ? 'SikaAds HQ' : 'Espace Membre'}
            </h2> */}
            <p className="text-[10px] bg-indigo-600/30 p-2 font-bold text-indigo-400 uppercase tracking-widest mt-1">
              {getRoleLabel()}
            </p>
          </div>
        </div>

        {/* 2. Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            // Map tab id to route
            let to = '/app';
            switch (item.id) {
              case 'dashboard': to = '/app?tab=dashboard'; break;
              case 'marketplace': to = '/app?tab=marketplace'; break;
              case 'tasks': to = '/app?tab=tasks'; break;
              case 'notes': to = '/app?tab=notes'; break;
              case 'wallet': to = '/app?tab=wallet'; break;
              case 'profile': to = '/app?tab=profile'; break;
              case 'create-campaign': to = '/app?tab=create-campaign'; break;
              case 'admin-dashboard': to = '/app?tab=admin-dashboard'; break;
              case 'admin-campaigns': to = '/app?tab=admin-campaigns'; break;
              case 'admin-validation': to = '/app?tab=admin-validation'; break;
              case 'admin-withdrawals': to = '/app?tab=admin-withdrawals'; break;
              case 'admin-campaign-payments': to = '/app?tab=admin-campaign-payments'; break;
              case 'admin-create-vip': to = '/app?tab=admin-create-vip'; break;
              case 'admin-payouts': to = '/app?tab=admin-payouts'; break;
              case 'admin-users': to = '/app?tab=admin-users'; break;
              case 'admin-team': to = '/app?tab=admin-team'; break;
              case 'admin-gombo-status': to = '/app?tab=admin-gombo-status'; break;
              default: to = '/app';
            }
            return (
              <Link
                key={item.id}
                to={to}
                onClick={() => item.id === 'profile' ? onNavigateToProfile() : setTab(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <item.icon
                  size={20}
                  className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-sm font-bold tracking-wide ${isActive ? 'font-black' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 3. Footer / User Info (Bottom Pinned) */}
        <div className="p-4 border-t border-indigo-800/30 bg-[#0F172A] shrink-0 z-10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-xs">
              {userData?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate max-w-[140px]">{userData?.name || 'Utilisateur'}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{userData?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/30"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR (DRAWER) */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar content */}
        <aside
          className={`absolute inset-y-0 left-0 w-72 bg-[#0F172A] text-white shadow-2xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Header */}
          <div className="p-3 shrink-0 border-b border-indigo-800/30 bg-[#0F172A] flex items-center justify-between">
            <div className="flex flex-col items-center gap-3">
              <img className="w-80 " src={LandingLogo} alt="Logo SikaAds" />
              <p className="text-[10px] bg-indigo-600/30  p-2 font-bold text-indigo-400 uppercase tracking-widest mt-1">
                {getRoleLabel()}
              </p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide h-[calc(100vh-280px)]">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              let to = '/app';
              switch (item.id) {
                case 'dashboard': to = '/app?tab=dashboard'; break;
                case 'marketplace': to = '/app?tab=marketplace'; break;
                case 'tasks': to = '/app?tab=tasks'; break;
                case 'notes': to = '/app?tab=notes'; break;
                case 'wallet': to = '/app?tab=wallet'; break;
                case 'profile': to = '/app?tab=profile'; break;
                case 'create-campaign': to = '/app?tab=create-campaign'; break;
                case 'admin-dashboard': to = '/app?tab=admin-dashboard'; break;
                case 'admin-campaigns': to = '/app?tab=admin-campaigns'; break;
                case 'admin-validation': to = '/app?tab=admin-validation'; break;
                case 'admin-withdrawals': to = '/app?tab=admin-withdrawals'; break;
                case 'admin-campaign-payments': to = '/app?tab=admin-campaign-payments'; break;
                case 'admin-create-vip': to = '/app?tab=admin-create-vip'; break;
                case 'admin-payouts': to = '/app?tab=admin-payouts'; break;
                case 'admin-users': to = '/app?tab=admin-users'; break;
                case 'admin-team': to = '/app?tab=admin-team'; break;
                case 'admin-gombo-status': to = '/app?tab=admin-gombo-status'; break;
                default: to = '/app';
              }
              return (
                <Link
                  key={item.id}
                  to={to}
                  onClick={() => {
                    if (item.id === 'profile') {
                      onNavigateToProfile();
                    } else {
                      setTab(item.id);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    size={20}
                    className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-sm font-bold tracking-wide ${isActive ? 'font-black' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-indigo-800/30 bg-[#0F172A] shrink-0 z-10">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-xs">
                {userData?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate max-w-[140px]">{userData?.name || 'Utilisateur'}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{userData?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/30"
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        </aside>
      </div>

      {/* MOBILE HEADER / NAV (Visible only on mobile) */}
      <div className="md:hidden sticky top-0 z-[40] bg-[#0F172A] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-indigo-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2" onClick={() => navigate('/app')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Megaphone size={16} className="text-white" />
            </div>
            <span className="font-black tracking-tight">SikaAds</span>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded text-indigo-200">{getRoleLabel()}</p>
      </div>


      {/* MAIN CONTENT AREA */}
      <main className="
        relative
        min-h-screen
        w-auto
        md:ml-72 
        p-4 sm:p-6 md:p-8 lg:p-10
        transition-all duration-300 ease-in-out
        bg-[cbd3d8] backdrop-blur-sm rounded-2xl shadow-lg shadow-indigo-900/20
      ">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>

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

