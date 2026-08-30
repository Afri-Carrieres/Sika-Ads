import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Database,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Server,
  ShieldCheck,
  User,
} from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import PageHero from '../components/PageHero';

interface LegalViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}

const ESSENTIAL_INFOS: { label: string; value: string; icon: React.FC<{ size?: number; className?: string }>; href?: string }[] = [
  { label: 'Plateforme', value: 'Sika Ads', icon: Monitor },
  { label: 'Entreprise', value: 'Omenka', icon: Building2 },
  { label: 'Responsable', value: 'AKPALO Mawuli', icon: User },
  { label: 'Localisation', value: 'Hédzranawoé, Lomé, Togo', icon: MapPin },
  { label: 'Email', value: 'team@sika-ads.com', icon: Mail, href: 'mailto:team@sika-ads.com' },
  { label: 'Téléphone', value: '+228 91 41 67 45', icon: Phone, href: 'tel:+22891416745' },
  { label: 'Hébergeur', value: 'LWS', icon: Server },
  { label: 'Base de données', value: 'Supabase', icon: Database },
];

const TOC: { id: string; n: number; label: string }[] = [
  { id: 'editeur', n: 1, label: 'Éditeur de la plateforme' },
  { id: 'publication', n: 2, label: 'Responsable de la publication' },
  { id: 'contact', n: 3, label: 'Contact' },
  { id: 'hebergement', n: 4, label: 'Hébergement' },
  { id: 'infrastructure', n: 5, label: 'Base de données et infrastructure' },
  { id: 'propriete', n: 6, label: 'Propriété intellectuelle' },
  { id: 'utilisation', n: 7, label: 'Utilisation de la plateforme' },
  { id: 'validation', n: 8, label: 'Validation des participations' },
  { id: 'fraude', n: 9, label: 'Lutte contre la fraude' },
  { id: 'resp-utilisateurs', n: 10, label: 'Responsabilités des utilisateurs' },
  { id: 'resp-marques', n: 11, label: 'Responsabilités des marques' },
  { id: 'donnees', n: 12, label: 'Données personnelles' },
  { id: 'cookies', n: 13, label: 'Cookies et technologies similaires' },
  { id: 'services-tiers', n: 14, label: 'Services tiers' },
  { id: 'disponibilite', n: 15, label: 'Disponibilité de la plateforme' },
  { id: 'responsabilite', n: 16, label: 'Limitation de responsabilité' },
  { id: 'maj', n: 17, label: 'Mise à jour des informations légales' },
];

const SectionHeading: React.FC<{ n: number; title: string }> = ({ n, title }) => (
  <div className="flex items-center gap-3">
    <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
      {String(n).padStart(2, '0')}
    </span>
    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 space-y-4 ${className}`}>{children}</div>
);

const InfoRow: React.FC<{ label: string; value: string; href?: string }> = ({ label, value, href }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200 last:border-b-0 pb-3 last:pb-0 sm:pb-3">
    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    {href ? (
      <a href={href} className="text-sm font-bold text-slate-900 hover:text-[#128785] transition-colors break-all">
        {value}
      </a>
    ) : (
      <span className="text-sm font-bold text-slate-900 break-all">{value}</span>
    )}
  </div>
);

const BulletList: React.FC<{ items: string[]; danger?: boolean }> = ({ items, danger }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${danger ? 'bg-red-500' : 'bg-[#128785]'}`} />
        {item}
      </li>
    ))}
  </ul>
);

