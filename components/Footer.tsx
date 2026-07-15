import React from 'react';
import { Megaphone, Facebook, Instagram, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-20 border-t border-slate-900 border-opacity-50 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('landing')}>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 group-hover:scale-110 transition-transform">
                <Megaphone className="text-white" size={22} />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">SikaAds</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-slate-400/80">
              La première plateforme de nano-influence au Togo. 
              Monétisez vos réseaux sociaux tout en aidant les entreprises locales à grandir.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 border border-slate-800">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 border border-slate-800">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 border border-slate-800">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Plateforme</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><button onClick={() => onNavigate('landing')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Accueil</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">À Propos</button></li>
              <li><button className="hover:text-indigo-400 transition-colors flex items-center gap-2">Comment ça marche</button></li>
              <li><button className="hover:text-indigo-400 transition-colors flex items-center gap-2">Pour les entreprises</button></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Légal & Aide</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><button onClick={() => onNavigate('legal')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">Mentions Légales</button></li>
              <li><button onClick={() => onNavigate('terms')} className="hover:text-indigo-400 transition-colors flex items-center gap-2">CGU & Anti-Fraude</button></li>
              <li><button className="hover:text-indigo-400 transition-colors flex items-center gap-2">Confidentialité</button></li>
              <li><button className="hover:text-indigo-400 transition-colors flex items-center gap-2">Support Client</button></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-white font-black uppercase text-[10px] tracking-[0.2em] mb-8">Contactez-nous</h3>
            <ul className="space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <MapPin size={16} className="text-indigo-500" />
                </div>
                <span className="font-bold text-slate-300">Lomé, Quartier Agoè, Boulevard Eyadema, Togo</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Phone size={16} className="text-indigo-500" />
                </div>
                <span className="font-bold text-slate-300">+228 90 00 00 00</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <Mail size={16} className="text-indigo-500" />
                </div>
                <span className="font-bold text-slate-300">contact@sikaads.tg</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Copyright © 2026 SikaAds Togo. Tous droits réservés.
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-600 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-full">Designed for Modern Togo 🇹🇬</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
