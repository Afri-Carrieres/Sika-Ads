import { useState, useEffect, useRef } from "react";
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Wallet,
  Share2,
  ShieldCheck,
  Zap,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Star,
  CheckCircle,
  ArrowRight,
  Smartphone,
  DollarSign,
  Eye,
  MessageCircle,
  MapPin,
  BarChart2,
  Banknote,
  Play,
  LogInIcon,
} from "lucide-react";

import Footer from "@/components/Footer";

import LandingLogo from "@/public/Header-LogoSika-Ads.png";

// import mock_up from "./Mock-up.png";

/* ─── tiny hook: animate counter ─── */
function useCounter(target: number, duration = 1800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

/* ─── intersection observer hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── data ─── */
const benefits = [
  { icon: Share2, title: "Publiez vos Statuts", desc: "Partagez des publicités sur votre WhatsApp et Facebook comme d'habitude. Aucun changement dans votre routine." },
  { icon: DollarSign, title: "Gagnez à chaque Vue", desc: "Chaque vue sur votre statut vous rapporte de l'argent. Plus vos amis regardent, plus vous gagnez." },
  { icon: ShieldCheck, title: "Paiement Sécurisé", desc: "Retrait rapide vers Mobile Money (Moov, Togocel). Vos gains sont protégés et toujours disponibles." },
  { icon: Zap, title: "Aucune Compétence Requise", desc: "Interface simple et intuitive. Si vous savez publier un statut, vous savez utiliser SikaAds." },
];

const steps = [
  { num: "01", icon: Smartphone, title: "Créez votre compte", desc: "Inscrivez-vous en 2 minutes avec votre numéro de téléphone. Aucun document requis." },
  { num: "02", icon: Share2, title: "Publiez les annonces", desc: "Choisissez les pubs qui vous correspondent et postez-les sur WhatsApp & Facebook." },
  { num: "03", icon: Eye, title: "Vos contacts regardent", desc: "Vos amis et famille voient votre statut normalement. Chaque vue est comptabilisée." },
  { num: "04", icon: Wallet, title: "Retirez vos gains", desc: "Transférez vos gains vers votre Mobile Money en quelques secondes." },
];

const testimonials = [
  { name: "Kofi Mensah", role: "Commerçant, Lomé", avatar: "KM", rating: 5, text: "En 3 semaines, j'ai gagné 45 000 FCFA juste en publiant des statuts. C'est incroyable et tellement simple !" },
  { name: "Ama Sodzi", role: "Étudiante, Kpalimé", avatar: "AS", rating: 5, text: "Je post déjà des statuts tous les jours. SikaAds m'a permis de transformer ça en revenu réel. Merci !" },
  { name: "Yao Agbeko", role: "Artisan, Tsévié", avatar: "YA", rating: 5, text: "Le retrait sur Moov Money est immédiat. J'ai reçu 28 000 FCFA ce mois. Je recommande à tout le monde." },
];

const advertiserFeatures = [
  {
    icon: MapPin,
    title: "Audience Locale",
    desc: "Touchez des centaines d'abonnés WhatsApp et Facebook authentiques à Lomé, Kara et Tsévié.",
  },
  {
    icon: BarChart2,
    title: "Tracking Précis",
    desc: "Suivez vos clics et validations en temps réel depuis votre tableau de bord.",
  },
  {
    icon: Banknote,
    title: "Budget Maîtrisé",
    desc: "Payez uniquement pour les résultats prouvés. Zéro gaspillage budgétaire.",
  },
];

const campaigns = [
  {
    id: 1,
    category: "Mode & Beauté",
    categoryColor: "#7c3aed",
    title: "Kpalimé Chic – Nouvelle Collection",
    image: "https://images.unsplash.com/photo-1557777586-f6682739fcf3?w=600&h=340&fit=crop&auto=format",
    gainVue: 50,
    budget: 350000,
  },
  {
    id: 2,
    category: "High Tech",
    categoryColor: "#0284c7",
    title: "TechTogo Shop – Smartphones 2025",
    image: "https://images.unsplash.com/photo-1603184017968-953f59cd2e37?w=600&h=340&fit=crop&auto=format",
    gainVue: 75,
    budget: 500000,
  },
  {
    id: 3,
    category: "Restauration",
    categoryColor: "#b45309",
    title: "Le Maquis by Kofi – Spécial Été",
    image: "https://images.unsplash.com/photo-1763208692631-00a41bbdc11f?w=600&h=340&fit=crop&auto=format",
    gainVue: 40,
    budget: 200000,
  },
  {
    id: 4,
    category: "Beauté",
    categoryColor: "#be185d",
    title: "Chez Afi Coiffure – Promo Été",
    image: "https://images.unsplash.com/photo-1633504214759-e1013f422ed7?w=600&h=340&fit=crop&auto=format",
    gainVue: 45,
    budget: 150000,
  },
];

const faqs = [
  { q: "Est-ce vraiment gratuit ?", a: "Oui, totalement gratuit. Vous n'avez rien à payer pour commencer à gagner. Nous sommes rémunérés par les annonceurs." },
  { q: "Combien puis-je gagner par mois ?", a: "Les gains varient selon le nombre de contacts et la fréquence de publication. En moyenne, nos utilisateurs actifs gagnent entre 15 000 et 80 000 FCFA par mois." },
  { q: "Quels réseaux sont supportés ?", a: "WhatsApp, Facebook, Instagram et TikTok sont actuellement supportés.." },
  { q: "Comment se fait le retrait ?", a: "Nous supportons Moov Money, T-Money et les transferts bancaires. Le minimum de retrait est 2 000 FCFA." },
  { q: "Mes contacts verront-ils que c'est une pub ?", a: "Les publicités ressemblent à des statuts normaux. Vous choisissez toujours ce que vous publiez." },
];

/* ─── components ─── */
function StatCard({ label, value, suffix = "", prefix = "" }: { label: string; value: number; suffix?: string; prefix?: string }) {
  const { ref, inView } = useInView(0.4);
  const count = useCounter(value, 1600, inView);
  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
        {prefix}{count.toLocaleString("fr-FR")}{suffix}
      </div>
      <div className="mt-2 text-blue-200 text-sm font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-card hover:bg-muted transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground pr-4">{q}</span>
        <ChevronDown
          className={`shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-6 pb-5 text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── campaign carousel ─── */
function CampaignCarousel() {
  const [index, setIndex] = useState(0);
  const visible = 3;
  const max = campaigns.length - visible;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(max, i + 1));

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-widest uppercase" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
            Exemples de campagnes
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Des marques qui{" "}
            <span style={{ color: "#ea580c" }}>paient vrai</span>
          </h2>
        </div>

        {/* carousel track */}
        <div className="relative">
          {/* nav arrows */}
          <button
            onClick={prev}
            disabled={index === 0}
            aria-label="Campagne précédente"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-border bg-card transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={next}
            disabled={index >= max}
            aria-label="Campagne suivante"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-border bg-card transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          <div className="overflow-hidden ">
            <div
              className="flex gap-5 transition-transform duration-400 ease-in-out md:flex"
              style={{ transform: `translateX(calc(-${index} * (100% / ${visible} + 20px / ${visible})))` }}
            >
              {campaigns.map(({ id, category, categoryColor, title, image, gainVue, budget }) => (
                <div
                  key={id}
                  className="shrink-0 rounded-2xl overflow-hidden border border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{ width: `calc(${100 / visible}% - ${(visible - 1) * 20 / visible}px)` }}
                >
                  {/* image */}
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)" }} />
                    {/* category badge */}
                    <span
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {category}
                    </span>
                    {/* play button */}
                    <button
                      aria-label={`Voir la campagne ${title}`}
                      className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      style={{ backgroundColor: "#ea580c" }}
                    >
                      <Play className="w-4 h-4 text-white fill-white" />
                    </button>
                  </div>

                  {/* info */}
                  <div className="px-5 py-4">
                    <h3 className="font-semibold text-foreground text-sm leading-snug mb-4 line-clamp-2">{title}</h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Gain / vue</p>
                        <p className="text-2xl font-extrabold" style={{ color: "#1e3a8a" }}>
                          {gainVue} <span className="text-base font-bold">FCFA</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Budget</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {budget.toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* dots */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: max + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Aller à la page ${i + 1}`}
                className="rounded-full transition-all duration-200 cursor-pointer"
                style={{
                  width: i === index ? "24px" : "8px",
                  height: "8px",
                  backgroundColor: i === index ? "#1e3a8a" : "#cbd5e1",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── main ─── */
interface LandingPageProps {
  user: SupabaseUser | null;
  onStart?: () => void;
  onAdvertise?: () => void;
  setView: (v: string) => void;
}

export default function LandingPage({ user, onStart, onAdvertise, setView }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const sectionId = href.replace("#", "");
    const el = document.getElementById(sectionId);

    setMenuOpen(false);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    // { href: "#accueil", label: "Accueil" },
    { href: "#avantages", label: "Avantages" },
    { href: "#comment", label: "Comment ça marche" },
    { href: "#annonceurs", label: "Entreprises" },
    { href: "#temoignages", label: "Témoignages" },
    { href: "#faq", label: "FAQ" },
    // { href: "#contact", label: "Contact" },
  ];

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── NAV ── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
          }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-2 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#accueil"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("#accueil");
            }}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <img className="w-60 " src={LandingLogo} alt="Logo SikaAds" />

          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(href);
                }}
                className={`text-sm font-medium transition-colors duration-200 ${scrolled
                  ? "text-foreground/70 hover:text-foreground"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => {
                if (user) onStart?.(); else setView('login');
              }}
              style={{ backgroundColor: "#ea580c" }}
              className="flex gap-1 items-center justify-center py-2 mx-auto sm:px-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Commencer
              <LogInIcon className="w-8" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-11 h-11 flex items-center text-white justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-white border-t border-border px-4 py-4 flex flex-col gap-1 items-start">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(href);
                }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="flex ">
            <button
              onClick={() => {
                if (user) onStart?.(); else setView('login');
              }}
              style={{ backgroundColor: "#ea580c" }}
              className="flex gap-1 items-center justify-center py-2 mx-auto sm:px-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Commencer
              <LogInIcon className="w-8" />
            </button>

            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        id="accueil"
        className="relative pt-24 pb-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f1b35 0%, #1e3a8a 55%, #1d4ed8 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, #ea580c 0%, transparent 50%), radial-gradient(circle at 80% 20%, #10b981 0%, transparent 50%)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div className="text-center md:text-left">
              {/* <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-emerald-400/30"
                style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399" }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Disponible au Togo · Paiement garanti
              </div> */}

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
                Gagnez de l'argent avec vos{" "}
                <span style={{ color: "#ea580c" }}>Statuts</span>{" "}
                <span className="text-white">WhatsApp</span>{" "}
                &amp;{" "}
                <span style={{ color: "#34d395" }}>Facebook</span>
              </h1>

              <p className="text-lg text-blue-100 leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                Publiez des publicités sur vos statuts et soyez payé pour chaque vue. Simple, gratuit, et disponible sur Mobile Money.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button
                  onClick={() => { if (user) onStart?.(); else setView('login'); }}
                  id="commencer"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap"
                  style={{
                    backgroundColor: "#ea580c",
                    boxShadow: "0 8px 32px rgba(234,88,12,0.4)",
                  }}
                >
                  Commencer à gagner
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => { if (user) onAdvertise?.(); else setView('login'); }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white border border-white/25 hover:bg-white/10 transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap"
                >
                  Lancer une pub maintenant
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* trust row */}
              <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
                {["✓ Gratuit à 100%", "✓ Moov & T-Money", "✓ +12 000 membres"].map((t) => (
                  <span key={t} className="text-sm text-blue-200 font-medium">{t}</span>
                ))}
              </div>
            </div>

            {/* Right: phone mockup */}
            <div className="relative flex justify-center md:justify-end">
              <div className="relative w-[300px] md:w-[300px]">
                {/* Glow */}
                <div className="absolute -inset-8 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: "#ea580c" }} />

                {/* Phone frame */}
                {/* "Ad" image */}
                <div className="relative h-full overflow-hidden">
                  <img
                    src="./Mock-up.png"
                    alt="Publicité partagée sur statut WhatsApp"
                    className="w-[296px] h-full object-cover rounded-[50px] shadow-2xl"
                  />
                  {/* <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-white text-xs font-semibold">Offre spéciale Lomé ✨</div>
                    <div className="text-white/70 text-xs">Valide jusqu'au 15 juillet</div>
                  </div> */}
                </div>
                {/* Floating badges */}
                {/* <div
                  className="absolute -left-8 top-20 px-3 py-2 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-1.5"
                  style={{ backgroundColor: "#10b981" }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +12 500 F ce mois
                </div> */}
                <div
                  className="absolute -right-6 bottom-20 px-3 py-2 rounded-xl shadow-xl text-xs font-bold flex items-center gap-1.5"
                  style={{ backgroundColor: "#ea580c", color: "#fff" }}
                >
                  <Users className="w-3.5 h-3.5" />
                  12 000+ membres
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="relative mt-16 md:mt-24">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
            <path d="M0 80L60 69.3C120 59 240 37 360 32C480 27 600 37 720 42.7C840 48 960 48 1080 42.7C1200 37 1320 27 1380 21.3L1440 16V80H0Z" fill="#f8faff" />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ backgroundColor: "#1e3a8a" }} className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-row justify-between gap-10 md:gap-17 flex-wrap">
            <StatCard label="Utilisateurs actifs" value={12400} prefix="+" />
            <StatCard label="Versé ce mois" value={4800000} suffix=" FCFA" />
            <StatCard label="Vues générées" value={3200000} prefix="+" />
            <StatCard label="Villes couvertes" value={24} />
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="avantages" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
              Pourquoi SikaAds ?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Votre téléphone est votre<br />
              <span style={{ color: "#ea580c" }}>nouveau bureau</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Transformez ce que vous faites déjà chaque jour en une source de revenus réelle.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-card rounded-2xl p-6 border border-border hover:border-blue-200 hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: "rgba(30,58,138,0.08)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: "#1e3a8a" }} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="comment" style={{ backgroundColor: "#0f1b35" }} className="py-18 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 10% 90%, #ea580c 0%, transparent 40%), radial-gradient(circle at 90% 10%, #10b981 0%, transparent 40%)",
        }} />

        <div className="relative max-w-6xl mx-auto py-8 px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4 border border-emerald-400/25" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#34d399" }}>
              Processus simple
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Commencez à gagner en{" "}
              <span style={{ color: "#ea580c" }}>4 étapes</span>
            </h2>
            <p className="text-blue-200 text-lg max-w-xl mx-auto">
              Pas besoin de formation. Pas de matériel spécial. Juste votre téléphone.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* connector line */}
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />

            {steps.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="relative text-center group">
                <div className="relative inline-flex">
                  <div
                    className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center mb-5 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
                    style={{
                      backgroundColor: "rgba(30,58,138,0.4)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Icon className="w-8 h-8 text-white mb-1" />
                    <span className="text-xs font-bold" style={{ color: "#ea580c" }}>{num}</span>
                  </div>
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* image row */}
          <div className="mt-20 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden h-56 relative">
              <img
                src="https://images.unsplash.com/photo-1768830444423-5e5c640c4c98?w=700&h=400&fit=crop&auto=format"
                alt="Deux hommes regardant un smartphone ensemble"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,27,53,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-5 left-5">
                <div className="text-white font-bold text-lg">Partagez avec vos proches</div>
                <div className="text-blue-200 text-sm">Chaque vue compte</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden h-56 relative">
              <img
                src="https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?w=700&h=400&fit=crop&auto=format"
                alt="Un homme et une femme regardant un téléphone"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,27,53,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-5 left-5">
                <div className="text-white font-bold text-lg">Retirez vos gains</div>
                <div className="text-blue-200 text-sm">Moov & T-Money · Immédiat</div>
              </div>
            </div>
          </div>
        </div>

        {/* wave */}
        <div className="mt-16">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
            <path d="M0 0L60 10.7C120 21 240 43 360 48C480 53 600 43 720 37.3C840 32 960 32 1080 37.3C1200 43 1320 53 1380 58.7L1440 64V80H0V0Z" fill="#f8faff" />
          </svg>
        </div>
      </section>

      {/* ── ADVERTISER / NANO-MARKETING ── */}
      <section id="annonceurs" className="py-18 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1050 0%, #2d1b8e 50%, #1e3a8a 100%)" }}>
        {/* subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 80% 20%, #ea580c 0%, transparent 50%), radial-gradient(circle at 10% 80%, #7c3aed 0%, transparent 50%)",
        }} />

        <div className="relative max-w-5xl mx-auto py-8 px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-widest uppercase border border-violet-400/30" style={{ backgroundColor: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}>
            Pour les entreprises
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Boostez vos ventes grâce au{" "}
            <span style={{ color: "#a78bfa" }}>Nano-Marketing</span>
          </h2>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto mb-14 leading-relaxed">
            La publicité traditionnelle coûte cher. Avec SikaAds, vos produits sont recommandés par des{" "}
            <strong className="text-white font-semibold">centaines de jeunes togolais</strong>{" "}
            à leurs amis proches. C'est la puissance du bouche-à-oreille digital.
          </p>

          <div className="grid sm:grid-cols-3 gap-5 mb-12">
            {advertiserFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6 text-left border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(167,139,250,0.2)" }}>
                  <Icon className="w-5 h-5" style={{ color: "#c4b5fd" }} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-violet-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { if (user) onAdvertise?.(); else setView('login'); }}
            className="group inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white whitespace-nowrap"
            style={{ backgroundColor: "#ea580c", boxShadow: "0 8px 32px rgba(234,88,12,0.4)" }}
          >
            Lancer ma première campagne
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-16">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
            <path d="M0 80L60 69.3C120 59 240 37 360 32C480 27 600 37 720 42.7C840 48 960 48 1080 42.7C1200 37 1320 27 1380 21.3L1440 16V80H0Z" fill="#f8faff" />
          </svg>
        </div>
      </section>

      {/* ── CAMPAIGN EXAMPLES ── */}
      <CampaignCarousel />
      {/* ── TESTIMONIALS ── */}
      <section id="temoignages" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#059669" }}>
              Témoignages
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Ils gagnent déjà avec<br />
              <span style={{ color: "#1e3a8a" }}>SikaAds</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, avatar, rating, text }) => (
              <div
                key={name}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" style={{ color: "#ea580c" }} />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-6 text-sm">&ldquo;{text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: "#1e3a8a" }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{name}</div>
                    <div className="text-muted-foreground text-xs">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* social proof bar */}
          <div className="mt-12 rounded-2xl p-6 flex flex-wrap gap-8 justify-center items-center" style={{ backgroundColor: "rgba(30,58,138,0.05)", border: "1px solid rgba(30,58,138,0.1)" }}>
            {[
              { icon: Users, text: "12 400+ membres actifs" },
              { icon: ShieldCheck, text: "Paiements 100% sécurisés" },
              { icon: TrendingUp, text: "Croissance de 40% / mois" },
              { icon: CheckCircle, text: "Approuvé par des milliers" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#1e3a8a" }}>
                <Icon className="w-4 h-4" style={{ color: "#10b981" }} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ backgroundColor: "#f0f4ff" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
              Questions fréquentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Vous avez des questions ?
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1b35 0%, #1e3a8a 100%)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, #ea580c, transparent 50%), radial-gradient(circle at 80% 20%, #10b981, transparent 50%)",
        }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.3)" }}>
            <Wallet className="w-8 h-8" style={{ color: "#ea580c" }} />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
            Commencez à gagner<br />
            <span style={{ color: "#ea580c" }}>dès aujourd'hui</span>
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Rejoignez 12 000 Togolais qui transforment leurs statuts en revenus réels. C'est gratuit, c'est simple, c'est maintenant.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setView('register')}
              className="group inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                backgroundColor: "#ea580c",
                boxShadow: "0 8px 40px rgba(234,88,12,0.45)",
              }}
            >
              Créer mon compte gratuit
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 justify-center">
            {["Aucune carte requise", "Retrait Mobile Money", "Support en français"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-sm text-blue-200">
                <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer onNavigate={(v) => setView(v)} />
    </div>
  );
}
