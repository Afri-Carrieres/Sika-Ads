import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Target, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  Award, 
  Globe2, 
  Zap, 
  Share2, 
  Lock, 
  Smartphone, 
  Building2, 
  DollarSign, 
  Sparkles,
  CheckCircle,
  Menu,
  X,
  LogInIcon,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MobileDrawer from '../components/MobileDrawer';

interface AboutViewProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
  onStart?: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ onNavigate, onStart }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: 'landing', label: 'Accueil' },
    { href: 'legal', label: 'Mentions Légales' },
    { href: 'terms', label: 'Conditions & CGU' },
  ];

  const goToAdvertisers = () => {
    onNavigate('landing');
    setTimeout(() => {
      const el = document.getElementById('annonceurs');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  return (
    <>
      <SEOHead
        title="À Propos de SikaAds | Plateforme d'Influence et Nano-Marketing au Togo"
        description="Découvrez SikaAds Togo : la plateforme qui connecte les marques aux créateurs et ambassadeurs WhatsApp et Facebook."
        canonicalPath="/about"
        ogImage="https://www.sika-ads.com/about_hero.png"
      />
      {/* ── NAV ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <img className="w-36 sm:w-40 h-auto object-contain" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onNavigate('landing')}
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled ? "text-foreground/70 hover:text-foreground" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => onNavigate('legal')}
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled ? "text-foreground/70 hover:text-foreground" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Mentions Légales
            </button>
            <button
              onClick={() => onNavigate('terms')}
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled ? "text-foreground/70 hover:text-foreground" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Conditions
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onStart}
              style={{ backgroundColor: "#ea580c" }}
              className="flex gap-1 items-center justify-center py-2 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Commencer
              <LogInIcon className="w-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6 text-[#ea580c]" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer (Off-Canvas) ── */}
      <MobileDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        navLinks={navLinks}
        onNavigate={(href) => onNavigate(href as any)}
        onCtaClick={() => {
          if (onStart) onStart();
        }}
        ctaText="Commencer"
      />

      <main className="bg-white min-h-screen flex flex-col pt-20 text-slate-900">
      {/* HERO */}
      <header className="relative py-20 bg-slate-950 text-white overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <span className="inline-block px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Plateforme de marketing d'influence en Afrique</span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">Sika Ads : la plateforme de marketing d'influence en Afrique</h1>
          <p className="max-w-2xl text-slate-300 text-lg md:text-xl leading-relaxed mb-8">Sika Ads connecte les marques aux créateurs de contenu africains pour créer des campagnes d'influence ciblées, authentiques et performantes, en valorisant les nano‑et micro‑influenceurs.</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={goToAdvertisers} className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition">Trouver des créateurs</button>
            <button onClick={onStart} className="inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 rounded-2xl font-black uppercase tracking-widest shadow-sm hover:translate-y-[-2px] transition">Devenir créateur</button>
          </div>
        </div>

        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src="/about_hero.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>
      </header>

      {/* Problem */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">Le marketing d’influence évolue. Les marques aussi.</h2>
            <p className="text-slate-600 mb-8">Trouver des créateurs pertinents, mesurer l'impact réel et piloter des campagnes locales reste complexe. Sika Ads simplifie tout cela en mettant la pertinence, l'engagement et les résultats au cœur du processus.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <article className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-black mb-2">Pertinence</h3>
              <p className="text-slate-600">Identifiez des créateurs réellement alignés avec votre audience et vos objectifs.</p>
            </article>
            <article className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-black mb-2">Engagement</h3>
              <p className="text-slate-600">Privilégiez les communautés actives plutôt que les seuls nombres d'abonnés.</p>
            </article>
            <article className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-black mb-2">Résultats</h3>
              <p className="text-slate-600">Construisez des campagnes avec des objectifs clairs et des mesures actionnables.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="py-20 bg-indigo-50">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-4">Une nouvelle façon de faire du marketing d’influence en Afrique</h2>
            <p className="text-slate-700 mb-6">Nous privilégions la pertinence et la proximité : les nano‑influenceurs et micro‑influenceurs peuvent générer des interactions plus significatives pour de nombreuses campagnes.</p>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start"><span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-black">01</span><div><strong className="block font-black">Pertinence</strong><span className="text-slate-600"> - Matching basé sur audience, lieu et affinité.</span></div></li>
              <li className="flex gap-3 items-start"><span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-black">02</span><div><strong className="block font-black">Engagement</strong><span className="text-slate-600"> - Mesures d'interaction pour piloter la campagne.</span></div></li>
              <li className="flex gap-3 items-start"><span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-black">03</span><div><strong className="block font-black">Résultats</strong><span className="text-slate-600"> - Tableaux de bord simples pour suivre la performance.</span></div></li>
            </ul>
          </div>

          <div className="rounded-[2rem] overflow-hidden bg-white p-8 border border-slate-100 shadow-lg">
            <img src="/about_features.svg" alt="Notre approche" className="w-full h-64 object-cover rounded-lg" />
          </div>
        </div>
      </section>

      {/* For Brands & Creators */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="text-xl font-black">Sika Ads pour les marques</h3>
            <p className="text-slate-600">Identifiez des créateurs adaptés, lancez des campagnes ciblées et maitrisez votre budget avec des rapports clairs.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Découvrir des créateurs</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Lancer des campagnes</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Développer votre visibilité</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Atteindre des audiences ciblées</div>
            </div>
n          </div>
n          <div className="space-y-6">
            <h3 className="text-xl font-black">Sika Ads pour les créateurs</h3>
            <p className="text-slate-600">Accédez à des opportunités, monétisez votre audience et développez votre activité, sans exigence de large audience.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Découvrir des opportunités</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Monétiser votre influence</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Développer votre activité</div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">Support & outils</div>
            </div>
n          </div>
        </div>
      </section>

      {/* Nano influencers */}
      <section className="py-20 bg-indigo-50">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <h3 className="text-2xl font-black mb-4">Pourquoi les nano-influenceurs comptent</h3>
          <p className="text-slate-700 mb-6">Les petites communautés peuvent générer une proximité et une confiance qui convertissent mieux pour certaines campagnes. Nous valorisons cette relation.</p>
n          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-100">Proximité</div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100">Engagement</div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100">Ciblage</div>
          </div>
        </div>
      </section>

      {/* Africa center */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h3 className="text-2xl font-black mb-4">Une plateforme pensée pour les réalités africaines</h3>
          <p className="text-slate-600 mb-6">Nous construisons avec la connaissance des usages, langues et dynamiques locales. Notre approche respecte ces spécificités et évite les clichés.</p>
          <div className="rounded-lg overflow-hidden border border-slate-100 shadow-sm">
            <img src="/about_africa.svg" alt="Afrique" className="w-full h-56 object-cover" />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-xl mb-3">Notre mission</h4>
            <p className="text-slate-700">Connecter les marques aux créateurs qui peuvent réellement influencer leurs audiences, et permettre aux créateurs africains de monétiser leur activité.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-xl mb-3">Notre vision</h4>
            <p className="text-slate-700">Devenir la plateforme de référence du marketing d’influence en Afrique, en facilitant des collaborations durables et professionnelles.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white text-center">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-black mb-4">Construisons ensemble l'avenir du marketing d'influence en Afrique.</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToAdvertisers} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest">Je suis une marque</button>
            <button onClick={onStart} className="px-6 py-3 bg-white text-indigo-700 rounded-2xl font-black uppercase tracking-widest">Je suis créateur</button>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </main>
    </>
  );
};

export default AboutView;
