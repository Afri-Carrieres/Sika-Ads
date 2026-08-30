import React from 'react';
import { ShieldAlert, ShieldCheck, X, AlertTriangle, Smartphone, Ban, CheckCircle, Lock, Info, ExternalLink } from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader from '../components/MarketingHeader';
import PageHero from '../components/PageHero';

interface TermsViewProps {
  onNavigate: (view: 'landing' | 'about' | 'legal' | 'terms' | 'contact' | 'privacy') => void;
  onStart: () => void;
}

const TermsView: React.FC<TermsViewProps> = ({ onNavigate, onStart }) => {
  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Conditions Générales d'Utilisation & Charte Anti-Fraude | SikaAds"
        description="Consultez les Conditions Générales d'Utilisation (CGU), les règles de rémunération et la politique anti-fraude de SikaAds Togo."
        canonicalPath="/terms"
        ogImage="https://www.sika-ads.com/anti_fraud.png"
      />
      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="terms" />

      <PageHero
        badge="Confiance & Sécurité"
        title={
          <>
            CGU & Protection <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-indigo-400">
              Anti-Fraude.
            </span>
          </>
        }
        subtitle="Nous construisons un écosystème sain et honnête. En rejoignant SikaAds, vous vous engagez à respecter des règles strictes pour garantir la valeur apportée aux annonceurs."
        accent="red"
      />

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              {/* Sidebar Navigation (Sticky) */}
              <div className="lg:col-span-1 border-r border-slate-100 pr-8 hidden lg:block">
                  <div className="sticky top-28 space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire</h3>
                      <ul className="space-y-4 text-sm font-bold text-slate-600">
                          <li><a href="#objet" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">1. Objet de la plateforme</a></li>
                          <li><a href="#eligibilite" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">2. Éligibilité des ambassadeurs</a></li>
                          <li><a href="#remuneration" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">3. Rémunération & Paiements</a></li>
                          <li><a href="#antifraude" className="hover:text-red-600 transition-colors block py-2 border-b border-slate-50 text-red-500">4. POLITIQUE ANTI-FRAUDE</a></li>
                          <li><a href="#resiliation" className="hover:text-indigo-600 transition-colors block py-2 border-b border-slate-50">5. Résiliation de compte</a></li>
                      </ul>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Besoin d'aide ?</p>
                          <p className="text-xs text-slate-600 mb-4 font-medium italic leading-relaxed">Une clause vous semble obscure ? Nos conseillers sont là pour vous éclairer.</p>
                          <button onClick={() => onNavigate('contact')} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">Contact Support <ExternalLink size={12} /></button>
                      </div>
                  </div>
              </div>

              {/* Main Text Area */}
              <div className="lg:col-span-2 space-y-16">
                  
                  {/* Section: Objet */}
                  <div id="objet" className="space-y-6 scroll-mt-28">
                      <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">01</span>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Objet de la Plateforme</h2>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        SikaAds Togo est une application de mise en relation entre des annonceurs (entreprises souhaitant promouvoir des produits/services) et des nano-influenceurs ("Ambassadeurs") qui partagent des contenus en statut WhatsApp ou en story Instagram et Facebook, et perçoivent une rémunération après vérification et validation de leurs vues.
                      </p>
                  </div>

                  {/* Section: Éligibilité */}
                  <div id="eligibilite" className="space-y-6 scroll-mt-28">
                      <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">02</span>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Éligibilité des Ambassadeurs</h2>
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                          <p className="text-slate-600 leading-relaxed font-medium">
                              Sika Ads est réservé aux personnes âgées d'au moins <strong>18 ans</strong>. En créant un compte, vous déclarez avoir 18 ans ou plus et fournir des informations exactes.
                          </p>
                          <p className="text-slate-600 leading-relaxed font-medium">
                              Tout compte déclarant une personne mineure ou dont l'âge réel est inférieur à 18 ans peut être refusé ou supprimé, sans rémunération des participations correspondantes.
                          </p>
                      </div>
                  </div>

                  {/* Section: Rémunération */}
                  <div id="remuneration" className="space-y-6 scroll-mt-28">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">03</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Rémunération & Paiements</h2>
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                        <div className="flex items-start gap-4">
                            <CheckCircle size={20} className="text-green-500 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-black text-slate-900 mb-2 uppercase text-xs tracking-widest">Calcul des gains</h4>
                                <p className="text-sm text-slate-600 leading-relaxed italic">Les gains sont indexés sur la qualité et la quantité de l'audience réelle constatée. Chaque campagne définit ses propres tarifs (Forfait ou Par Vues).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 border-t border-slate-200 pt-6">
                            <Lock size={20} className="text-indigo-500 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-black text-slate-900 mb-2 uppercase text-xs tracking-widest">Retraits (Seuil)</h4>
                                <p className="text-sm text-slate-600 leading-relaxed italic">Le seuil minimum pour effectuer un retrait est fixé à <strong>2 000 FCFA</strong>. Les paiements sont traités via T-Money ou Flooz dans un délai de 24 à 72 heures ouvrées.</p>
                            </div>
                        </div>
                      </div>
                  </div>

                  {/* Section: ANTI-FRAUDE (DANGER AREA) */}
                  <div id="antifraude" className="scroll-mt-28 p-1 md:p-10 bg-red-50 rounded-[3rem] border-2 border-red-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-red-100/50 blur-3xl rounded-full" />
                      <div className="relative z-10 space-y-8">
                          <div className="flex items-center gap-4 text-red-600">
                             <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg"><ShieldAlert size={28} /></div>
                             <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">Tolérance Zéro Anti-Fraude</h2>
                          </div>

                          <p className="text-red-900 text-lg font-bold leading-relaxed italic">
                              Tout comportement frauduleux entraîne un bannissement définitif et immédiat, sans préavis et avec gel irréversible du solde.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                { title: "Photoshop", desc: "Modification de captures d'écran." },
                                { title: "Automates", desc: "Utilisation de bots ou auto-clics." },
                                { title: "Désinstallation", desc: "Suppression du statut avant 24h." },
                                { title: "Spam", desc: "Forcer les clics auprès de tiers." },
                              ].map((rule, i) => (
                                <div key={i} className="flex gap-3 bg-white/40 p-4 rounded-2xl border border-red-200 group-hover:bg-white/60 transition-all">
                                    <X size={18} className="text-red-600 shrink-0 mt-1" />
                                    <div>
                                        <h5 className="font-black text-red-900 text-xs mb-0.5">{rule.title}</h5>
                                        <p className="text-[10px] text-red-700 font-bold opacity-70 uppercase">{rule.desc}</p>
                                    </div>
                                </div>
                              ))}
                          </div>

                          <div className="bg-red-900 p-8 rounded-3xl text-white space-y-6 relative overflow-hidden">
                              <div className="absolute bottom-0 right-0 opacity-10"><Lock size={120} /></div>
                              <h4 className="text-xl font-black text-center uppercase tracking-tighter">Notre Technologie IA</h4>
                              <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                                  Nos algorithmes analysent les métadonnées de chaque image soumise (EXIF, Pixels, Profondeur). Nous détectons automatiquement 99% des tentatives de fraude visuelle.
                              </p>
                              <div className="text-center pt-4">
                                 <span className="px-6 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Soyez honnêtes, gagnez durablement</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Section: Résiliation */}
                  <div id="resiliation" className="space-y-6 scroll-mt-28 pb-10">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">05</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Résiliation de Compte</h2>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">
                          Vous pouvez fermer votre compte SikaAds à tout moment via l'application. SikaAds se réserve le droit de suspendre tout compte inactif pendant plus de 12 mois.
                      </p>
                  </div>
              </div>
           </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-slate-50 text-center container mx-auto px-6 rounded-[4rem] mb-10">
          <h3 className="text-3xl font-black text-slate-900 mb-8 max-w-xl mx-auto">
              En utilisant SikaAds, vous participez à une communauté de confiance.
          </h3>
          <button onClick={onStart} className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition-all">
              J'accepte et je commence
          </button>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default TermsView;
