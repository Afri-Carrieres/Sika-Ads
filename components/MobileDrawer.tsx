import React, { useEffect, useRef } from 'react';
import { X, ArrowRight, LogInIcon, ChevronRight } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  onNavigate: (href: string) => void;
  onCtaClick: () => void;
  ctaText?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  navLinks,
  onNavigate,
  onCtaClick,
  ctaText = 'Commencer',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // 1. Bloquer le scroll du body proprement lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // 2. Gestion de la touche Escape pour fermer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
        isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
    >
      {/* ── Overlay d'assombrissement ── */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer Coulissant (depuis la droite) ── */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 h-full w-[85vw] max-w-[360px] bg-white shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header du Drawer */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <img
            src="/Header-LogoSika-Ads.png"
            alt="Logo SikaAds"
            className="w-36 h-auto object-contain"
          />
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Liens de navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 scrollbar-hide font-sans">
          {navLinks.map(({ href, label }) => (
            <button
              key={href}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(href);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 active:bg-slate-100 transition-all group"
              type="button"
            >
              <span>{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </nav>

        {/* Footer du Drawer avec CTA */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70">
          <button
            onClick={() => {
              onClose();
              onCtaClick();
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer"
            style={{
              backgroundColor: '#ea580c',
              boxShadow: '0 8px 24px rgba(234, 88, 12, 0.35)',
            }}
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-center text-slate-400 font-medium mt-3">
            Moov Money · T-Money · 100% Sécurisé
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
