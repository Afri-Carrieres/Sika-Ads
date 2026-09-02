import React, { useEffect, useState } from 'react';
import { LogInIcon, Menu } from 'lucide-react';
import MobileDrawer from './MobileDrawer';

export type MarketingView = 'landing' | 'about' | 'legal' | 'terms' | 'contact' | 'privacy';

interface MarketingHeaderProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
  active: MarketingView;
}

const NAV_ITEMS: { view: MarketingView; label: string }[] = [
  { view: 'landing', label: 'Accueil' },
  { view: 'legal', label: 'Mentions Légales' },
  { view: 'terms', label: 'Conditions' },
  { view: 'contact', label: 'Contact' },
];

const MarketingHeader: React.FC<MarketingHeaderProps> = ({ onNavigate, onStart, active }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#128686] rounded-lg"
          >
            <img className="w-36 sm:w-40 h-auto object-contain" src="/Header-LogoSika-Ads.png" alt="Logo Sika Ads" />
          </button>

          <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) =>
              item.view === active ? (
                <span key={item.view} aria-current="page" className="text-sm font-bold text-[#128686]">
                  {item.label}
                </span>
              ) : (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-200"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onStart}
              style={{ backgroundColor: '#F65E06' }}
              className="flex gap-1 items-center justify-center py-2 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#128686]"
            >
              Commencer
              <LogInIcon className="w-4" />
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#128686]"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6 text-[#F65E06]" />
          </button>
        </div>
      </header>

      <MobileDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        navLinks={NAV_ITEMS.map((i) => ({ href: i.view, label: i.label }))}
        onNavigate={(href) => onNavigate(href as MarketingView)}
        onCtaClick={() => {
          if (onStart) onStart();
        }}
        ctaText="Commencer"
      />
    </>
  );
};

export default MarketingHeader;
