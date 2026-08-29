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
import SEOHead from "@/components/SEOHead";
import MobileDrawer from "@/components/MobileDrawer";


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
  { icon: Share2, title: "Partagez du contenu", desc: "Publiez les visuels et contenus des marques sur vos réseaux sociaux (WhatsApp, Facebook, Instagram) selon vos habitudes." },
  { icon: DollarSign, title: "Gagnez de l'argent", desc: "Participez à des campagnes rémunérées et valorisez vos réseaux sociaux selon les conditions prévues." },
  { icon: Users, title: "Développez votre audience", desc: "Construisez une communauté engagée qui vous suit, interagit avec vos publications et vous fait confiance." },
  { icon: Zap, title: "Choisissez vos campagnes", desc: "Découvrez librement les opportunités qui correspondent à vos centres d'intérêt et à votre profil." },
];

const steps = [
  { num: "01", icon: Smartphone, title: "Créez votre compte", desc: "Inscrivez-vous sur Sika Ads en quelques instants et renseignez votre profil." },
  { num: "02", icon: Eye, title: "Découvrez les campagnes", desc: "Trouvez les campagnes de marques qui correspondent à votre profil et vos réseaux." },
  { num: "03", icon: Share2, title: "Partagez les contenus", desc: "Publiez les contenus de campagne sur vos réseaux sociaux selon les conditions prévues." },
  { num: "04", icon: Wallet, title: "Recevez vos gains", desc: "Suivez vos campagnes et recevez votre rémunération selon les modalités prévues." },
];

const testimonials = [
  { name: "Kofi Mensah", role: "Commerçant, Lomé", avatar: "KM", rating: 5, text: "En 3 semaines, j'ai gagné 45 000 FCFA juste en publiant des statuts. C'est incroyable et tellement simple !" },
  { name: "Ama Sodzi", role: "Étudiante, Kpalimé", avatar: "AS", rating: 5, text: "Je post déjà des statuts tous les jours. SikaAds m'a permis de transformer ça en revenu réel. Merci !" },
  { name: "Yao Agbeko", role: "Artisan, Tsévié", avatar: "YA", rating: 5, text: "Le retrait sur Moov Money est immédiat. J'ai reçu 28 000 FCFA ce mois. Je recommande à tout le monde." },
];

const advertiserFeatures = [
  {
    icon: Eye,
    title: "Plus de visibilité",
    desc: "Faites découvrir votre marque à de nouvelles audiences ciblées et attentives.",
  },
  {
    icon: Users,
    title: "Des communautés ciblées",
    desc: "Travaillez avec des créateurs authentiques et proches de leurs communautés.",
  },
  {
    icon: BarChart2,
    title: "Des campagnes simples",
    desc: "Créez des campagnes adaptées à vos objectifs avec un suivi transparent des résultats.",
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
  {
    q: "Comment gagner de l'argent avec ses réseaux sociaux ?",
    a: "Sika Ads vous permet de participer à des campagnes organisées par des marques partenaires. En publiant leurs visuels ou messages sur vos réseaux sociaux (WhatsApp, Facebook, Instagram), vous valorisez votre audience et percevez une rémunération selon les conditions de chaque campagne."
  },
  {
    q: "Comment gagner de l'argent avec WhatsApp ?",
    a: "Sélectionnez une campagne disponible sur Sika Ads, téléchargez l'affiche ou le texte prévu, puis publiez-le sur votre statut WhatsApp. Vous soumettez ensuite votre preuve de diffusion pour valider vos gains."
  },
  {
    q: "Comment gagner de l'argent avec Facebook ?",
    a: "Partagez les visuels et liens promotionnels des campagnes sur votre profil Facebook ou en story. Les modalités et conditions de validation peuvent varier selon la campagne."
  },
  {
    q: "Comment gagner de l'argent avec Instagram ?",
    a: "Publiez les visuels de campagne en story ou post Instagram en mentionnant les consignes du partenaire. Votre communauté découvre la marque et votre participation est validée."
  },
  {
    q: "Comment fonctionne Sika Ads ?",
    a: "Sika Ads connecte directement les marques et les créateurs de contenu. Les entreprises soumettent des campagnes avec un budget précis, et les utilisateurs inscrits diffusent ces annonces auprès de leurs proches et contacts."
  },
  {
    q: "Comment devenir créateur sur Sika Ads ?",
    a: "Il vous suffit de créer un compte gratuit en quelques clics avec votre numéro de téléphone, de compléter votre profil et d'accéder au catalogue des campagnes disponibles."
  },
  {
    q: "Faut-il avoir beaucoup d'abonnés pour participer à une campagne ?",
    a: "Non, pas nécessairement. Sika Ads s'appuie sur le nano-marketing : l'authenticité et la proximité avec vos contacts ont une grande valeur pour les marques. Tout utilisateur actif peut participer."
  },
  {
    q: "Comment une marque peut-elle lancer une campagne ?",
    a: "Rendez-vous dans la section Entreprises, créez votre campagne en définissant vos objectifs, votre budget et votre visuel. Nos ambassadeurs et créateurs la diffuseront ensuite sur leurs réseaux."
  },
  {
    q: "Comment recevoir ses gains ?",
    a: "Une fois votre diffusion vérifiée et validée, votre solde est automatiquement crédité. Vous pouvez demander un retrait vers votre compte Mobile Money (Moov Money, T-Money)."
  },
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
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <h3 className="text-base font-semibold m-0">
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
      </h3>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-56 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-6 pb-5 text-muted-foreground leading-relaxed text-sm">{a}</p>
      </div>
    </div>
  );
}

