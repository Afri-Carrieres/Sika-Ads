import React from 'react';
import { ArrowRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import PageHero from '../components/PageHero';

interface PrivacyViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}

const TOC: { id: string; n: number; label: string }[] = [
  { id: 'qui-sommes-nous', n: 1, label: 'Qui sommes-nous ?' },
  { id: 'donnees-collectees', n: 2, label: 'Quelles données collectons-nous ?' },
  { id: 'finalites', n: 3, label: 'Pourquoi utilisons-nous vos données ?' },
  { id: 'campagnes-vues', n: 4, label: 'Campagnes et vues' },
  { id: 'utilisation', n: 5, label: 'Comment utilisons-nous les données ?' },
  { id: 'partage', n: 6, label: 'Avec qui vos données sont-elles partagées ?' },
  { id: 'protection', n: 7, label: 'Protection des données' },
  { id: 'conservation', n: 8, label: 'Durée de conservation' },
  { id: 'droits', n: 9, label: 'Vos droits' },
  { id: 'securite-compte', n: 10, label: 'Sécurité du compte' },
  { id: 'cookies', n: 11, label: 'Cookies' },
  { id: 'services-tiers', n: 12, label: 'Services tiers' },
  { id: 'mineurs', n: 13, label: 'Données des mineurs' },
  { id: 'modifications', n: 14, label: 'Modifications de cette politique' },
  { id: 'contacter', n: 15, label: 'Nous contacter' },
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

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-2 bg-[#128785]" />
        {item}
      </li>
    ))}
  </ul>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest pt-2">{children}</p>
);

