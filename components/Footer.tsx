import React from 'react';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const navigateToLandingSection = (sectionId: string) => {
    onNavigate('landing');

    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <footer id="contact" className="bg-slate-950 text-slate-400 py-14 sm:py-16 lg:py-20 px-4 sm:px-8 lg:px-16 xl:px-24 border-t border-slate-900 border-opacity-50 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />

      <div className="container mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-16">
          {/* Brand Column */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center cursor-pointer group" onClick={() => navigateToLandingSection('accueil')}>
              <img className="w-40 sm:w-68 lg:w-80" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-slate-400/80">
              La plateforme qui connecte les créateurs de contenu aux marques en Afrique. Monétisez vos réseaux sociaux et aidez les entreprises à se faire connaître.
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button type="button" aria-label="Facebook" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-[#128785] hover:text-white transition-all duration-300 border border-slate-800">
                <Facebook size={18} />
              </button>
              <button type="button" aria-label="Instagram" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-[#128785] hover:text-white transition-all duration-300 border border-slate-800">
                <Instagram size={18} />
              </button>
              <button type="button" aria-label="LinkedIn" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-[#128785] hover:text-white transition-all duration-300 border border-slate-800">
                <Linkedin size={18} />
              </button>
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="font-heading text-white font-bold uppercase text-xs tracking-[0.15em] mb-6 sm:mb-8">Plateforme</h3>
            <ul className="space-y-3 sm:space-y-4 text-sm font-medium">
              <li><button onClick={() => navigateToLandingSection('accueil')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Accueil</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">À Propos</button></li>
              <li><button onClick={() => navigateToLandingSection('comment')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Comment ça marche</button></li>
              <li><button onClick={() => navigateToLandingSection('annonceurs')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Pour les entreprises</button></li>
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Contact</button></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-heading text-white font-bold uppercase text-xs tracking-[0.15em] mb-6 sm:mb-8">Légal & Aide</h3>
            <ul className="space-y-3 sm:space-y-4 text-sm font-medium">
              <li><button onClick={() => onNavigate('legal')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Mentions Légales</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">CGU & Anti-Fraude</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Confidentialité</button></li>
              <li><button onClick={() => onNavigate('contact')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Support Client</button></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="font-heading text-white font-bold uppercase text-xs tracking-[0.15em] mb-6 sm:mb-8">Contactez-nous</h3>
            <ul className="space-y-4 sm:space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <MapPin size={16} className="text-[#128785]" />
                </div>
                <span className="font-medium text-slate-300">Lomé-Togo, Quartier Hédranawoé</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Phone size={16} className="text-[#128785]" />
                </div>
                <span className="font-medium text-slate-300">+228 91 41 67 45</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Mail size={16} className="text-[#128785]" />
                </div>
                <span className="font-medium text-slate-300 break-all sm:break-normal">contact@sikaads.tg</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 sm:pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-center items-center gap-6 text-center">
          <p className="text-xs font-medium text-slate-500">
            Copyright © 2026 SikaAds. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
