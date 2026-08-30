import React from 'react';
import { Mail, MessageCircle, Globe, Lock, Shield, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import PageHero from '../components/PageHero';

interface LegalViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}

const LegalView: React.FC<LegalViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Mentions Légales & Confidentialité | SikaAds Togo"
        description="Mentions légales, politique de confidentialité des données personnelles et conditions d'hébergement de SikaAds."
        canonicalPath="/legal"
      />

      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="legal" />

      <PageHero
        badge="Transparence & Droits"
        title="Mentions Légales"
        subtitle="Toutes les informations légales, administratives et de conformité relatives à SikaAds Togo."
        accent="indigo"
      >
        <p className="text-blue-200/70 text-sm font-bold mt-4">Dernière mise à jour : Avril 2026</p>
      </PageHero>

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Sidebar Navigation (Sticky) */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire</h3>
                <ul className="space-y-4 text-sm font-bold text-slate-600">
                  <li><a href="#publisher" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">1. Éditeur de la plateforme</a></li>
                  <li><a href="#hosting" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">2. Hébergement technique</a></li>
                  <li><a href="#data" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">3. Protection des données</a></li>
                  <li><a href="#cookies" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">4. Cookies & Technologies</a></li>
                  <li><a href="#rights" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">5. Propriété intellectuelle</a></li>
                  <li><a href="#liability" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">6. Limitation de responsabilité</a></li>
                  <li><a href="#changes" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">7. Modifications de CGU</a></li>
                </ul>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Besoin d'aide ?</p>
                  <p className="text-xs text-slate-600 mb-4 font-medium italic leading-relaxed">Une clause vous semble obscure ? Notre équipe est là pour vous éclairer.</p>
                  <button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">Contacter le support →</button>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="lg:col-span-2 space-y-16">
              {/* 01 Publisher */}
              <div id="publisher" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">01</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Éditeur de la Plateforme</h2>
                    <p className="text-sm text-slate-500 font-bold">Identité légale et responsabilités</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">👤 Dénomination Sociale</h4>
                      <p className="text-lg font-bold text-slate-900">SikaAds Togo SAS</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">🏢 Forme Juridique</h4>
                      <p className="text-lg font-bold text-slate-900">Société par Actions Simplifiée (SAS)</p>
                      <p className="text-sm text-slate-500 mt-1">Capital: 5 000 000 FCFA</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">📍 Siège Social</h4>
                      <p className="text-slate-900 font-bold bg-white p-3 rounded-lg border border-indigo-200">
                        Lomé, Quartier Agoè, Boulevard Eyadema, Togo
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">🆔 RCCM / IFU</h4>
                      <p className="text-slate-900 font-bold">TG-LOM 2024 B 4567</p>
                      <p className="text-sm text-slate-500 mt-1">IFU : 004567891</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex gap-3">
                    <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 font-medium">
                      <strong>Directeur de la Publication:</strong> Koffi Jean-Pierre<br />
                      <strong>Contact Administratif:</strong> admin@sikaads.tg
                    </p>
                  </div>
                </div>
              </div>

              {/* 02 Hosting */}
              <div id="hosting" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">02</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hébergement Technique</h2>
                    <p className="text-sm text-slate-500 font-bold">Infrastructure et serveurs</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe size={20} className="text-green-600" />
                        <h4 className="text-sm font-black text-green-900">Hébergeur Cloud Principal</h4>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-2">Amazon Web Services (AWS)</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Région: Europe (Paris)</li>
                        <li>✓ Redondance géographique</li>
                        <li>✓ Certifications: ISO 27001, SOC 2</li>
                      </ul>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock size={20} className="text-blue-600" />
                        <h4 className="text-sm font-black text-blue-900">Bases de Données</h4>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-2">Google Cloud Firestore</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Sauvegardes automatiques</li>
                        <li>✓ Réplication temps réel</li>
                        <li>✓ Uptime: 99.95%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 03 Data */}
              <div id="data" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">03</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Protection des Données</h2>
                    <p className="text-sm text-slate-500 font-bold">Conformité légale et sécurité</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Loi Togolaise n°2019-014</h4>
                        <p className="text-sm text-slate-600">Protection des données à caractère personnel</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Chiffrement des Données</h4>
                        <p className="text-sm text-slate-600">Protocole SSL/TLS 1.3 pour toutes les connexions</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Shield size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Audit de Sécurité</h4>
                        <p className="text-sm text-slate-600">Audits mensuels effectués par des tiers indépendants</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 font-medium">
                      <strong>Droit d'accès:</strong> Vous pouvez à tout moment demander une copie de vos données personnelles. Contactez <a href="mailto:privacy@sikaads.tg" className="underline">privacy@sikaads.tg</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* 04 Cookies */}
              <div id="cookies" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">04</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cookies & Technologies</h2>
                    <p className="text-sm text-slate-500 font-bold">Suivi et consentement</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-slate-900 mb-2">🔒 Cookies Essentiels</h4>
                      <p className="text-sm text-slate-600">Nécessaires au fonctionnement du site (session, authentification)</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-slate-900 mb-2">📊 Cookies Analytics</h4>
                      <p className="text-sm text-slate-600">Google Analytics pour améliorer l'expérience utilisateur</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Vous pouvez désactiver les cookies non essentiels à tout moment via les paramètres de votre navigateur.
                  </p>
                </div>
              </div>

              {/* 05 Rights */}
              <div id="rights" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">05</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Propriété Intellectuelle</h2>
                    <p className="text-sm text-slate-500 font-bold">Droits et restrictions</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                  <p className="text-slate-700 font-medium">
                    Tous les contenus présents sur SikaAds Togo (texte, images, logos, vidéos) sont la propriété exclusive de SikaAds Togo ou de ses partenaires licenciés.
                  </p>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 space-y-2">
                    <h4 className="font-bold text-slate-900">Interdictions</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>❌ Reproduction sans autorisation explicite</li>
                      <li>❌ Distribution ou revente de contenus</li>
                      <li>❌ Utilisation commerciale sans licence</li>
                      <li>❌ Reverse engineering ou décompilation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 06 Liability */}
              <div id="liability" className="space-y-6 scroll-mt-28">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">06</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Limitation de Responsabilité</h2>
                    <p className="text-sm text-slate-500 font-bold">Clauses d'exemption</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-900 font-medium leading-relaxed">
                      SikaAds Togo ne peut être tenue responsable de:
                    </p>
                    <ul className="text-sm text-red-800 mt-3 space-y-2">
                      <li>• Pertes de données ou interruptions de service</li>
                      <li>• Dommages indirects ou consécutifs</li>
                      <li>• Contenus générés par les utilisateurs</li>
                      <li>• Dysfonctionnements dus à des tiers</li>
                    </ul>
                  </div>
                  <p className="text-sm text-slate-600">
                    <strong>Limitation:</strong> Notre responsabilité est limitée au montant total des frais payés par l'utilisateur au cours des 12 derniers mois.
                  </p>
                </div>
              </div>

              {/* 07 Changes */}
              <div id="changes" className="space-y-6 scroll-mt-28 pb-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">07</span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Modifications de CGU</h2>
                    <p className="text-sm text-slate-500 font-bold">Mise à jour et notification</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <p className="text-slate-700 font-medium">
                    SikaAds Togo se réserve le droit de modifier ces mentions légales à tout moment. Les modifications seront notifiées aux utilisateurs via email ou sur le site.
                  </p>
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                    <p className="text-sm text-cyan-900 font-medium">
                      Dernière mise à jour: <strong>Avril 2026</strong><br />
                      En continuant à utiliser le site, vous acceptez les conditions en vigueur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-slate-100">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 mb-2">Question Juridique?</h3>
                <p className="text-sm text-slate-600 mb-3">Notre équipe légale est disponible pour vous aider.</p>
                <a href="mailto:legal@sikaads.tg" className="text-indigo-600 font-bold text-sm hover:text-indigo-700">
                  legal@sikaads.tg →
                </a>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 mb-2">Consultez aussi les CGU</h3>
                <p className="text-sm text-slate-600 mb-3">Pour les conditions d'utilisation et la politique anti-fraude.</p>
                <button onClick={() => onNavigate('terms')} className="text-indigo-600 font-bold text-sm hover:text-indigo-700 flex items-center gap-1">
                  CGU & Anti-Fraude →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default LegalView;
