import React, { useState } from 'react';
import { FileText, ShieldCheck, Mail, MapPin, Building, Globe, Zap, Info, ChevronRight, Lock, Shield, Database, Eye, AlertCircle, CheckCircle2, ArrowLeft, MessageCircle, User, Icon } from 'lucide-react';
import Footer from '../components/Footer';

interface LegalViewProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms') => void;
}

const LegalView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('publisher');

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <button onClick={() => onNavigate('landing')} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <ArrowLeft size={16} /> Accueil
            </button>
            <ChevronRight size={16} className="text-slate-300" />
            <span className="text-slate-600">Mentions Légales</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6 backdrop-blur-sm">
              ⚖️ Transparence & Droits
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
              Mentions Légales
            </h1>
            <p className="text-lg text-blue-100 font-medium leading-relaxed">
                Toutes les informations légales, administratives et de conformité relatives à SikaAds Togo.
            </p>
            <p className="text-blue-200/70 text-sm font-bold mt-4">Dernière mise à jour : Avril 2026</p>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-12 bg-white border-b border-slate-100 sticky top-16 z-20 md:block hidden">
        <div className="container mx-auto px-6">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {[
              { id: 'publisher', label: 'Éditeur', icon: User },
              { id: 'hosting', label: 'Hébergement', icon: Globe },
              { id: 'data', label: 'Données', icon: Database },
              { id: 'cookies', label: 'Cookies', icon: AlertCircle },
              { id: 'rights', label: 'Droits', icon: Shield },
              { id: 'liability', label: 'Responsabilité', icon: Zap },
              { id: 'changes', label: 'Modifications', icon: FileText },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setExpandedSection(item.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  expandedSection === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.icon && <item.icon size={16} className="inline-block ml-1" />}
                &nbsp;&nbsp;
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="space-y-8">
            {/* Publisher Information */}
            <div
              id="publisher"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-indigo-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'publisher' ? null : 'publisher')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    <Building size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Éditeur de la Plateforme</h3>
                    <p className="text-sm text-slate-500 font-bold">Identité légale et responsabilités</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-indigo-600 transition-transform ${expandedSection === 'publisher' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'publisher' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
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
                      <p className="text-slate-900 font-bold bg-indigo-50 p-3 rounded-lg border border-indigo-200">
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
                      <strong>Directeur de la Publication:</strong> Koffi Jean-Pierre<br/>
                      <strong>Contact Administratif:</strong> admin@sikaads.tg
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Hosting Information */}
            <div
              id="hosting"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-green-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'hosting' ? null : 'hosting')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 font-bold">
                    <Globe size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Hébergement Technique</h3>
                    <p className="text-sm text-slate-500 font-bold">Infrastructure et serveurs</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-green-600 transition-transform ${expandedSection === 'hosting' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'hosting' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap size={20} className="text-green-600" />
                        <h4 className="text-sm font-black text-green-900">Hébergeur Cloud Principal</h4>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-2">Amazon Web Services (AWS)</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Région: Europe (Paris)</li>
                        <li>✓ Redondance géographique</li>
                        <li>✓ Certifications: ISO 27001, SOC 2</li>
                      </ul>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Database size={20} className="text-blue-600" />
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
              )}
            </div>

            {/* Data Protection */}
            <div
              id="data"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-purple-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'data' ? null : 'data')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                    <Lock size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Protection des Données</h3>
                    <p className="text-sm text-slate-500 font-bold">Conformité légale et sécurité</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-purple-600 transition-transform ${expandedSection === 'data' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'data' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <CheckCircle2 size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Loi Togolaise n°2019-014</h4>
                        <p className="text-sm text-slate-600">Protection des données à caractère personnel</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <CheckCircle2 size={20} className="text-purple-600 mt-1 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900 mb-1">Chiffrement des Données</h4>
                        <p className="text-sm text-slate-600">Protocole SSL/TLS 1.3 pour toutes les connexions</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <CheckCircle2 size={20} className="text-purple-600 mt-1 shrink-0" />
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
              )}
            </div>

            {/* Cookies & Tracking */}
            <div
              id="cookies"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-orange-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'cookies' ? null : 'cookies')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                    <Eye size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Cookies & Technologies</h3>
                    <p className="text-sm text-slate-500 font-bold">Suivi et consentement</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-orange-600 transition-transform ${expandedSection === 'cookies' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'cookies' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
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
              )}
            </div>

            {/* Content Rights */}
            <div
              id="rights"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-pink-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'rights' ? null : 'rights')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                    <FileText size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Propriété Intellectuelle</h3>
                    <p className="text-sm text-slate-500 font-bold">Droits et restrictions</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-pink-600 transition-transform ${expandedSection === 'rights' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'rights' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
                  <div className="space-y-4">
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
              )}
            </div>

            {/* Liability */}
            <div
              id="liability"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-red-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'liability' ? null : 'liability')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold">
                    <Shield size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Limitation de Responsabilité</h3>
                    <p className="text-sm text-slate-500 font-bold">Clauses d'exemption</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-red-600 transition-transform ${expandedSection === 'liability' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'liability' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
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
              )}
            </div>

            {/* Modifications */}
            <div
              id="changes"
              className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-cyan-400 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === 'changes' ? null : 'changes')}
                className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold">
                    <AlertCircle size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900">Modifications de CGU</h3>
                    <p className="text-sm text-slate-500 font-bold">Mise à jour et notification</p>
                  </div>
                </div>
                <ChevronRight size={24} className={`text-cyan-600 transition-transform ${expandedSection === 'changes' ? 'rotate-90' : ''}`} />
              </button>
              
              {expandedSection === 'changes' && (
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-100 space-y-6">
                  <p className="text-slate-700 font-medium">
                    SikaAds Togo se réserve le droit de modifier ces mentions légales à tout moment. Les modifications seront notifiées aux utilisateurs via email ou sur le site.
                  </p>
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                    <p className="text-sm text-cyan-900 font-medium">
                      Dernière mise à jour: <strong>Avril 2026</strong><br/>
                      En continuant à utiliser le site, vous acceptez les conditions en vigueur.
                    </p>
                  </div>
                </div>
              )}
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
