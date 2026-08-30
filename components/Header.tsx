
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Megaphone, Home, LayoutDashboard, ShieldCheck, Menu, X, LogIn, User as UserIcon, HelpCircle, Mail, PlusCircle } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface HeaderProps {
  view: 'landing' | 'app' | 'advertise' | 'login' | 'about' | 'legal' | 'terms';
  role: UserRole;
  setView: (view: 'landing' | 'app' | 'login' | 'advertise' | 'about' | 'legal' | 'terms' | 'contact') => void;
  setRole: (role: UserRole) => void;
  user: SupabaseUser | null;
}

const Header: React.FC<HeaderProps> = ({ view, role, setView, setRole, user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('landing');

  // Reset active section when view changes
  useEffect(() => {
    if (view === 'app' || view === 'advertise') {
      setActiveSection('');
    } else if (view === 'landing' && activeSection === '') {
      setActiveSection('landing');
    }
  }, [view]);

  const navItems = [
    { 
      id: 'landing', 
      label: 'Accueil', 
      icon: Home, 
      active: view === 'landing' && activeSection === 'landing' 
    },
    { 
      id: 'how-it-works', 
      label: 'Comment ça marche', 
      icon: HelpCircle, 
      active: view === 'landing' && activeSection === 'how-it-works' 
    },
    { 
      id: 'advertise', 
      label: 'Lancer une campagne', 
      icon: PlusCircle, 
      active: view === 'landing' && activeSection === 'advertise' 
    },
    { 
      id: 'contact', 
      label: 'Contact', 
      icon: Mail, 
      active: view === 'landing' && activeSection === 'contact' 
    },
  ];

  const handleNav = (id: string) => {
    if (id === 'landing') {
      setView('landing');
      setActiveSection('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (id === 'how-it-works') {
      if (view !== 'landing') setView('landing');
      setActiveSection('how-it-works');
      setTimeout(() => {
        const el = document.getElementById('comment');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (id === 'contact') {
      setView('contact');
      setActiveSection('contact');
    } else if (id === 'advertise') {
      if (view !== 'landing') setView('landing');
      setActiveSection('advertise');
      setTimeout(() => {
        const el = document.getElementById('annonceurs');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (id === 'login') {
      setView('login');
    }
    setIsMenuOpen(false);
  };

  const getAuthButtonConfig = () => {
    if (!user) {
      return {
        label: 'Connexion',
        mobileLabel: 'Se connecter',
        icon: LogIn,
        action: () => handleNav('login')
      };
    }

    if (['landing', 'advertise', 'about', 'legal', 'terms'].includes(view)) {

      return {
        label: 'Tableau de bord',
        mobileLabel: 'Tableau de bord',
        icon: LayoutDashboard,
        action: () => {
          setView('app');
          setIsMenuOpen(false);
        }
      };
    }

    // When in APP view, show Profile button
    return {
      label: 'Mon Profil',
      mobileLabel: 'Mon Profil',
      icon: UserIcon,
      action: () => {
        setView('profile');
        setIsMenuOpen(false);
      }
    };
  };

  const authBtn = getAuthButtonConfig();

  return (
    <header className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => handleNav('landing')}
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Megaphone className="text-white" size={20} />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tighter">SikaAds</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            {['landing', 'about', 'legal', 'terms'].includes(view) && (

              <>
                <nav className="flex items-center gap-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        item.active 
                          ? 'bg-indigo-50 text-indigo-600' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </nav>
                
                <div className="h-6 w-px bg-gray-100 mx-2"></div>
              </>
            )}

            <button 
              onClick={authBtn.action}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                user && (view === 'app' || view === 'profile')
                  ? 'bg-indigo-50 text-indigo-600 shadow-indigo-100 hover:bg-indigo-100'
                  : 'bg-gray-900 text-white shadow-gray-200 hover:bg-black'
              }`}
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full border border-indigo-200 object-cover" alt="Profile" />
              ) : (
                <authBtn.icon size={18} />
              )}
              {authBtn.label}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {['landing', 'about', 'legal', 'terms'].includes(view) &&

              navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-bold transition-all ${
                    item.active 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            
            <div className="pt-4 border-t border-gray-50">
              <button 
                onClick={authBtn.action}
                className={`w-full flex items-center justify-center gap-3 px-4 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all ${
                  user && (view === 'app' || view === 'profile')
                    ? 'bg-indigo-50 text-indigo-600 shadow-indigo-100'
                    : 'bg-gray-900 text-white shadow-gray-100'
                }`}
              >
                <authBtn.icon size={20} />
                {authBtn.mobileLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