const LegalView: React.FC<LegalViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Mentions légales | Sika Ads"
        description="Retrouvez les mentions légales de Sika Ads : éditeur, responsable de publication, contact, hébergement, infrastructure et informations relatives à l'utilisation de la plateforme."
        canonicalPath="/legal"
      />

      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="legal" />

      <PageHero
        badge="Sika Ads"
        title="Mentions légales"
        subtitle="Retrouvez les informations essentielles concernant Sika Ads, son éditeur, son hébergement, son infrastructure et les règles applicables à l'utilisation de la plateforme."
        accent="indigo"
      >
        <p className="text-blue-200/70 text-sm font-bold mt-4">Dernière mise à jour : Août 2026</p>
      </PageHero>

      {/* ── BLOC INFORMATIONS ESSENTIELLES ── */}
      <section className="py-12 sm:py-14 bg-slate-50 border-b border-slate-100" aria-label="Informations essentielles">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {ESSENTIAL_INFOS.map((info) => {
              const Icon = info.icon;
              return (
                <div key={info.label} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={15} className="text-[#128785]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{info.label}</p>
                  </div>
                  {info.href ? (
                    <a href={info.href} className="text-sm font-bold text-slate-900 hover:text-[#128785] transition-colors break-all">
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-slate-900">{info.value}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONTENU LÉGAL ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Sidebar (sticky, desktop) */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire</h3>
                <nav aria-label="Sommaire des mentions légales">
                  <ul className="space-y-2.5 text-sm font-bold text-slate-600 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
                    {TOC.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="hover:text-indigo-600 transition-colors block py-0.5">
                          <span className="text-slate-300 font-black mr-2">{item.n}.</span>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Besoin d'aide ?</p>
                  <p className="text-xs text-slate-600 mb-4 font-medium italic leading-relaxed">Une information vous semble manquante ? Notre équipe est là pour vous éclairer.</p>
                  <button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">
                    Contacter le support <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="lg:col-span-2 space-y-14">
              {/* Mobile compact TOC */}
              <details className="lg:hidden group bg-slate-50 rounded-2xl border border-slate-100 px-5 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden text-xs font-black text-slate-900 uppercase tracking-widest">
                  Sommaire
                  <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <ul className="mt-4 space-y-2 text-sm font-bold text-slate-600">
                  {TOC.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="block py-1">
                        <span className="text-slate-300 font-black mr-2">{item.n}.</span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>

              {/* 01 — Éditeur */}
              <div id="editeur" className="space-y-6 scroll-mt-28">
                <SectionHeading n={1} title="Éditeur de la plateforme" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads est une plateforme numérique portée par Omenka.
                  </p>
                  <div className="pt-2">
                    <InfoRow label="Nom du service" value="Sika Ads" />
                    <InfoRow label="Entreprise" value="Omenka" />
                    <InfoRow label="Localisation" value="Hédzranawoé, Lomé, Togo" />
                    <InfoRow label="Responsable" value="AKPALO Mawuli" />
                    <InfoRow label="Email" value="team@sika-ads.com" href="mailto:team@sika-ads.com" />
                    <InfoRow label="Téléphone" value="+228 91 41 67 45" href="tel:+22891416745" />
                  </div>
                </Card>
              </div>

              {/* 02 — Responsable de la publication */}
              <div id="publication" className="space-y-6 scroll-mt-28">
                <SectionHeading n={2} title="Responsable de la publication" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Le responsable de la publication du site et des contenus éditoriaux de Sika Ads est AKPALO Mawuli.
                  </p>
                </Card>
              </div>

              {/* 03 — Contact */}
              <div id="contact" className="space-y-6 scroll-mt-28">
                <SectionHeading n={3} title="Contact" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Pour toute question concernant Sika Ads, son fonctionnement, ses services ou les présentes mentions légales, vous pouvez contacter notre équipe.
                  </p>
                  <div className="pt-2">
                    <InfoRow label="Email" value="team@sika-ads.com" href="mailto:team@sika-ads.com" />
                    <InfoRow label="Téléphone" value="+228 91 41 67 45" href="tel:+22891416745" />
                    <InfoRow label="Localisation" value="Hédzranawoé, Lomé, Togo" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                    <button
                      onClick={() => onNavigate('contact')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                    >
                      <Mail size={14} /> Envoyer un message
                    </button>
                    <a
                      href="tel:+22891416745"
                      className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest hover:border-[#128785] hover:text-[#128785] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                    >
                      <Phone size={14} /> Appeler Sika Ads
                    </a>
                  </div>
                </Card>
              </div>

              {/* 04 — Hébergement */}
              <div id="hebergement" className="space-y-6 scroll-mt-28">
                <SectionHeading n={4} title="Hébergement" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Le site Sika Ads est hébergé par LWS.
                  </p>
                  <div className="pt-2">
                    <InfoRow label="Hébergeur" value="LWS — Ligne Web Services" />
                  </div>
                  <a
                    href="https://www.lws.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-1"
                  >
                    Site officiel de LWS <ArrowRight size={12} />
                  </a>
                </Card>
              </div>

              {/* 05 — Base de données et infrastructure */}
              <div id="infrastructure" className="space-y-6 scroll-mt-28">
                <SectionHeading n={5} title="Base de données et infrastructure" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads utilise Supabase pour sa base de données et certains services d'infrastructure nécessaires au fonctionnement de la plateforme.
                  </p>
                  <div className="pt-2">
                    <InfoRow label="Infrastructure" value="Supabase" />
                    <InfoRow label="Base de données" value="Supabase" />
                  </div>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-1"
                  >
                    Site officiel de Supabase <ArrowRight size={12} />
                  </a>
                </Card>
              </div>

              {/* 06 — Propriété intellectuelle */}
              <div id="propriete" className="space-y-6 scroll-mt-28">
                <SectionHeading n={6} title="Propriété intellectuelle" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Le nom Sika Ads, son logo, son identité visuelle, son interface, ses éléments graphiques, ses textes et ses développements logiciels sont protégés par les règles applicables en matière de propriété intellectuelle, sous réserve des droits appartenant à leurs auteurs ou titulaires respectifs.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Toute reproduction, représentation, modification ou utilisation non autorisée des éléments protégés de Sika Ads peut être interdite.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Les contenus fournis par les utilisateurs restent soumis aux droits de leurs auteurs ou titulaires respectifs.
                  </p>
                </Card>
              </div>

              {/* 07 — Utilisation de la plateforme */}
              <div id="utilisation" className="space-y-6 scroll-mt-28">
                <SectionHeading n={7} title="Utilisation de la plateforme" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads met en relation des marques et des créateurs ou utilisateurs des réseaux sociaux dans le cadre de campagnes de communication.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Les contenus des campagnes destinées aux créateurs peuvent être partagés uniquement sur :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {['Statut WhatsApp', 'Story Instagram', 'Story Facebook'].map((platform) => (
                      <div key={platform} className="flex items-center justify-center px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 uppercase tracking-wide text-center">
                        {platform}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* 08 — Validation des participations */}
              <div id="validation" className="space-y-6 scroll-mt-28">
                <SectionHeading n={8} title="Validation des participations" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Dans le cadre de certaines campagnes, les participants peuvent être invités à partager un contenu sur leur statut WhatsApp ou dans leurs stories Instagram et Facebook.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Après le partage, une capture d'écran présentant le nombre de vues peut être demandée afin de permettre la vérification de la participation.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    La preuve peut être envoyée depuis le dashboard Sika Ads. Les vues transmises peuvent être vérifiées avant validation.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Lorsque les vues sont considérées comme authentiques et que les conditions de la campagne sont remplies, le participant peut bénéficier du gain prévu par la campagne.
                  </p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed pt-1">
                    Les conditions propres à chaque campagne restent applicables.
                  </p>
                </Card>
              </div>

              {/* 09 — Lutte contre la fraude */}
              <div id="fraude" className="space-y-6 scroll-mt-28">
                <SectionHeading n={9} title="Utilisation responsable et lutte contre la fraude" />
                <Card>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sont notamment interdits</p>
                  <BulletList
                    danger
                    items={[
                      "Les fausses captures d'écran.",
                      'La falsification des vues.',
                      'La manipulation artificielle des statistiques.',
                      "La création ou l'usage de faux comptes.",
                      'Toute tentative de contourner les règles d’une campagne.',
                      "L'utilisation frauduleuse de la plateforme.",
                      'Le partage de contenu pour lequel vous ne possédez pas les droits nécessaires.',
                    ]}
                  />
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 pt-3">
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      Sika Ads peut vérifier les informations transmises dans le cadre des campagnes afin de limiter les pratiques frauduleuses et de préserver l'intégrité du système.
                    </p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      Toute participation ne respectant pas les conditions d'une campagne peut être refusée ou faire l'objet des mesures prévues par les règles de la plateforme.
                    </p>
                  </div>
                </Card>
              </div>

              {/* 10 — Responsabilités des utilisateurs */}
              <div id="resp-utilisateurs" className="space-y-6 scroll-mt-28">
                <SectionHeading n={10} title="Responsabilités des utilisateurs" />
                <Card>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Les utilisateurs doivent</p>
                  <BulletList
                    items={[
                      'Fournir des informations exactes.',
                      'Respecter les règles de Sika Ads.',
                      'Respecter les conditions propres aux campagnes.',
                      'Respecter les règles des réseaux sociaux utilisés.',
                      'Disposer des droits nécessaires sur les contenus partagés.',
                      'Ne pas manipuler les vues.',
                      'Ne pas utiliser de fausses preuves.',
                    ]}
                  />
                </Card>
              </div>

              {/* 11 — Responsabilités des marques */}
              <div id="resp-marques" className="space-y-6 scroll-mt-28">
                <SectionHeading n={11} title="Responsabilités des marques" />
                <Card>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Les marques utilisant Sika Ads doivent notamment</p>
                  <BulletList
                    items={[
                      'Fournir des informations exactes.',
                      'Disposer des droits nécessaires sur les contenus de leurs campagnes.',
                      'Respecter les règles applicables à leurs communications.',
                      'Respecter les conditions de leurs campagnes.',
                      'Ne pas utiliser Sika Ads pour diffuser des contenus illégaux ou trompeurs.',
                    ]}
                  />
                </Card>
              </div>

              {/* 12 — Données personnelles */}
              <div id="donnees" className="space-y-6 scroll-mt-28">
                <SectionHeading n={12} title="Données personnelles" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads peut traiter certaines données personnelles nécessaires au fonctionnement de la plateforme, notamment pour la création et la gestion des comptes, la participation aux campagnes, la communication avec les utilisateurs, la sécurité et la validation des participations.
                  </p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pt-2">Données traitées dans le cadre du fonctionnement de la plateforme</p>
                  <BulletList
                    items={[
                      'Données de compte : nom, adresse email, sexe, ville et tranche d’âge, utilisés pour l’inscription, la connexion et la vérification de l’email.',
                      'Données de profil et de rémunération : numéro mobile money, utilisé pour le versement des gains prévus par les campagnes.',
                      "Données de participation : captures d'écran envoyées depuis le dashboard et nombre de vues transmis, utilisés pour la vérification des participations.",
                      'Données de campagne : informations fournies par les marques (nom, email, téléphone) et contenus des campagnes créées.',
                      'Données de connexion aux campagnes : clics sur les liens de suivi partagés par les créateurs.',
                      'Notifications : token d\u2019appareil, si vous acceptez de recevoir des notifications push.',
                      'Messages transmis via le formulaire de contact.',
                    ]}
                  />
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-3">
                    <ShieldCheck size={18} className="text-[#128785] shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      Le détail complet de la collecte, de l'utilisation et de la protection de ces données est décrit dans notre{' '}
                      <button onClick={() => onNavigate('privacy')} className="text-indigo-600 font-bold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded">politique de confidentialité</button>.
                      Pour toute question relative à vos données personnelles, contactez-nous à{' '}
                      <a href="mailto:team@sika-ads.com" className="text-[#128785] font-bold underline">team@sika-ads.com</a>{' '}
                      ou via le <button onClick={() => onNavigate('contact')} className="text-indigo-600 font-bold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded">formulaire de contact</button>.
                    </p>
                  </div>
                </Card>
              </div>

              {/* 13 — Cookies */}
              <div id="cookies" className="space-y-6 scroll-mt-28">
                <SectionHeading n={13} title="Cookies et technologies similaires" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads peut utiliser des cookies ou technologies similaires nécessaires au fonctionnement du site et de certaines fonctionnalités.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Concrètement, la plateforme s’appuie sur des technologies de stockage local (session de connexion, préférences d'affichage de l'application installable) et sur des service workers, utilisés notamment pour les notifications push et le fonctionnement hors ligne partiel. Ces technologies sont nécessaires au fonctionnement des services proposés.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Vous pouvez configurer votre navigateur pour limiter ces technologies ; certaines fonctionnalités de la plateforme pourraient alors ne plus fonctionner correctement.
                  </p>
                </Card>
              </div>

              {/* 14 — Services tiers */}
              <div id="services-tiers" className="space-y-6 scroll-mt-28">
                <SectionHeading n={14} title="Services tiers" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Le fonctionnement de Sika Ads peut s'appuyer sur certains services techniques tiers, notamment pour l'hébergement et l'infrastructure de données.
                  </p>
                  <div className="pt-2">
                    <InfoRow label="Hébergement" value="LWS" />
                    <InfoRow label="Base de données / infrastructure" value="Supabase" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed pt-1">
                    Ces prestataires fournissent des services techniques à Sika Ads et à Omenka, qui restent responsables de l'exploitation de la plateforme.
                  </p>
                </Card>
              </div>

              {/* 15 — Disponibilité */}
              <div id="disponibilite" className="space-y-6 scroll-mt-28">
                <SectionHeading n={15} title="Disponibilité de la plateforme" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Nous faisons notre possible pour maintenir Sika Ads accessible et fonctionnel. Des interruptions temporaires peuvent toutefois survenir notamment lors d'opérations de maintenance, de mises à jour, de problèmes techniques ou de perturbations affectant certains services tiers.
                  </p>
                </Card>
              </div>

              {/* 16 — Limitation de responsabilité */}
              <div id="responsabilite" className="space-y-6 scroll-mt-28">
                <SectionHeading n={16} title="Limitation de responsabilité" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads s’efforce de fournir des informations fiables et un service de qualité. Toutefois :
                  </p>
                  <BulletList
                    items={[
                      'Les résultats d’une campagne peuvent varier en fonction de nombreux facteurs (audience, contenu, plateforme utilisée, période de diffusion).',
                      'Sika Ads ne garantit aucun résultat commercial particulier aux marques ni aucun niveau de vues ou de gains aux créateurs.',
                      'Les campagnes peuvent être soumises à des conditions spécifiques définies par leurs auteurs.',
                      'Les services tiers nécessaires au fonctionnement de la plateforme peuvent connaître des interruptions indépendantes de notre volonté.',
                      'Les utilisateurs restent responsables de leurs contenus et de leur utilisation de la plateforme.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Cette limitation ne fait pas obstacle aux obligations légales impératives applicables à Sika Ads.
                  </p>
                </Card>
              </div>

              {/* 17 — Mise à jour */}
              <div id="maj" className="space-y-6 scroll-mt-28 pb-6">
                <SectionHeading n={17} title="Mise à jour des informations légales" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Ces informations peuvent être mises à jour lorsque cela est nécessaire afin de tenir compte de l'évolution de Sika Ads, de ses services ou de son environnement technique.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <AlertCircle size={18} className="text-indigo-600 shrink-0" />
                    <p className="text-sm font-black text-slate-900">Dernière mise à jour : Août 2026</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-slate-50 text-center rounded-[4rem] py-16 px-6 sm:px-12">
            <h2 className="font-heading text-3xl font-black text-slate-900 mb-4 max-w-xl mx-auto uppercase tracking-tight">
              Une question ?
            </h2>
            <p className="text-slate-600 font-medium mb-8 max-w-lg mx-auto">
              Notre équipe reste à votre disposition pour toute question concernant Sika Ads.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10 text-sm font-bold text-slate-700">
              <a href="mailto:team@sika-ads.com" className="inline-flex items-center gap-2 hover:text-[#128785] transition-colors">
                <Mail size={16} className="text-[#128785]" /> team@sika-ads.com
              </a>
              <a href="tel:+22891416745" className="inline-flex items-center gap-2 hover:text-[#128785] transition-colors">
                <Phone size={16} className="text-[#128785]" /> +228 91 41 67 45
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-[#128785]" /> Hédzranawoé, Lomé, Togo
              </span>
            </div>
            <button
              onClick={() => onNavigate('contact')}
              className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            >
              Contacter Sika Ads
            </button>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default LegalView;