/* ─── campaign carousel ─── */
function CampaignCarousel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisible(1);
      } else if (window.innerWidth < 1024) {
        setVisible(2);
      } else {
        setVisible(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const max = Math.max(0, campaigns.length - visible);

  useEffect(() => {
    if (index > max) {
      setIndex(max);
    }
  }, [visible, max, index]);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(max, i + 1));

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-widest uppercase" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
            Exemples d'opportunités
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Des marques qui{" "}
            <span style={{ color: "#ea580c" }}>paient vrai</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            Découvrez les campagnes proposées par les marques et trouvez des opportunités adaptées à votre profil et à vos réseaux sociaux.
          </p>
        </div>

        {/* carousel track */}
        <div className="relative">
          <button
            onClick={prev}
            disabled={index === 0}
            aria-label="Campagne précédente"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-[#ea580c] border border-border transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            disabled={index >= max}
            aria-label="Campagne suivante"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-[#ea580c] border border-border transition-all duration-200 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          <div
            className="flex transition-transform duration-500 ease-out gap-6"
            style={{
              transform: `translateX(-${index * (100 / visible)}%)`,
            }}
          >
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="shrink-0 bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 group"
                style={{ width: `calc(${100 / visible}% - ${(visible - 1) * (24 / visible)}px)` }}
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={c.image}
                    alt={`Campagne de marque : ${c.title}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: c.categoryColor }}
                    >
                      {c.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground text-lg mb-3 line-clamp-1">{c.title}</h3>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">Rémunération estimée</div>
                      <div className="text-base font-extrabold text-foreground" style={{ color: "#ea580c" }}>
                        {c.gainVue} FCFA <span className="text-xs font-normal text-muted-foreground">/ vue</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Budget campagne</div>
                      <div className="text-sm font-bold text-foreground">
                        {c.budget.toLocaleString("fr-FR")} F
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: max + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Aller au groupe de campagnes ${i + 1}`}
                className="rounded-full transition-all duration-300"
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
    setMenuOpen(false);
    const sectionId = href.replace("#", "");
    
    // Déclencher le défilement après la fermeture du tiroir mobile
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        const headerOffset = 70;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 150);
  };

  const navLinks = [
    { href: "#avantages", label: "Avantages" },
    { href: "#comment", label: "Comment ça marche" },
    { href: "#monetisation", label: "Monétisation" },
    { href: "#annonceurs", label: "Entreprises" },
    { href: "#temoignages", label: "Témoignages" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Gagnez de l'argent avec vos réseaux sociaux | Sika Ads"
        description="Sika Ads connecte les marques et les créateurs. Gagnez de l'argent avec WhatsApp, Facebook et Instagram ou faites connaître vos produits auprès de nouvelles audiences."
        canonicalPath="/"
        ogImage="https://www.sika-ads.com/Web-Icon.png"
      />
      {/* ── NAV ── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#accueil"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("#accueil");
            }}
            className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <img className="w-36 sm:w-40 h-auto object-contain" src="/Header-LogoSika-Ads.png" alt="Logo SikaAds" />
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
              className="flex gap-1 items-center justify-center py-2 px-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Commencer
              <LogInIcon className="w-5 h-5 ml-1" />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
        onNavigate={(href) => scrollToSection(href)}
        onCtaClick={() => {
          if (user) onStart?.(); else setView('login');
        }}
        ctaText="Commencer"
      />

      {/* ── HERO ── */}
      <section
        id="accueil"
        className="relative pt-24 pb-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f1b35 0%, #1e3a8a 55%, #1d4ed8 100%)",
          minHeight: "100vh",
        }}
      >
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
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
                Gagnez de l'argent avec vos{" "}
                <span style={{ color: "#ea580c" }}>réseaux sociaux</span>
              </h1>

              {/* Badges plateformes */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-emerald-400/30">
                  WhatsApp
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-300 border border-blue-400/30">
                  Facebook
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-pink-300 border border-pink-400/30">
                  Instagram
                </span>
              </div>

              <p className="text-lg text-blue-100 leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
                Partagez des contenus de marques sur WhatsApp, Facebook et Instagram, développez votre audience et gagnez de l'argent grâce à Sika Ads.
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
                  Je suis une marque
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
                <div className="absolute -inset-8 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: "#ea580c" }} />
                <div className="relative h-full overflow-hidden">
                  <img
                    src="./Mock-up.png"
                    alt="Application mobile Sika Ads permettant de suivre ses campagnes et gains"
                    className="w-[296px] h-full object-cover rounded-[50px] shadow-2xl"
                  />
                </div>
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
      </section>

      {/* ── BENEFITS ── */}
      <section id="avantages" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
              Opportunités pour les créateurs
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Votre téléphone peut devenir une<br />
              <span style={{ color: "#ea580c" }}>source de revenus</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Vous utilisez WhatsApp, Facebook ou Instagram au quotidien ? Sika Ads vous permet de transformer votre présence sur les réseaux sociaux en opportunités.
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
              Fonctionnement simple
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Comment gagner de l'argent avec{" "}
              <span style={{ color: "#ea580c" }}>Sika Ads ?</span>
            </h2>
            <p className="text-blue-200 text-lg max-w-xl mx-auto">
              Inscrivez-vous, découvrez des campagnes, partagez les contenus et recevez vos gains.
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
                alt="Créateurs de contenu échangeant autour d'un smartphone"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,27,53,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-5 left-5">
                <div className="text-white font-bold text-lg">Partagez avec vos communautés</div>
                <div className="text-blue-200 text-sm">Monétisez votre présence en ligne</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden h-56 relative">
              <img
                src="https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?w=700&h=400&fit=crop&auto=format"
                alt="Ambassadeur recevant un paiement Mobile Money sur son smartphone"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(15,27,53,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-5 left-5">
                <div className="text-white font-bold text-lg">Recevez vos gains</div>
                <div className="text-blue-200 text-sm">Moov & T-Money · Retrait rapide</div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── SECTION SEO ÉDITORIALE : MONÉTISATION DES RÉSEAUX SOCIAUX ── */}
      <section id="monetisation" className="py-24 bg-background relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4 tracking-wider uppercase" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
              Guide & Opportunités
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Comment gagner de l'argent avec{" "}
              <span style={{ color: "#ea580c" }}>ses réseaux sociaux ?</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              WhatsApp, Facebook et Instagram ne servent pas uniquement à échanger des messages. Découvrez comment valoriser votre présence quotidienne.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 border border-border hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: "rgba(234,88,12,0.1)" }}>
                  <Share2 className="w-6 h-6" style={{ color: "#ea580c" }} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Une source d'opportunités</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Pour les créateurs et les utilisateurs actifs qui disposent d'un cercle de contacts ou d'une communauté, chaque publication partagée peut devenir un levier de valorisation direct.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-[#1e3a8a]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                WhatsApp · Facebook · Instagram
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: "rgba(30,58,138,0.08)" }}>
                  <TrendingUp className="w-6 h-6" style={{ color: "#1e3a8a" }} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Partage de campagnes</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sika Ads vous permet de participer à des campagnes de marques et de diffuser leurs contenus. Vous apportez une visibilité authentique aux entreprises tout en étant rémunéré.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-[#1e3a8a]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Rémunération transparente
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
                  <Users className="w-6 h-6" style={{ color: "#10b981" }} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">La force de la proximité</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Pas besoin d'être une célébrité. La confiance et la proximité naturelle que vous entretenez avec votre communauté représentent une réelle valeur pour les marques.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-[#1e3a8a]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Nano-marketing accessible à tous
              </div>
            </div>
          </div>
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
          <p className="text-violet-200 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Faites connaître votre marque auprès de nouvelles audiences grâce aux créateurs et aux communautés présentes sur les réseaux sociaux.
          </p>

          <div className="grid sm:grid-cols-3 gap-5 mb-10">
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

          {/* Explication Nano-influenceurs */}
          <div className="max-w-3xl mx-auto mb-10 p-6 rounded-2xl border text-left" style={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
            <h3 className="text-lg font-bold text-white mb-2">
              Pourquoi travailler avec des nano-influenceurs ?
            </h3>
            <p className="text-violet-200 text-sm leading-relaxed">
              Une grande audience ne signifie pas toujours une plus grande proximité. Les nano-influenceurs et petits créateurs peuvent avoir une relation étroite avec leur communauté et permettre aux marques de communiquer de manière plus directe et authentique.
            </p>
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

      {/* ── SECTION INSTITUTIONNELLE : SIKA ADS ET L'AFRIQUE ── */}
      <section className="py-20" style={{ backgroundColor: "#f8faff" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(30,58,138,0.08)", color: "#1e3a8a" }}>
            Notre Vision
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-6">
            Une plateforme pensée pour les communautés africaines
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-4">
            Sika Ads est né au Togo avec l'ambition de faciliter les collaborations entre les marques et les créateurs de contenu en Afrique.
          </p>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Notre objectif est simple : permettre aux créateurs de transformer leur présence sur les réseaux sociaux en opportunités et aider les entreprises à faire connaître leurs produits et services auprès de nouvelles communautés.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setView('about')}
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              En savoir plus sur Sika Ads
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ backgroundColor: "#f0f4ff" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
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
            Commencez à gagner avec<br />
            <span style={{ color: "#ea580c" }}>vos réseaux sociaux</span>
          </h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
            Rejoignez Sika Ads, découvrez les opportunités disponibles et transformez votre présence sur les réseaux sociaux en nouvelles possibilités.
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
              Créer mon compte
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => { if (user) onAdvertise?.(); else setView('login'); }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white border border-white/25 hover:bg-white/10 transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Lancer une campagne
              <ArrowRight className="w-4 h-4" />
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