const PrivacyView: React.FC<PrivacyViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Politique de confidentialité | Sika Ads"
        description="Découvrez comment Sika Ads collecte, utilise et protège vos données personnelles : compte, campagnes, preuves de participation, cookies et vos droits."
        canonicalPath="/privacy"
      />

      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="privacy" />

      <PageHero
        badge="Sika Ads"
        title="Politique de confidentialité"
        subtitle="Chez Sika Ads, nous accordons une importance particulière à la protection de vos données personnelles. Cette politique explique quelles données nous pouvons collecter, pourquoi nous les utilisons, comment elles sont protégées et quels sont vos droits."
        accent="indigo"
      >
        <p className="text-blue-200/70 text-sm font-bold mt-4">Dernière mise à jour : août 2026</p>
      </PageHero>

      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Sidebar (sticky, desktop) */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire</h3>
                <nav aria-label="Sommaire de la politique de confidentialité">
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Une question sur vos données ?</p>
                  <p className="text-xs text-slate-600 mb-4 font-medium italic leading-relaxed">Écrivez-nous, nous vous répondrons dans les meilleurs délais.</p>
                  <button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">
                    Contacter le support <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenu */}
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

              {/* 01 — Qui sommes-nous ? */}
              <div id="qui-sommes-nous" className="space-y-6 scroll-mt-28">
                <SectionHeading n={1} title="Qui sommes-nous ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads est une plateforme numérique portée par Omenka.
                  </p>
                  <div className="space-y-2 pt-1 text-sm font-bold text-slate-900">
                    <p>Sika Ads</p>
                    <p className="font-medium text-slate-600">Entreprise : Omenka</p>
                    <p className="font-medium text-slate-600">Responsable : AKPALO Mawuli</p>
                    <p className="font-medium text-slate-600">Adresse : Hédzranawoé, Lomé, Togo</p>
                    <p className="font-medium text-slate-600">
                      Email : <a href="mailto:team@sika-ads.com" className="text-[#128785] underline">team@sika-ads.com</a>
                    </p>
                    <p className="font-medium text-slate-600">
                      Téléphone : <a href="tel:+22891416745" className="text-[#128785] underline">+228 91 41 67 45</a>
                    </p>
                  </div>
                </Card>
              </div>

              {/* 02 — Données collectées */}
              <div id="donnees-collectees" className="space-y-6 scroll-mt-28">
                <SectionHeading n={2} title="Quelles données collectons-nous ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Selon votre utilisation de Sika Ads, nous pouvons collecter différentes catégories de données.
                  </p>
                  <div>
                    <SubTitle>Données d'identification et de compte</SubTitle>
                    <div className="pt-2">
                      <BulletList
                        items={[
                          'prénom et nom ;',
                          'adresse email ;',
                          'ville et tranche d\u2019âge renseignées lors de l\u2019inscription ;',
                          'numéro mobile money, utilisé pour le versement de vos gains ;',
                          'informations nécessaires à la création et à la gestion du compte.',
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <SubTitle>Données liées aux campagnes</SubTitle>
                    <div className="pt-2">
                      <BulletList
                        items={[
                          'campagnes auxquelles vous participez ;',
                          'informations relatives à votre participation ;',
                          'données nécessaires au suivi et à la validation des campagnes, notamment les clics enregistrés sur les liens partagés.',
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <SubTitle>Preuves de participation</SubTitle>
                    <div className="pt-2 space-y-3">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Lorsque vous participez à une campagne, Sika Ads peut vous demander de transmettre une capture d'écran permettant notamment de vérifier le nombre de vues obtenu sur un statut WhatsApp ou une story Instagram ou Facebook.
                      </p>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Ces éléments peuvent être utilisés pour vérifier l'authenticité de votre participation.
                      </p>
                    </div>
                  </div>
                  <div>
                    <SubTitle>Données techniques</SubTitle>
                    <div className="pt-2">
                      <BulletList
                        items={[
                          'informations relatives à votre session de connexion ;',
                          'préférences stockées sur votre appareil pour le fonctionnement de l\u2019application (notifications, installation) ;',
                          'journaux techniques nécessaires au suivi et à la sécurité des liens de campagne.',
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* 03 — Finalités */}
              <div id="finalites" className="space-y-6 scroll-mt-28">
                <SectionHeading n={3} title="Pourquoi utilisons-nous vos données ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">Vos données peuvent être utilisées pour :</p>
                  <BulletList
                    items={[
                      'créer et gérer votre compte ;',
                      'vous permettre d\u2019utiliser Sika Ads ;',
                      'vous permettre de participer aux campagnes ;',
                      'vérifier les participations et les preuves transmises ;',
                      'communiquer avec vous ;',
                      'assurer la sécurité de la plateforme ;',
                      'détecter et prévenir les comportements frauduleux ;',
                      'améliorer le fonctionnement de Sika Ads ;',
                      'répondre à vos demandes de support ;',
                      'respecter nos obligations légales lorsque cela est nécessaire.',
                    ]}
                  />
                </Card>
              </div>

              {/* 04 — Campagnes et vues */}
              <div id="campagnes-vues" className="space-y-6 scroll-mt-28">
                <SectionHeading n={4} title="Données relatives aux campagnes et aux vues" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Lorsque vous participez à une campagne, certaines informations peuvent être nécessaires pour vérifier votre participation.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Selon les conditions de la campagne, vous pouvez notamment être invité à :</p>
                  <BulletList
                    items={[
                      'partager un contenu sur votre statut WhatsApp ou votre story Instagram/Facebook ;',
                      'attendre que les vues soient enregistrées ;',
                      'prendre une capture d\u2019écran montrant le nombre de vues ;',
                      'transmettre cette preuve via votre dashboard Sika Ads.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Ces informations peuvent être examinées afin de déterminer si les conditions de la campagne sont remplies.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads ne demande pas aux utilisateurs de publier les contenus de campagne sous forme de posts sur leur profil Instagram ou Facebook lorsque le mécanisme de la campagne repose sur les stories.
                  </p>
                </Card>
              </div>

              {/* 05 — Utilisation */}
              <div id="utilisation" className="space-y-6 scroll-mt-28">
                <SectionHeading n={5} title="Comment utilisons-nous les données ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Nous utilisons les données uniquement dans le cadre des finalités décrites dans cette politique et des fonctionnalités de Sika Ads.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Nous pouvons notamment les utiliser pour :</p>
                  <BulletList
                    items={[
                      'fournir nos services ;',
                      'gérer les comptes ;',
                      'gérer les campagnes ;',
                      'vérifier les participations ;',
                      'communiquer avec les utilisateurs ;',
                      'sécuriser la plateforme ;',
                      'améliorer nos services.',
                    ]}
                  />
                </Card>
              </div>

              {/* 06 — Partage */}
              <div id="partage" className="space-y-6 scroll-mt-28">
                <SectionHeading n={6} title="Avec qui vos données peuvent-elles être partagées ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Vos données peuvent être accessibles à Sika Ads et, lorsque cela est nécessaire au fonctionnement du service, à certains prestataires techniques.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Sika Ads utilise notamment :</p>
                  <BulletList
                    items={[
                      'LWS pour l\u2019hébergement du site et de l\u2019infrastructure concernée.',
                      'Supabase pour la base de données et certains services d\u2019infrastructure utilisés par la plateforme.',
                    ]}
                  />
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-3">
                    <ShieldCheck size={18} className="text-[#128785] shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      Nous ne vendons pas vos données personnelles. Toutefois, certaines données peuvent être communiquées lorsqu'une telle communication est nécessaire au fonctionnement du service ou imposée par une obligation légale.
                    </p>
                  </div>
                </Card>
              </div>

              {/* 07 — Protection */}
              <div id="protection" className="space-y-6 scroll-mt-28">
                <SectionHeading n={7} title="Protection des données" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Nous mettons en place des mesures techniques et organisationnelles destinées à protéger les données personnelles contre :
                  </p>
                  <BulletList
                    items={[
                      'l\u2019accès non autorisé ;',
                      'la perte ;',
                      'la modification non autorisée ;',
                      'la divulgation ;',
                      'l\u2019utilisation abusive.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">
                    L'accès aux données est limité aux personnes ou services qui en ont besoin pour assurer le fonctionnement de Sika Ads.
                  </p>
                </Card>
              </div>

              {/* 08 — Conservation */}
              <div id="conservation" className="space-y-6 scroll-mt-28">
                <SectionHeading n={8} title="Combien de temps conservons-nous vos données ?" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Nous conservons les données uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, sauf lorsqu'une durée plus longue est nécessaire pour respecter une obligation légale ou résoudre un litige.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Les durées de conservation peuvent varier selon le type de données :</p>
                  <BulletList
                    items={[
                      'données de compte ;',
                      'données de campagne ;',
                      'preuves de participation ;',
                      'données de support ;',
                      'données techniques.',
                    ]}
                  />
                </Card>
              </div>

              {/* 09 — Droits */}
              <div id="droits" className="space-y-6 scroll-mt-28">
                <SectionHeading n={9} title="Vos droits" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sous réserve des conditions prévues par la réglementation applicable, vous pouvez disposer de droits concernant vos données personnelles, notamment :
                  </p>
                  <BulletList
                    items={[
                      'demander l\u2019accès à vos données ;',
                      'demander leur rectification lorsqu\u2019elles sont incorrectes ;',
                      'demander leur suppression lorsque cela est applicable ;',
                      'vous opposer à certains traitements ;',
                      'demander certaines limitations du traitement ;',
                      'exercer les autres droits prévus par la réglementation applicable.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">Pour exercer vos droits, contactez-nous :</p>
                  <a
                    href="mailto:team@sika-ads.com"
                    className="inline-flex items-center gap-2 text-sm font-black text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-1"
                  >
                    <Mail size={16} /> team@sika-ads.com
                  </a>
                </Card>
              </div>

              {/* 10 — Sécurité du compte */}
              <div id="securite-compte" className="space-y-6 scroll-mt-28">
                <SectionHeading n={10} title="Sécurité du compte" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Vous êtes responsable de la confidentialité de vos identifiants et de l'utilisation de votre compte.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Nous vous recommandons de :</p>
                  <BulletList
                    items={[
                      'choisir un mot de passe suffisamment sécurisé ;',
                      'ne pas communiquer vos identifiants ;',
                      'nous signaler rapidement toute utilisation suspecte de votre compte.',
                    ]}
                  />
                </Card>
              </div>

              {/* 11 — Cookies */}
              <div id="cookies" className="space-y-6 scroll-mt-28">
                <SectionHeading n={11} title="Cookies" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads peut utiliser des cookies ou technologies similaires nécessaires au fonctionnement de la plateforme.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">Certains peuvent notamment permettre :</p>
                  <BulletList
                    items={[
                      'de maintenir une session utilisateur ;',
                      'de mémoriser certaines préférences (notifications, application installable) ;',
                      'd\u2019assurer la sécurité ;',
                      'd\u2019améliorer le fonctionnement du site.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Vous pouvez configurer votre navigateur pour limiter ces technologies ; certaines fonctionnalités de la plateforme pourraient alors ne plus fonctionner correctement.
                  </p>
                </Card>
              </div>

              {/* 12 — Services tiers */}
              <div id="services-tiers" className="space-y-6 scroll-mt-28">
                <SectionHeading n={12} title="Services tiers" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads utilise certains services techniques tiers. Les principaux services actuellement identifiés sont :
                  </p>
                  <BulletList
                    items={[
                      'LWS — hébergement ;',
                      'Supabase — base de données et infrastructure.',
                    ]}
                  />
                  <p className="text-slate-600 font-medium leading-relaxed">
                    D'autres services peuvent être utilisés si leur intégration est nécessaire au fonctionnement de certaines fonctionnalités. Les services tiers disposent de leurs propres politiques de confidentialité.
                  </p>
                </Card>
              </div>

              {/* 13 — Mineurs */}
              <div id="mineurs" className="space-y-6 scroll-mt-28">
                <SectionHeading n={13} title="Données des mineurs" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Sika Ads n'a pas vocation à collecter volontairement des données personnelles de personnes qui ne sont pas autorisées à utiliser le service.
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Si vous pensez qu'un mineur nous a transmis des données personnelles de manière inappropriée, contactez-nous afin que nous puissions examiner la situation.
                  </p>
                </Card>
              </div>

              {/* 14 — Modifications */}
              <div id="modifications" className="space-y-6 scroll-mt-28">
                <SectionHeading n={14} title="Modifications de cette politique" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Cette politique peut être mise à jour afin de tenir compte de l'évolution de Sika Ads, de ses fonctionnalités, de son infrastructure ou des obligations applicables.
                  </p>
                  <p className="text-sm font-black text-slate-900 pt-1">Dernière mise à jour : août 2026</p>
                </Card>
              </div>

              {/* 15 — Contacter */}
              <div id="contacter" className="space-y-6 scroll-mt-28 pb-6">
                <SectionHeading n={15} title="Nous contacter" />
                <Card>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Pour toute question concernant vos données personnelles ou cette politique :
                  </p>
                  <div className="space-y-2 pt-1 text-sm font-bold text-slate-900">
                    <p>Sika Ads — Omenka</p>
                    <p className="inline-flex items-center gap-2 font-medium text-slate-600">
                      <MapPin size={15} className="text-[#128785]" /> Hédzranawoé, Lomé, Togo
                    </p>
                    <p className="inline-flex items-center gap-2 font-medium text-slate-600">
                      <Phone size={15} className="text-[#128785]" />
                      <a href="tel:+22891416745" className="hover:text-[#128785] transition underline">+228 91 41 67 45</a>
                    </p>
                    <p className="inline-flex items-center gap-2 font-medium text-slate-600">
                      <Mail size={15} className="text-[#128785]" />
                      <a href="mailto:team@sika-ads.com" className="hover:text-[#128785] transition underline">team@sika-ads.com</a>
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('contact')}
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                  >
                    Contacter Sika Ads <ArrowRight size={14} />
                  </button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default PrivacyView;
