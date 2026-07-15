import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Zap
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Footer from '../components/Footer';
import { InstallPrompt } from '../components/InstallPrompt';

interface FAQItemProps {
  question: string;
  answer: string;
}

interface LandingPageProps {
  onStart: () => void;
  onAdvertise: () => void;
  user: SupabaseUser | null;
  setView: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between gap-4 text-left text-gray-900 hover:text-indigo-700 transition-colors"
      >
        <span className="font-bold">{question}</span>
        <ChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
      </button>
      {isOpen && (
        <p className="pb-5 text-sm leading-relaxed text-gray-600 animate-in fade-in slide-in-from-top-1 duration-200">
          {answer}
        </p>
      )}
    </div>
  );
};

function useCarousel(total: number, auto = true, delay = 4500, visible = 1) {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxIndex = Math.max(0, total - Math.max(1, visible));

  const next = () => setCurrent(c => (c >= maxIndex ? 0 : c + 1));
  const prev = () => setCurrent(c => (c <= 0 ? maxIndex : c - 1));

  useEffect(() => {
    if (!auto) return;
    timer.current = setInterval(next, delay);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [maxIndex, delay, auto]);

  useEffect(() => {
    setCurrent(c => Math.min(c, maxIndex));
  }, [maxIndex]);

  const resetTimer = () => {
    if (!auto) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(next, delay);
  };

  return {
    current,
    pages: maxIndex + 1,
    next: () => {
      next();
      resetTimer();
    },
    prev: () => {
      prev();
      resetTimer();
    },
    setCurrent: (i: number) => {
      setCurrent(Math.max(0, Math.min(i, maxIndex)));
      resetTimer();
    }
  };
}

function AnimatedCounter({ target, suffix = '', dark = false }: { target: number; suffix?: string; dark?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1400;
        const step = Math.max(1, Math.ceil(target / (duration / 16)));
        const interval = setInterval(() => {
          start = Math.min(start + step, target);
          setCount(start);
          if (start >= target) clearInterval(interval);
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className={`text-3xl md:text-4xl font-black ${dark ? 'text-gray-950' : 'text-white'}`}>
      {count.toLocaleString()}{suffix}
    </div>
  );
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onAdvertise, user, setView }) => {
  const displayName = (user?.user_metadata?.full_name || user?.user_metadata?.name)?.split(' ')?.[0] || 'Ambassadeur';

  const testimonials = [
    {
      name: 'Afi K.',
      city: 'Lome',
      amount: '38 500',
      text: "J'ai retire plus de 38 000 FCFA en un mois en partageant des campagnes sur mon statut.",
      img: '/testimonial_woman.png',
      tag: 'Ambassadrice depuis 3 mois'
    },
    {
      name: 'Komlan A.',
      city: 'Kara',
      amount: '22 000',
      text: "Je choisis les campagnes, je publie, puis je soumets ma preuve. Le processus est simple.",
      img: '/testimonial_man.png',
      tag: 'Ambassadeur depuis 2 mois'
    },
    {
      name: 'Mawuse D.',
      city: 'Tsevie',
      amount: '15 200',
      text: "SikaAds m'aide a avoir un revenu en plus sans quitter mes cours ni mes activites.",
      img: '/testimonial_woman.png',
      tag: 'Etudiante et ambassadrice'
    }
  ];

  const ambassadorSteps = [
    { icon: Megaphone, title: 'Choisissez une campagne', text: 'Parcourez les campagnes disponibles et selectionnez celles qui correspondent a votre audience.' },
    { icon: MessageCircle, title: 'Partagez le contenu', text: 'Publiez le visuel et le lien de suivi sur WhatsApp, Facebook ou Instagram pendant 24h.' },
    { icon: FileCheck2, title: 'Envoyez la preuve', text: 'Soumettez une capture du statut avec le compteur de vues visible depuis votre espace.' },
    { icon: Wallet, title: 'Recevez vos gains', text: 'Apres validation, vos gains sont credites et peuvent etre retires par T-Money ou Flooz.' }
  ];

  const campaignExamples = [
    { title: 'Mode urbaine a Lome', category: 'Mode', gain: '1 200 FCFA', budget: '350 000 FCFA', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80' },
    { title: 'Smartphones et accessoires', category: 'High-Tech', gain: '1 800 FCFA', budget: '500 000 FCFA', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80' },
    { title: 'Restaurant local', category: 'Restauration', gain: '900 FCFA', budget: '200 000 FCFA', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80' },
    { title: 'Soins naturels', category: 'Beaute', gain: '1 000 FCFA', budget: '180 000 FCFA', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' }
  ];

  const trustItems = [
    { icon: ShieldCheck, title: 'Preuves verifiees', text: 'Chaque preuve est controlee avant validation des gains.' },
    { icon: Smartphone, title: 'Paiement mobile money', text: 'Retrait via T-Money ou Flooz des que le seuil est atteint.' },
    { icon: Clock, title: 'Regles claires', text: 'Les campagnes indiquent le gain, la duree et les conditions de validation.' },
    { icon: CheckCircle2, title: 'Inscription gratuite', text: 'Aucun paiement initial pour devenir ambassadeur.' }
  ];

  const advertiserBenefits = [
    { icon: Users, title: 'Audience locale', text: 'Diffusez vos offres dans les statuts de personnes suivies par leur entourage.' },
    { icon: BarChart3, title: 'Budget controle', text: 'Choisissez votre budget et suivez les preuves de diffusion depuis la plateforme.' },
    { icon: Zap, title: 'Lancement rapide', text: 'Creez une campagne, ajoutez votre visuel et activez la diffusion apres validation.' }
  ];

  const [campaignsPerView, setCampaignsPerView] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setCampaignsPerView(3);
      else if (window.innerWidth >= 768) setCampaignsPerView(2);
      else setCampaignsPerView(1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const testimonialsCarousel = useCarousel(testimonials.length, true, 5200);
  const campaignsCarousel = useCarousel(campaignExamples.length, true, 3800, campaignsPerView);

  return (
    <div className="bg-white text-gray-950 selection:bg-indigo-100 overflow-x-hidden">
      <div className="container mx-auto px-5 pt-4">
        <InstallPrompt />
      </div>

      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gray-950">
        <img
          src="/hero_mockup.png"
          alt="Apercu de l'application SikaAds"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gray-950/75" />
        <div className="container mx-auto px-5 py-20 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/80 mb-7">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Disponible au Togo
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] text-white max-w-4xl">
              Gagnez de l'argent avec vos statuts WhatsApp.
            </h1>
            <p className="mt-7 max-w-2xl text-lg md:text-xl leading-relaxed text-white/75">
              SikaAds connecte les marques locales avec des ambassadeurs qui partagent leurs campagnes, prouvent la diffusion et recoivent leurs gains par T-Money ou Flooz.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              {user ? (
                <button
                  onClick={onStart}
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-gray-950 shadow-xl hover:bg-gray-100 transition-all"
                >
                  <LayoutDashboard size={20} />
                  Bonjour {displayName}
                </button>
              ) : (
                <button
                  onClick={onStart}
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-gray-950 shadow-xl hover:bg-gray-100 transition-all"
                >
                  Je veux gagner
                  <ArrowRight size={20} />
                </button>
              )}
              <button
                onClick={onAdvertise}
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-white/15 transition-all"
              >
                Je veux lancer une campagne
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {[
                { icon: ShieldCheck, text: 'Preuves controlees' },
                { icon: Wallet, text: 'Paiement mobile money' },
                { icon: Megaphone, text: 'Campagnes locales' }
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 flex items-center gap-3 text-white/85">
                  <Icon size={18} className="text-green-300" />
                  <span className="text-sm font-bold">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 border-b border-gray-100 bg-white">
        <div className="container mx-auto px-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { target: 1200, suffix: '+', label: 'ambassadeurs actifs' },
              { target: 350, suffix: '+', label: 'campagnes lancees' },
              { target: 25, suffix: 'M+', label: 'FCFA distribues' },
              { target: 98, suffix: '%', label: 'satisfaction annonceurs' }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-5">
                <AnimatedCounter target={item.target} suffix={item.suffix} dark />
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-8 md:p-10">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-6">
                <Wallet size={24} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700 mb-3">Ambassadeurs</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">Transformez votre audience en revenu.</h2>
              <p className="text-gray-600 leading-relaxed mb-7">
                Choisissez une campagne, partagez le contenu sur vos statuts, envoyez votre preuve et recevez vos gains apres validation.
              </p>
              <button onClick={onStart} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-800 transition-colors">
                Devenir ambassadeur
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-8 md:p-10">
              <div className="w-12 h-12 rounded-lg bg-green-50 text-green-700 flex items-center justify-center mb-6">
                <Megaphone size={24} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700 mb-3">Annonceurs</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">Faites parler de votre offre localement.</h2>
              <p className="text-gray-600 leading-relaxed mb-7">
                Lancez une campagne, fixez votre budget et touchez des clients potentiels via le bouche-a-oreille digital.
              </p>
              <button onClick={onAdvertise} className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-gray-800 transition-colors">
                Creer une campagne
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-5">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700 mb-3">Parcours ambassadeur</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-950 mb-4">Simple, verifiable, paye.</h2>
            <p className="text-gray-600 leading-relaxed">
              Le parcours est concu pour etre clair des le depart : la campagne indique le gain, la preuve attendue et les conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ambassadorSteps.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-lg bg-gray-950 text-white flex items-center justify-center">
                    <Icon size={21} />
                  </div>
                  <span className="text-sm font-black text-gray-300">0{index + 1}</span>
                </div>
                <h3 className="font-black text-gray-950 mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700 mb-3">Campagnes exemple</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-950 mb-4">Des offres concretes, des gains visibles.</h2>
              <p className="text-gray-600 leading-relaxed">
                Les ambassadeurs voient le type de campagne, le gain attendu et le budget avant de participer.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={campaignsCarousel.prev} className="w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-indigo-700 transition-colors flex items-center justify-center">
                <ChevronLeft size={20} />
              </button>
              <button onClick={campaignsCarousel.next} className="w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-indigo-700 transition-colors flex items-center justify-center">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${campaignsCarousel.current * (100 / campaignsPerView)}%)`, width: `${(campaignExamples.length * 100) / campaignsPerView}%` }}
            >
              {campaignExamples.map((campaign) => (
                <div key={campaign.title} style={{ width: `${100 / campaignsPerView}%` }} className="pr-4">
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="relative h-56">
                      <img src={campaign.img} alt={campaign.title} className="w-full h-full object-cover" />
                      <span className="absolute top-4 left-4 rounded-lg bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700">
                        {campaign.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-gray-950 mb-5">{campaign.title}</h3>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="rounded-lg bg-indigo-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Gain</p>
                          <p className="font-black text-gray-950">{campaign.gain}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Budget</p>
                          <p className="font-black text-gray-950">{campaign.budget}</p>
                        </div>
                      </div>
                      <button onClick={onStart} className="w-full rounded-lg bg-gray-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 transition-colors">
                        Voir les campagnes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700 mb-3">Confiance</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-950 mb-5">Un systeme pense pour eviter les abus.</h2>
              <p className="text-gray-600 leading-relaxed">
                SikaAds protege les annonceurs et les ambassadeurs avec des regles simples : preuves obligatoires, verification, validation avant paiement et historique des campagnes.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trustItems.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <div className="w-10 h-10 rounded-lg bg-white text-green-700 flex items-center justify-center mb-4 border border-gray-100">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-black text-gray-950 mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="business" className="py-20 bg-gray-950 text-white">
        <div className="container mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300 mb-3">Pour les annonceurs</p>
              <h2 className="text-3xl md:text-5xl font-black mb-5">Votre campagne circule dans les conversations qui comptent.</h2>
              <p className="text-white/70 leading-relaxed mb-8 max-w-2xl">
                Au lieu d'une publicite froide, votre offre est partagee par des ambassadeurs locaux dans leurs statuts. Vous gardez le controle du budget et des preuves.
              </p>
              <button onClick={onAdvertise} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-gray-950 hover:bg-gray-100 transition-colors">
                Lancer ma premiere campagne
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {advertiserBenefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-white/10 bg-white/10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-lg bg-white text-gray-950 flex items-center justify-center shrink-0">
                      <Icon size={21} />
                    </div>
                    <div>
                      <h3 className="font-black mb-1">{title}</h3>
                      <p className="text-sm leading-relaxed text-white/70">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-5">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700 mb-3">Temoignages</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-950">Ils utilisent deja SikaAds.</h2>
          </div>

          <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-6 md:p-10">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className={`transition-all duration-500 ${index === testimonialsCarousel.current ? 'opacity-100 translate-x-0' : 'opacity-0 absolute inset-6 md:inset-10 translate-x-6 pointer-events-none'}`}
              >
                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                  <img src={testimonial.img} alt={testimonial.name} className="w-24 h-24 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-500 fill-amber-500" />)}
                    </div>
                    <blockquote className="text-xl md:text-2xl font-bold leading-relaxed text-gray-950 mb-4">
                      "{testimonial.text}"
                    </blockquote>
                    <p className="font-black text-gray-950">{testimonial.name}</p>
                    <p className="text-sm font-bold text-gray-500">{testimonial.tag} - {testimonial.city} - +{testimonial.amount} FCFA</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 mt-8">
              <button onClick={testimonialsCarousel.prev} className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 flex items-center justify-center hover:text-indigo-700 transition-colors">
                <ChevronLeft size={19} />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => testimonialsCarousel.setCurrent(i)} className={`h-2.5 rounded-full transition-all ${i === testimonialsCarousel.current ? 'w-8 bg-indigo-700' : 'w-2.5 bg-gray-300'}`} />
                ))}
              </div>
              <button onClick={testimonialsCarousel.next} className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 flex items-center justify-center hover:text-indigo-700 transition-colors">
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700 mb-3">FAQ</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-950">Questions frequentes</h2>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-6">
            <FAQItem question="Comment est-ce que je recois mon argent ?" answer="Vos gains sont transferes sur votre numero T-Money ou Flooz apres validation et demande de retrait. Le seuil minimum est de 2 000 FCFA." />
            <FAQItem question="Est-ce que l'inscription est gratuite ?" answer="Oui. L'inscription ambassadeur est gratuite. Vous gagnez uniquement en participant aux campagnes disponibles." />
            <FAQItem question="Combien puis-je gagner par mois ?" answer="Les gains dependent des campagnes disponibles, de votre activite et des preuves validees. Les ambassadeurs actifs peuvent creer un revenu complementaire regulier." />
            <FAQItem question="Pourquoi une preuve est obligatoire ?" answer="La preuve protege les annonceurs et les ambassadeurs. Elle permet de verifier que la campagne a bien ete diffusee avant paiement." />
            <FAQItem question="Une entreprise peut-elle lancer une campagne ?" answer="Oui. Une entreprise peut creer une campagne, ajouter son visuel, choisir son budget et suivre les diffusions depuis la plateforme." />
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-5">
          <div className="rounded-lg bg-gray-950 px-6 py-12 md:p-14 text-center text-white">
            <h2 className="text-3xl md:text-5xl font-black mb-5">Pret a essayer SikaAds ?</h2>
            <p className="max-w-2xl mx-auto text-white/70 leading-relaxed mb-8">
              Rejoignez les ambassadeurs qui monetisent leur audience, ou lancez une campagne locale avec un budget maitrise.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={onStart} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-gray-950 hover:bg-gray-100 transition-colors">
                Creer mon compte ambassadeur
                <ArrowRight size={18} />
              </button>
              <button onClick={onAdvertise} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors">
                Lancer une campagne
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={setView} />
    </div>
  );
};

export default LandingPage;
