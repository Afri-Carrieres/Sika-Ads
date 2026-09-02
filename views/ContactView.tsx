import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Compass,
  Handshake,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Send,
} from 'lucide-react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import PageHero from '../components/PageHero';
import { supabase } from '../supabase';

interface ContactViewProps {
  onNavigate: (view: MarketingView) => void;
  onStart?: () => void;
}

type ContactType = 'creator' | 'company' | 'partner' | 'other';
type ContactSubject =
  | 'general'
  | 'creator'
  | 'company'
  | 'account_issue'
  | 'campaign_issue'
  | 'payment'
  | 'partnership'
  | 'report'
  | 'other';

interface FormState {
  type: ContactType | '';
  subject: ContactSubject | '';
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

interface FieldErrors {
  type?: string;
  subject?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

const CONTACT_TYPES: { id: ContactType; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'creator', label: 'Créateur de contenu', description: 'Vous monétisez vos réseaux sociaux ou vous souhaitez commencer.', icon: Camera },
  { id: 'company', label: 'Entreprise / Marque', description: 'Vous voulez promouvoir vos produits ou services.', icon: Building2 },
  { id: 'partner', label: 'Partenaire', description: 'Vous envisagez une collaboration avec Sika Ads.', icon: Handshake },
  { id: 'other', label: 'Autre', description: 'Tout simplement une question ou une idée à partager.', icon: Compass },
];

const SUBJECTS: { id: ContactSubject; label: string }[] = [
  { id: 'general', label: 'Question générale' },
  { id: 'creator', label: 'Je suis créateur' },
  { id: 'company', label: 'Je suis une entreprise / marque' },
  { id: 'account_issue', label: 'Problème avec mon compte' },
  { id: 'campaign_issue', label: 'Problème avec une campagne' },
  { id: 'payment', label: 'Paiement / rémunération' },
  { id: 'partnership', label: 'Partenariat' },
  { id: 'report', label: 'Signaler un problème' },
  { id: 'other', label: 'Autre' },
];

const STEPS = [
  { id: 1, label: 'Vous' },
  { id: 2, label: 'Sujet' },
  { id: 3, label: 'Coordonnées' },
  { id: 4, label: 'Message' },
];

const MAX_MESSAGE = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const typeLabel = (t: ContactType | '') => CONTACT_TYPES.find((c) => c.id === t)?.label || '—';
const subjectLabel = (s: ContactSubject | '') => SUBJECTS.find((c) => c.id === s)?.label || '—';

const ContactView: React.FC<ContactViewProps> = ({ onNavigate, onStart }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    type: '',
    subject: '',
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string>('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the step heading on step change (a11y)
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (s: number): FieldErrors => {
    const e: FieldErrors = {};
    if (s === 1 && !form.type) e.type = 'Veuillez sélectionner une option.';
    if (s === 2 && !form.subject) e.subject = 'Veuillez sélectionner un sujet.';
    if (s === 3) {
      if (!form.firstName.trim()) e.firstName = 'Veuillez saisir votre prénom.';
      if (!form.lastName.trim()) e.lastName = 'Veuillez saisir votre nom.';
      if (!form.email.trim()) e.email = 'Veuillez saisir votre adresse email.';
      else if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Cette adresse email ne semble pas valide.';
    }
    if (s === 4) {
      if (!form.message.trim()) e.message = 'Veuillez décrire votre demande.';
      else if (form.message.length > MAX_MESSAGE) e.message = `Votre message ne peut pas dépasser ${MAX_MESSAGE} caractères.`;
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateStep(4);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStatus('loading');
    setSubmitError('');
    try {
      const { error } = await supabase.functions.invoke('contact-form', {
        body: {
          type: form.type,
          subject: form.subject,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          company_website: honeypotRef.current?.value || '',
        },
      });
      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error('Contact form submission failed:', err);
      setStatus('error');
      setSubmitError('Une erreur est survenue. Vérifiez vos informations et réessayez.');
    }
  };

  const resetForm = () => {
    setForm({ type: '', subject: '', firstName: '', lastName: '', email: '', message: '' });
    setErrors({});
    setSubmitError('');
    setStep(1);
    setStatus('idle');
  };

  const stepTitles: Record<number, string> = {
    1: 'Parlez-nous de vous',
    2: 'Quel est le sujet de votre demande ?',
    3: 'Comment pouvons-nous vous répondre ?',
    4: 'Votre message',
  };

  return (
    <div className="bg-white min-h-screen pt-10 flex flex-col">
      <SEOHead
        title="Contactez Sika Ads | Une question ? Parlons-en"
        description="Contactez l'équipe Sika Ads pour une question, un problème, un partenariat ou une demande concernant nos services. Sika Ads est basé à Lomé, au Togo."
        canonicalPath="/contact"
        type="website"
      />

      <MarketingHeader onNavigate={onNavigate} onStart={onStart} active="contact" />

      <main className="flex flex-col flex-1">
        <PageHero
          badge="Contactez-nous"
          title={
            <>
              Parlons de votre projet
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] to-indigo-400">.</span>
            </>
          }
          subtitle="Une question, une idée, un problème ou une opportunité ? Envoyez-nous un message et notre équipe vous répondra."
          accent="teal"
        />

        {/* ── CONTACT: INFO + MULTISTEP FORM ── */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight mb-4">
                    Nous sommes là pour vous aider
                  </h2>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Que vous soyez créateur, entreprise ou simplement intéressé par Sika Ads, choisissez le sujet de votre demande et contactez notre équipe.
                  </p>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-[#128785]/10 border border-[#128785]/20 flex items-center justify-center shrink-0">
                      <Mail size={20} className="text-[#128785]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                      <a
                        href="mailto:team@sika-ads.com"
                        className="text-sm font-bold text-slate-900 hover:text-[#128785] transition-colors break-all"
                      >
                        team@sika-ads.com
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <MapPin size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                      <p className="text-sm font-bold text-slate-900">Lomé, Togo</p>
                    </div>
                  </li>
                </ul>

                <div className="p-6 bg-slate-950 rounded-3xl text-white relative overflow-hidden">
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#128785]/20 blur-3xl rounded-full" />
                  <p className="relative text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Vous êtes créateur ?</p>
                  <p className="relative text-sm font-medium text-slate-300 leading-relaxed mb-4">
                    Rejoignez la communauté et monétisez vos réseaux sociaux dès aujourd'hui.
                  </p>
                  <button
                    onClick={onStart}
                    className="relative inline-flex items-center gap-2 px-5 py-3 bg-[#f55d05] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                  >
                    Devenir créateur <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Right column: the form */}
              <div className="lg:col-span-3 w-full">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-10">
                  {status === 'success' ? (
                    /* ── SUCCESS STATE ── */
                    <div className="text-center py-10" role="status" aria-live="polite">
                      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                      </div>
                      <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight mb-4">
                        Message envoyé !
                      </h2>
                      <p className="text-slate-600 font-medium leading-relaxed max-w-md mx-auto mb-3">
                        Merci pour votre message. Nous avons bien reçu votre demande et notre équipe vous répondra prochainement.
                      </p>
                      <p className="text-sm font-bold text-[#128785] mb-8">
                        Votre message a été envoyé à team@sika-ads.com.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => onNavigate('landing')}
                          className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                        >
                          Retour à l'accueil
                        </button>
                        <button
                          onClick={resetForm}
                          className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-[#128785] hover:text-[#128785] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                        >
                          Envoyer un autre message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-heading text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight mb-6">
                        Contactez-nous
                      </h2>

                      {/* Progress */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Étape {step} sur 4
                          </p>
                          {STEPS.map((s) => (
                            <span
                              key={s.id}
                              className={`hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                                s.id === step ? 'text-[#128785]' : s.id < step ? 'text-slate-500' : 'text-slate-300'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                  s.id < step
                                    ? 'bg-[#128785] border-[#128785] text-white'
                                    : s.id === step
                                    ? 'border-[#128785] text-[#128785]'
                                    : 'border-slate-200 text-slate-300'
                                }`}
                              >
                                {s.id < step ? <Check size={12} /> : `0${s.id}`}
                              </span>
                              {s.label}
                            </span>
                          ))}
                        </div>
                        {/* Mobile bar */}
                        <div className="sm:hidden">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#128785] rounded-full transition-all duration-300 motion-reduce:transition-none"
                              style={{ width: `${(step / 4) * 100}%` }}
                            />
                          </div>
                        </div>
                        {/* Desktop rail */}
                        <div className="hidden sm:block mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#128785] to-indigo-500 rounded-full transition-all duration-300 motion-reduce:transition-none"
                            style={{ width: `${(step / 4) * 100}%` }}
                          />
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} noValidate>
                        <h3
                          ref={headingRef}
                          tabIndex={-1}
                          className="font-heading text-lg md:text-xl font-bold text-slate-900 mb-1 focus:outline-none"
                        >
                          {stepTitles[step]}
                        </h3>

                        {/* Honeypot (anti-spam) */}
                        <div aria-hidden="true" className="hidden">
                          <label>
                            Ne pas remplir
                            <input ref={honeypotRef} type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                          </label>
                        </div>

                        {/* STEP 1 */}
                        {step === 1 && (
                          <fieldset className="mt-5">
                            <legend className="text-sm font-medium text-slate-500 mb-5">
                              Vous nous contactez en tant que...
                            </legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {CONTACT_TYPES.map((opt) => {
                                const selected = form.type === opt.id;
                                const Icon = opt.icon;
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 motion-reduce:transition-none focus-within:ring-4 focus-within:ring-teal-100 ${
                                      selected
                                        ? 'border-[#128785] bg-[#128785]/5'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="contact-type"
                                      value={opt.id}
                                      checked={selected}
                                      onChange={() => setField('type', opt.id)}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        selected ? 'bg-[#128785] text-white' : 'bg-white border border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <Icon size={18} />
                                    </span>
                                    <span>
                                      <span className="block text-sm font-bold text-slate-900">{opt.label}</span>
                                      <span className="block text-xs font-medium text-slate-500 leading-relaxed mt-1">
                                        {opt.description}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {errors.type && (
                              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600" role="alert">
                                <AlertCircle size={14} /> {errors.type}
                              </p>
                            )}
                          </fieldset>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                          <fieldset className="mt-5">
                            <legend className="sr-only">Sujet de votre demande</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {SUBJECTS.map((opt) => {
                                const selected = form.subject === opt.id;
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 motion-reduce:transition-none focus-within:ring-4 focus-within:ring-teal-100 ${
                                      selected
                                        ? 'border-[#128785] bg-[#128785]/5'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="contact-subject"
                                      value={opt.id}
                                      checked={selected}
                                      onChange={() => setField('subject', opt.id)}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        selected ? 'border-[#128785]' : 'border-slate-300'
                                      }`}
                                    >
                                      {selected && <span className="w-2 h-2 rounded-full bg-[#128785]" />}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {errors.subject && (
                              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600" role="alert">
                                <AlertCircle size={14} /> {errors.subject}
                              </p>
                            )}
                          </fieldset>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="contact-first-name" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Prénom
                              </label>
                              <input
                                id="contact-first-name"
                                type="text"
                                value={form.firstName}
                                onChange={(e) => setField('firstName', e.target.value)}
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? 'err-firstName' : undefined}
                                autoComplete="given-name"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="Votre prénom"
                              />
                              {errors.firstName && (
                                <p id="err-firstName" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.firstName}
                                </p>
                              )}
                            </div>
                            <div>
                              <label htmlFor="contact-last-name" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Nom
                              </label>
                              <input
                                id="contact-last-name"
                                type="text"
                                value={form.lastName}
                                onChange={(e) => setField('lastName', e.target.value)}
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? 'err-lastName' : undefined}
                                autoComplete="family-name"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="Votre nom"
                              />
                              {errors.lastName && (
                                <p id="err-lastName" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.lastName}
                                </p>
                              )}
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="contact-email" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Adresse email
                              </label>
                              <input
                                id="contact-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setField('email', e.target.value)}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'err-email' : undefined}
                                autoComplete="email"
                                className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition"
                                placeholder="vous@exemple.com"
                              />
                              {errors.email && (
                                <p id="err-email" className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                  <AlertCircle size={13} /> {errors.email}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* STEP 4 + SUMMARY */}
                        {step === 4 && (
                          <div className="mt-5 space-y-6">
                            <div>
                              <label htmlFor="contact-message" className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                Votre message
                              </label>
                              <textarea
                                id="contact-message"
                                value={form.message}
                                onChange={(e) => setField('message', e.target.value)}
                                aria-invalid={!!errors.message}
                                aria-describedby={errors.message ? 'err-message' : 'message-hint'}
                                rows={6}
                                maxLength={MAX_MESSAGE}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#128785] focus:ring-4 focus:ring-teal-100 transition resize-y"
                                placeholder="Décrivez votre question, votre problème ou votre projet..."
                              />
                              <div className="flex items-center justify-between mt-2">
                                {errors.message ? (
                                  <p id="err-message" className="flex items-center gap-1.5 text-xs font-bold text-red-600" role="alert">
                                    <AlertCircle size={13} /> {errors.message}
                                  </p>
                                ) : (
                                  <p id="message-hint" className="text-xs font-medium text-slate-400">
                                    Quelques lignes suffisent.
                                  </p>
                                )}
                                <p className="text-[10px] font-bold text-slate-400 tabular-nums">
                                  {form.message.length} / {MAX_MESSAGE}
                                </p>
                              </div>
                            </div>

                            {/* Récapitulatif avant envoi */}
                            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 sm:p-6">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                Récapitulatif de votre demande
                              </p>
                              <dl className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</dt>
                                    <dd className="font-bold text-slate-900">{typeLabel(form.type)}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sujet</dt>
                                    <dd className="font-bold text-slate-900">{subjectLabel(form.subject)}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                  <div>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</dt>
                                    <dd className="font-bold text-slate-900">
                                      {form.firstName} {form.lastName}
                                    </dd>
                                    <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Email</dt>
                                    <dd className="font-bold text-slate-900 break-all">{form.email}</dd>
                                  </div>
                                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#128785] hover:text-teal-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg px-2 py-1">
                                    <Pencil size={12} /> Modifier
                                  </button>
                                </div>
                              </dl>
                            </div>

                            {status === 'error' && (
                              <div className="flex items-start gap-3 border border-red-100 bg-red-50 p-4 rounded-xl" role="alert">
                                <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-black text-red-700">Votre message n'a pas pu être envoyé.</p>
                                  <p className="text-xs font-medium text-red-600 mt-1">{submitError}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* NAV BUTTONS */}
                        <div className="flex items-center justify-between gap-3 mt-8">
                          {step > 1 ? (
                            <button
                              type="button"
                              onClick={handleBack}
                              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                              <ArrowLeft size={14} /> Retour
                            </button>
                          ) : (
                            <span />
                          )}

                          {step < 4 ? (
                            <button
                              type="button"
                              onClick={handleNext}
                              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] hover:scale-[1.02] active:scale-95 transition motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                            >
                              Continuer <ArrowRight size={14} />
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={status === 'loading'}
                              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#f55d05] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-[#ea580c] hover:scale-[1.02] active:scale-95 transition motion-reduce:hover:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                            >
                              {status === 'loading' ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" /> Envoi en cours...
                                </>
                              ) : status === 'error' ? (
                                <>
                                  <Send size={14} /> Réessayer
                                </>
                              ) : (
                                <>
                                  <Send size={14} /> Envoyer mon message
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight text-center mb-10">
              Questions fréquentes
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: 'Comment contacter Sika Ads ?',
                  a: 'Utilisez le formulaire ci-dessus ou écrivez-nous directement à team@sika-ads.com. Sika Ads est basé à Lomé, au Togo.',
                },
                {
                  q: 'Comment contacter Sika Ads en tant que créateur ?',
                  a: 'Dans le formulaire, sélectionnez le type « Créateur de contenu » puis le sujet « Je suis créateur ». Vous pouvez aussi créer un compte directement sur la plateforme pour rejoindre les campagnes disponibles.',
                },
                {
                  q: "Comment contacter Sika Ads en tant qu'entreprise ?",
                  a: 'Sélectionnez le type « Entreprise / Marque » et le sujet correspondant à votre demande. Vous pouvez également lancer une campagne directement depuis la plateforme.',
                },
                {
                  q: 'Comment proposer un partenariat à Sika Ads ?',
                  a: 'Dans le formulaire, choisissez le type « Partenaire » et le sujet « Partenariat », puis décrivez votre proposition. Notre équipe examinera chaque suggestion de collaboration.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group bg-white rounded-2xl border border-slate-100 px-5 sm:px-6 py-4 open:shadow-md transition-shadow"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-black text-slate-900 uppercase tracking-tight py-1">
                    {item.q}
                    <span className="w-6 h-6 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-open:rotate-45 transition-transform" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed mt-2 mb-1">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="bg-slate-50 text-center rounded-[4rem] py-16 px-6 sm:px-12">
              <h2 className="font-heading text-3xl font-bold text-slate-900 mb-8 max-w-xl mx-auto uppercase tracking-tight">
                Prêt à faire connaître votre marque ?
              </h2>
              <button
                onClick={onStart}
                className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-105 transition motion-reduce:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
              >
                Commencer avec Sika Ads
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default ContactView;
