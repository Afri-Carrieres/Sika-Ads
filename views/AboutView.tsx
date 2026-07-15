import React from 'react';
import { Megaphone, Users, TrendingUp, Zap, Globe, ShieldCheck, Heart, Award } from 'lucide-react';
import Footer from '../components/Footer';

interface AboutViewProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
  onStart: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen flex flex-col pt-20">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-20">
          <img src="/about_hero.png" alt="About SikaAds" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              Notre Mission
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-8">
              Démocratiser l'influence<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                pour chaque Togolais.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl font-medium">
              Chez SikaAds, nous croyons que chaque voix compte. Nous transformons le bouche-à-oreille naturel en une opportunité économique réelle pour la jeunesse togolaise.
            </p>
            <button onClick={onStart} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-500 hover:scale-105 transition-all shadow-xl shadow-indigo-900/40">
              Rejoindre l'aventure
            </button>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                Une solution 100% Locale, <br />
                <span className="text-indigo-600">Impact 100% Réel.</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                SikaAds est né d'un constat simple à Lomé : les jeunes passent du temps sur les réseaux sociaux sans en tirer profit, tandis que les PME locales peinent à trouver une visibilité authentique.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                {[
                  { icon: Heart, title: "Proximité", text: "Nous connaissons les réalités du marché togolais." },
                  { icon: ShieldCheck, title: "Confiance", text: "Paiements garantis par T-Money & Flooz." },
                  { icon: Globe, title: "Inclusion", text: "Accessible à tous, partout au Togo." },
                  { icon: Award, title: "Qualité", text: "Une plateforme premium et intuitive." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <item.icon size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-bold">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl relative z-10">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80" alt="Teamwork" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl" />
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl" />
              
              {/* Floating Stat Card */}
              <div className="absolute top-10 -right-4 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 z-20 animate-bounce" style={{ animationDuration: '4s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateurs</p>
                    <p className="text-2xl font-black text-slate-900">+1 200</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 md:p-16 border border-slate-100 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-3xl rounded-full" />
            <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
              <div className="w-48 h-48 rounded-[2rem] overflow-hidden shrink-0 shadow-xl rotate-3 border-4 border-white">
                <img src="/testimonial_man.png" alt="Founder" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Mawuli Akpalo</h3>
                <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-6">Fondateur & CEO</p>
                <blockquote className="text-xl font-bold text-slate-700 leading-relaxed italic mb-8">
                  "SikaAds n'est pas seulement une application, c'est un écosystème où chaque partage crée de la valeur, à la fois pour celui qui publie et pour l'entrepreneur local."
                </blockquote>
                <div className="flex gap-4">
                  <span className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">Tech Entrepreneur</span>
                  <span className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">AfriCarrières</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white text-center">
        <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 max-w-2xl mx-auto leading-tight">
                Prêt à faire partie de la <span className="text-indigo-600">révolution digitale</span> togolaise ?
            </h2>
            <button onClick={onStart} className="px-12 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:scale-105 transition-all">
                Commencer maintenant
            </button>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default AboutView;
