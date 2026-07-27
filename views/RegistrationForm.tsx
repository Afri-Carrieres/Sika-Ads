import React, { useState } from 'react';
import { supabase } from '../supabase';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  User as UserIcon,
  MapPin,
  Calendar,
  Wallet,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Mail,
  AlertCircle,
  Sparkles,
  Users,
  Landmark
} from 'lucide-react';

interface RegistrationFormProps {
  onComplete: () => void;
  onCancel: () => void;
  onGoToLogin: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete, onCancel, onGoToLogin }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Data (Auth)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 Data (Profile)
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [city, setCity] = useState('');
  const [ageRange, setAgeRange] = useState('');

  // Step 3 Data (Payment)
  const [paymentMethod, setPaymentMethod] = useState<'Mixx' | 'Moov' | ''>('');
  const [momoNumber, setMomoNumber] = useState('');

  const cities = ['Lomé', 'Kara', 'Sokodé', 'Kpalimé', 'Atakpamé', 'Dapaong', 'Autre'];
  const ageRanges = ['15-20', '21-30', '31-45', '45+'];

  // Password strength checks (must match Supabase policy)
  const pwdChecks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]/.test(password),
  };
  const pwdStrong = Object.values(pwdChecks).every(Boolean);
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;

  const steps = [
    { n: 1, t: 'Identifiants', sub: 'Email et mot de passe', icon: Lock },
    { n: 2, t: 'Profil', sub: 'Vos informations personnelles', icon: UserIcon },
    { n: 3, t: 'Paiements', sub: 'Votre moyen de retrait', icon: Wallet },
  ];

  const handleNextStep = async () => {
    setError('');

    if (step === 3) {
      // Final step: Create user in Supabase
      setLoading(true);
      try {
        // Generate referral code BEFORE signUp so it can be stored in user_metadata
        const referralCode = (name.substring(0, 3) + Math.floor(1000 + Math.random() * 9000)).toUpperCase().replace(/\s/g, '');

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Stocker toutes les données de profil dans user_metadata.
            // Elles seront utilisées pour créer le profil public lors de la
            // première connexion (cf. useUserData.ts auto-create fallback).
            data: {
              full_name: name,
              gender,
              city,
              ageRange,
              paymentMethod,
              momoNumber,
              referralCode,
            },
            emailRedirectTo: `${window.location.origin}/#/app?tab=dashboard`
          }
        });
        console.log("Supabase Auth signUp response:", { data, signUpErr });
        if (signUpErr) throw signUpErr;

        const user = data.user;

        // ✅ Quand "Enable email confirmations" est activé dans Supabase,
        // signUp() retourne intentionnellement { user: null, session: null }.
        // L'utilisateur EST créé dans auth.users mais le SDK ne le renvoie pas
        // tant que l'email n'est pas vérifié. Ce n'est PAS une erreur.
        if (!user) {
          // Email de confirmation envoyé → rediriger vers VerificationPending
          onComplete();
          return;
        }

        // ── Cas où email_confirmations est désactivé (user renvoyé immédiatement) ──
        const uid = user.id;

        // --- CREATE USER PROFILE ---
        // ⚠️ Colonnes réelles de la table (voir migration 20260702_create_users.sql)
        // gender, city, ageRange, paymentMethod, createdAt ne sont PAS dans le schéma → omis
        const { error: dbErr } = await supabase.from('users').insert({
          id: uid,
          name,
          email,
          momoNumber,
          role: 'AMBASSADOR',
          status: 'active',
          balance: 0,
          totalEarned: 0,
          clicks: 0,
          referralCode: referralCode,
          referralCount: 0,
          referralEarnings: 0,
        });
        if (dbErr) throw dbErr;

        // Send verification email via Supabase Edge Function (non-blocking)
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'verification',
              email,
              name
            }
          });
          console.log("Verification email sent via Edge Function");
        } catch (apiErr) {
          console.warn("Verification email via Edge Function failed:", apiErr);
        }

        // Redirect to verification pending page
        onComplete();
      } catch (err: any) {
        console.error("Registration error:", err);
        // Translate Supabase weak password error to French
        if (err.code === 'weak_password' || err.name === 'AuthWeakPasswordError') {
          setError('Mot de passe trop faible. Il doit contenir au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial (ex: Monpasse1!).');
        } else if (err.message?.includes('User already registered')) {
          setError('Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
        } else {
          setError(`Erreur: ${err.message || 'Une erreur est survenue lors de l\'inscription.'}`);
        }
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/app`
        }
      });
      if (err) throw err;
    } catch (err: any) {
      console.error("Google signup error:", err);
      setError('Impossible de s\'inscrire avec Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderProgress = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-indigo-600' : step > s ? 'w-8 bg-indigo-300' : 'w-8 bg-gray-200'
            }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      
      {/* LEFT PANEL — brand / progress */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] relative overflow-hidden flex-col justify-between p-10 xl:p-12 bg-[radial-gradient(1200px_circle_at_20%_15%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(900px_circle_at_85%_20%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(244,63,94,0.18),transparent_55%),linear-gradient(135deg,#05070f_0%,#0b1030_45%,#06152b_100%)]">
        <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-indigo-500/25 blur-3xl animate-auth-float" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 w-[420px] h-[420px] rounded-full bg-emerald-400/20 blur-3xl animate-auth-float2" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-[340px] h-[340px] rounded-full bg-rose-400/15 blur-3xl animate-auth-float" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.9)_1px,transparent_0)] [background-size:18px_18px]" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
            <Sparkles className="text-indigo-300" size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-white font-black text-lg font-display">Adwalet</p>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Programme Ambassadeur</p>
          </div>
        </div>

        {/* Headline + steps */}
        <div className="relative">
          <h1 className="text-4xl xl:text-[2.6rem] leading-[1.08] font-black text-white font-display">
            Recommandez.<br />
            <span className="text-emerald-300">Soyez payé.</span>
          </h1>
          <p className="mt-4 text-white/70 font-medium max-w-sm">
            Créez votre compte Ambassadeur en trois étapes rapides et commencez à gagner sur chaque parrainage.
          </p>

          <div className="mt-10 space-y-3">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.n;
              const isDone = step > s.n;
              return (
                <div
                  key={s.n}
                  className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${isActive ? 'bg-white/12 border-white/15' : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500/80 text-white' : isActive ? 'bg-indigo-500/80 text-white' : 'bg-white/10 text-white/60'
                        }`}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                    </div>
                    <div>
                      <p className="text-white font-black font-display leading-tight text-sm">{s.t}</p>
                      <p className="text-[11px] text-white/55 font-medium">{s.sub}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-200' : isDone ? 'text-emerald-300' : 'text-white/35'
                      }`}
                  >
                    {isActive ? 'En cours' : isDone ? 'OK' : `0${s.n}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-white/50 text-xs font-bold">
          <span>© 2026 Adwalet</span>
          <span className="uppercase tracking-widest">Togo</span>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 bg-white flex flex-col">
        <div className="flex justify-between items-center px-6 py-6 lg:px-14 lg:py-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="font-black text-gray-900 font-display">Adwalet</span>
          </div>
          <div className="hidden lg:block" />
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Accueil
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:px-14">
          <div className="w-full max-w-md">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-2">
              Étape {step} / 3
            </p>
            <h2 className="text-3xl font-black text-gray-900 leading-tight font-display">
              {step === 1 && "Créez votre compte"}
              {step === 2 && "Parlez-nous de vous"}
              {step === 3 && "Configurez vos paiements"}
            </h2>
            <p className="text-gray-500 font-medium mt-2 mb-8">
              {step === 1 && "Commencez avec votre email ou Google."}
              {step === 2 && "Ces informations restent privées."}
              {step === 3 && "Choisissez comment recevoir vos gains."}
            </p>

            {renderProgress()}

            <div className="space-y-5">
              {/* STEP 1: Email & Password */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <button
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {loading ? <Loader2 className="animate-spin text-gray-400" size={20} /> : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continuer avec Google
                      </>
                    )}
                  </button>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-black uppercase tracking-widest text-gray-400">Ou</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Adresse Email</span>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                        placeholder="jean@exemple.com"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Mot de passe</span>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Confirmer</span>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </label>
                  </div>

                  {/* Password strength indicator */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${pwdScore >= i
                              ? pwdScore <= 2 ? 'bg-red-400'
                                : pwdScore <= 3 ? 'bg-orange-400'
                                  : pwdScore <= 4 ? 'bg-yellow-400'
                                    : 'bg-emerald-500'
                              : 'bg-gray-200'
                            }`} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {[
                          { ok: pwdChecks.length, label: '8+ caractères' },
                          { ok: pwdChecks.lowercase, label: 'Minuscule (a-z)' },
                          { ok: pwdChecks.uppercase, label: 'Majuscule (A-Z)' },
                          { ok: pwdChecks.digit, label: 'Chiffre (0-9)' },
                          { ok: pwdChecks.special, label: 'Caractère spécial (!@#...)' },
                        ].map(({ ok, label }) => (
                          <span key={label} className={`text-[10px] font-bold flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                            <span>{ok ? '✓' : '○'}</span> {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
              )}

              {/* STEP 2: Profile Info */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nom & Prénoms complets</span>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                        placeholder="Jean-Pierre Koffi"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Sexe</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setGender('M')}
                          className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'M' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >Homme</button>
                        <button
                          onClick={() => setGender('F')}
                          className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'F' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >Femme</button>
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Tranche d'âge</span>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={ageRange}
                          onChange={(e) => setAgeRange(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all appearance-none"
                        >
                          <option value="">Choisir...</option>
                          {ageRanges.map(range => <option key={range} value={range}>{range} ans</option>)}
                        </select>
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Ville de résidence</span>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all appearance-none"
                      >
                        <option value="">Sélectionnez votre ville...</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 3: Payment Info */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 flex items-start gap-3">
                    <ShieldCheck className="text-indigo-600 shrink-0" size={22} />
                    <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                      Vos informations de paiement sont sécurisées. Vous pourrez les modifier à tout moment dans vos paramètres.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Moyen de paiement préféré</span>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setPaymentMethod('Mixx')}
                        className={`relative p-5 rounded-2xl border-2 transition-all text-left flex flex-row gap-3 overflow-hidden ${paymentMethod === 'Mixx' ? 'border-indigo-600 bg-indigo-50/50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden relative shadow-sm border border-white shrink-0">
                          <div className="absolute inset-0 bg-[#00338d] flex items-center justify-center">
                            <span className="text-yellow-400 font-black italic text-[11px] select-none">mixx</span>
                            <div className="absolute bottom-1 right-1 bg-yellow-400 w-3 h-3 rounded-full flex items-center justify-center text-[#00338d] font-black italic text-[5px]">TG</div>
                          </div>
                        </div>
                        <div>
                          <span className="font-black text-gray-900 block leading-tight text-sm">Mixx by YAS</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">YAS</span>
                        </div>
                        {paymentMethod === 'Mixx' && <CheckCircle2 className="absolute top-3 right-3 text-indigo-600" size={16} />}
                      </button>

                      <button
                        onClick={() => setPaymentMethod('Moov')}
                        className={`relative p-5 rounded-2xl border-2 transition-all text-left flex flex-row gap-3 overflow-hidden ${paymentMethod === 'Moov' ? 'border-indigo-600 bg-indigo-50/50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden relative shadow-sm border border-white shrink-0">
                          <div className="absolute inset-0 bg-[#0066cc] flex items-center justify-center">
                            <div className="bg-[#f37021] w-7 h-7 rotate-45 flex items-center justify-center shadow-lg border-2 border-white/20">
                              <div className="-rotate-45 text-[5px] text-white font-black text-center leading-[1.1] scale-90">MOOV<br />Money</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className="font-black text-gray-900 block leading-tight text-sm">Moov Africa</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Moov Money</span>
                        </div>
                        {paymentMethod === 'Moov' && <CheckCircle2 className="absolute top-3 right-3 text-indigo-600" size={16} />}
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Numéro Mobile Money pour les retraits</span>
                    <div className="relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                        placeholder="+228 90 00 00 00"
                      />
                    </div>
                  </label>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-4 bg-gray-50 border border-gray-200 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
              )}

              <button
                disabled={
                  loading ||
                  (step === 1 && (!email || !password || !pwdStrong || password !== confirmPassword)) ||
                  (step === 2 && (!name || !gender || !city || !ageRange)) ||
                  (step === 3 && (!paymentMethod || !momoNumber))
                }
                onClick={handleNextStep}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={22} /> : (
                  <>
                    {step === 3 ? "Finaliser l'inscription" : "Étape suivante"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="mt-8 text-center text-xs font-bold text-gray-500">
                  Déjà un compte ?{' '}
                  <button onClick={onGoToLogin} className="text-indigo-600 underline hover:text-indigo-800">
                    Se connecter
                  </button>
                </p>
                <p className="text-center text-[10px] text-gray-400 font-bold leading-relaxed px-4">
                  En continuant, vous acceptez nos <span className="text-indigo-600 underline cursor-pointer">Conditions Générales d'Utilisation</span> et notre <span className="text-indigo-600 underline cursor-pointer">Politique de Confidentialité</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;

// import React, { useState } from 'react';
// import { supabase } from '../supabase';
// import {
//   ArrowLeft,
//   ArrowRight,
//   Lock,
//   User as UserIcon,
//   MapPin,
//   Calendar,
//   Wallet,
//   CheckCircle2,
//   Loader2,
//   Check,
//   ShieldCheck,
//   X,
//   Mail,
//   AlertCircle
// } from 'lucide-react';

// interface RegistrationFormProps {
//   onComplete: () => void;
//   onCancel: () => void;
//   onGoToLogin: () => void;
// }

// const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete, onCancel, onGoToLogin }) => {
//   const [step, setStep] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   // Step 1 Data (Auth)
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   // Step 2 Data (Profile)
//   const [name, setName] = useState('');
//   const [gender, setGender] = useState<'M' | 'F' | ''>('');
//   const [city, setCity] = useState('');
//   const [ageRange, setAgeRange] = useState('');

//   // Step 3 Data (Payment)
//   const [paymentMethod, setPaymentMethod] = useState<'Mixx' | 'Moov' | ''>('');
//   const [momoNumber, setMomoNumber] = useState('');

//   const cities = ['Lomé', 'Kara', 'Sokodé', 'Kpalimé', 'Atakpamé', 'Dapaong', 'Autre'];
//   const ageRanges = ['15-20', '21-30', '31-45', '45+'];

//   // Password strength checks (must match Supabase policy)
//   const pwdChecks = {
//     length:    password.length >= 8,
//     lowercase: /[a-z]/.test(password),
//     uppercase: /[A-Z]/.test(password),
//     digit:     /[0-9]/.test(password),
//     special:   /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]/.test(password),
//   };
//   const pwdStrong = Object.values(pwdChecks).every(Boolean);
//   const pwdScore  = Object.values(pwdChecks).filter(Boolean).length;

//   const handleNextStep = async () => {
//     setError('');

//     if (step === 3) {
//       // Final step: Create user in Supabase
//       setLoading(true);
//       try {
//         // Generate referral code BEFORE signUp so it can be stored in user_metadata
//         const referralCode = (name.substring(0, 3) + Math.floor(1000 + Math.random() * 9000)).toUpperCase().replace(/\s/g, '');

//         const { data, error: signUpErr } = await supabase.auth.signUp({
//           email,
//           password,
//           options: {
//             // Stocker toutes les données de profil dans user_metadata.
//             // Elles seront utilisées pour créer le profil public lors de la
//             // première connexion (cf. useUserData.ts auto-create fallback).
//             data: {
//               full_name: name,
//               gender,
//               city,
//               ageRange,
//               paymentMethod,
//               momoNumber,
//               referralCode,
//             },
//             emailRedirectTo: `${window.location.origin}/#/app?tab=dashboard`
//           }
//         });
//         console.log("Supabase Auth signUp response:", { data, signUpErr });
//         if (signUpErr) throw signUpErr;

//         const user = data.user;

//         // ✅ Quand "Enable email confirmations" est activé dans Supabase,
//         // signUp() retourne intentionnellement { user: null, session: null }.
//         // L'utilisateur EST créé dans auth.users mais le SDK ne le renvoie pas
//         // tant que l'email n'est pas vérifié. Ce n'est PAS une erreur.
//         if (!user) {
//           // Email de confirmation envoyé → rediriger vers VerificationPending
//           onComplete();
//           return;
//         }

//         // ── Cas où email_confirmations est désactivé (user renvoyé immédiatement) ──
//         const uid = user.id;

//         // Generate a random referral code
//         // const referralCode = (name.substring(0, 3) + Math.floor(1000 + Math.random() * 9000)).toUpperCase().replace(/\s/g, '');

//         // --- CREATE USER PROFILE ---
//         // ⚠️ Colonnes réelles de la table (voir migration 20260702_create_users.sql)
//         // gender, city, ageRange, paymentMethod, createdAt ne sont PAS dans le schéma → omis
//         const { error: dbErr } = await supabase.from('users').insert({
//           id: uid,
//           name,
//           email,
//           momoNumber,
//           role: 'AMBASSADOR',
//           status: 'active',
//           balance: 0,
//           totalEarned: 0,
//           clicks: 0,
//           referralCode: referralCode,
//           referralCount: 0,
//           referralEarnings: 0,
//         });
//         if (dbErr) throw dbErr;


//         // Send verification email via Supabase Edge Function (non-blocking)
//         try {
//           await supabase.functions.invoke('send-email', {
//             body: {
//               type: 'verification',
//               email,
//               name
//             }
//           });
//           console.log("Verification email sent via Edge Function");
//         } catch (apiErr) {
//           console.warn("Verification email via Edge Function failed:", apiErr);
//         }

//         // Redirect to verification pending page
//         onComplete();
//       } catch (err: any) {
//         console.error("Registration error:", err);
//         // Translate Supabase weak password error to French
//         if (err.code === 'weak_password' || err.name === 'AuthWeakPasswordError') {
//           setError('Mot de passe trop faible. Il doit contenir au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial (ex: Monpasse1!).');
//         } else if (err.message?.includes('User already registered')) {
//           setError('Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
//         } else {
//           setError(`Erreur: ${err.message || 'Une erreur est survenue lors de l\'inscription.'}`);
//         }
//         setLoading(false);
//       }
//     } else {
//       setStep(step + 1);
//     }
//   };


//   const handleGoogleSignup = async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const { error: err } = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo: `${window.location.origin}/#/app`
//         }
//       });
//       if (err) throw err;
//     } catch (err: any) {
//       console.error("Google signup error:", err);
//       setError('Impossible de s\'inscrire avec Google: ' + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePrevStep = () => {
//     if (step > 1) setStep(step - 1);
//   };

//   const renderProgress = () => (
//     <div className="flex items-center justify-between mb-8 max-w-xs mx-auto">
//       {[1, 2, 3].map((s) => (
//         <div key={s} className="flex items-center">
//           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'
//             }`}>
//             {step > s ? <Check size={18} /> : s}
//           </div>
//           {s < 3 && (
//             <div className={`w-12 h-1 ml-1 transition-all rounded-full ${step > s ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
//           )}
//         </div>
//       ))}
//     </div>
//   );

//   return (
//     <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(1200px_circle_at_20%_15%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(900px_circle_at_85%_20%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(244,63,94,0.18),transparent_55%),linear-gradient(135deg,#05070f_0%,#0b1030_45%,#06152b_100%)] selection:bg-indigo-200/40 selection:text-white">
//       <div className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-indigo-500/25 blur-3xl animate-auth-float" />
//       <div className="pointer-events-none absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full bg-emerald-400/20 blur-3xl animate-auth-float2" />
//       <div className="pointer-events-none absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-rose-400/15 blur-3xl animate-auth-float" />

//       <div className="min-h-screen flex items-center justify-center p-6">
//         <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-stretch">
//           <div className="hidden lg:flex flex-col justify-between rounded-[2.75rem] p-6 border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] relative overflow-hidden">
//             <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.9)_1px,transparent_0)] [background-size:18px_18px]" />
//             <div className="relative">
//               <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 border border-white/10 text-white/80 text-xs font-black uppercase tracking-widest">
//                 <span className="w-2 h-2 rounded-full bg-indigo-300" />
//                 Inscription Ambassadeur
//               </div>
//               <h1 className="mt-6 text-4xl leading-[1.05] font-black text-white font-display">
//                 Votre profil. Vos paiements. En quelques minutes.
//               </h1>
//               <p className="mt-4 text-white/70 font-medium max-w-md">
//                 Un onboarding simple: identifiants, profil, puis configuration des paiements.
//               </p>

//               <div className="mt-8 space-y-3">
//                 {[
//                   { n: 1, t: 'Identifiants' },
//                   { n: 2, t: 'Profil' },
//                   { n: 3, t: 'Paiements' }
//                 ].map((s) => (
//                   <div
//                     key={s.n}
//                     className={`flex items-center justify-between rounded-3xl p-5 border transition-all ${step === s.n ? 'bg-white/12 border-white/15' : 'bg-white/6 border-white/10'
//                       }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${step >= s.n ? 'bg-indigo-500/80 text-white' : 'bg-white/10 text-white/70'
//                         }`}>
//                         {s.n}
//                       </div>
//                       <div>
//                         <p className="text-white font-black font-display leading-tight">{s.t}</p>
//                         <p className="text-xs text-white/65 font-medium">
//                           {s.n === 1 ? 'Email + mot de passe' : s.n === 2 ? 'Infos personnelles' : 'Moyen de retrait'}
//                         </p>
//                       </div>
//                     </div>
//                     <div className={`text-[10px] font-black uppercase tracking-widest ${step === s.n ? 'text-white/80' : 'text-white/40'
//                       }`}>
//                       {step === s.n ? 'En cours' : step > s.n ? 'OK' : 'A faire'}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div className="relative flex items-center justify-between text-white/60 text-xs font-bold">
//               <span>Secured by Adwalet</span>
//               <span className="uppercase tracking-widest">TOGO</span>
//             </div>
//           </div>

//           <div className="flex items-center">
//             <div className="w-full max-w-xl bg-white/85 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-white/40 p-8 md:p-8 relative overflow-hidden animate-in zoom-in-95 duration-500">

//               <button
//                 onClick={onCancel}
//                 className="absolute top-8 right-8 p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
//               >
//                 <X size={20} />
//               </button>

//               <div className="text-center mb-4">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inscription</p>
//                 <h2 className="mt-2 text-3xl font-black text-gray-900 leading-tight font-display">Inscription Ambassadeur</h2>
//                 <p className="text-gray-500 font-medium mt-2">
//                   {step === 1 && "Identifiants de connexion"}
//                   {step === 2 && "Votre profil personnel"}
//                   {step === 3 && "Configuration des paiements"}
//                 </p>
//               </div>

//               {renderProgress()}

//               <div className="space-y-2">
//                 {/* STEP 1: Email & Password */}
//                 {step === 1 && (
//                   <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <button
//                       onClick={handleGoogleSignup}
//                       disabled={loading}
//                       className="w-full py-4 bg-slate-300 border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 active:scale-95"
//                     >
//                       {loading ? <Loader2 className="animate-spin text-gray-400" size={20} /> : (
//                         <>
//                           <svg className="w-5 h-5" viewBox="0 0 24 24">
//                             <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
//                             <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
//                             <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
//                             <path d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
//                           </svg>
//                           S'inscrire avec Google
//                         </>
//                       )}
//                     </button>

//                     <div className="relative flex py-1 items-center">
//                       <div className="flex-grow border-t border-slate-300"></div>
//                       <span className="flex-shrink-0 mx-4 text-xs font-black uppercase tracking-widest">OU</span>
//                       <div className="flex-grow border-t border-slate-300"></div>
//                     </div>

//                     <label className="block">
//                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Adresse Email</span>
//                       <div className="relative">
//                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
//                         <input
//                           type="email"
//                           value={email}
//                           onChange={(e) => setEmail(e.target.value)}
//                           className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white"
//                           placeholder="jean@exemple.com"
//                         />
//                       </div>
//                     </label>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <label className="block">
//                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Mot de passe</span>
//                         <div className="relative">
//                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
//                           <input
//                             type="password"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white"
//                             placeholder="••••••••"
//                           />
//                         </div>
//                       </label>
//                       <label className="block">
//                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Confirmer</span>
//                         <div className="relative">
//                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
//                           <input
//                             type="password"
//                             value={confirmPassword}
//                             onChange={(e) => setConfirmPassword(e.target.value)}
//                             className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white"
//                             placeholder="••••••••"
//                           />
//                         </div>
//                       </label>
//                     </div>

//                     {/* Password strength indicator */}
//                     {password && (
//                       <div className="space-y-2">
//                         <div className="flex gap-1">
//                           {[1,2,3,4,5].map(i => (
//                             <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
//                               pwdScore >= i
//                                 ? pwdScore <= 2 ? 'bg-red-400'
//                                   : pwdScore <= 3 ? 'bg-orange-400'
//                                   : pwdScore <= 4 ? 'bg-yellow-400'
//                                   : 'bg-green-500'
//                                 : 'bg-gray-200'
//                             }`} />
//                           ))}
//                         </div>
//                         <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
//                           {[
//                             { ok: pwdChecks.length,    label: '8+ caractères' },
//                             { ok: pwdChecks.lowercase, label: 'Minuscule (a-z)' },
//                             { ok: pwdChecks.uppercase, label: 'Majuscule (A-Z)' },
//                             { ok: pwdChecks.digit,     label: 'Chiffre (0-9)' },
//                             { ok: pwdChecks.special,   label: 'Caractère spécial (!@#...)' },
//                           ].map(({ ok, label }) => (
//                             <span key={label} className={`text-[10px] font-bold flex items-center gap-1 ${ ok ? 'text-green-600' : 'text-gray-400' }`}>
//                               <span>{ok ? '✓' : '○'}</span> {label}
//                             </span>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                     {password && confirmPassword && password !== confirmPassword && (
//                       <p className="text-[10px] text-red-500 font-bold ml-1">Les mots de passe ne correspondent pas.</p>
//                     )}
//                   </div>
//                 )}

//                 {/* STEP 2: Profile Info */}
//                 {step === 2 && (
//                   <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <label className="block">
//                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nom & Prénoms complets</span>
//                       <div className="relative">
//                         <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
//                         <input
//                           type="text"
//                           value={name}
//                           onChange={(e) => setName(e.target.value)}
//                           className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white"
//                           placeholder="Jean-Pierre Koffi"
//                         />
//                       </div>
//                     </label>

//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Sexe</span>
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => setGender('M')}
//                             className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'M' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white'}`}
//                           >Homme</button>
//                           <button
//                             onClick={() => setGender('F')}
//                             className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'F' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white'}`}
//                           >Femme</button>
//                         </div>
//                       </div>

//                       <label className="block">
//                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Tranche d'âge</span>
//                         <div className="relative">
//                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
//                           <select
//                             value={ageRange}
//                             onChange={(e) => setAgeRange(e.target.value)}
//                             className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white appearance-none"
//                           >
//                             <option value="">Choisir...</option>
//                             {ageRanges.map(range => <option key={range} value={range}>{range} ans</option>)}
//                           </select>
//                         </div>
//                       </label>
//                     </div>

//                     <label className="block">
//                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Ville de résidence</span>
//                       <div className="relative">
//                         <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
//                         <select
//                           value={city}
//                           onChange={(e) => setCity(e.target.value)}
//                           className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white appearance-none"
//                         >
//                           <option value="">Sélectionnez votre ville...</option>
//                           {cities.map(c => <option key={c} value={c}>{c}</option>)}
//                         </select>
//                       </div>
//                     </label>
//                   </div>
//                 )}

//                 {/* STEP 3: Payment Info */}
//                 {step === 3 && (
//                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
//                       <ShieldCheck className="text-indigo-600 shrink-0" size={24} />
//                       <p className="text-xs text-indigo-900 font-medium leading-relaxed">
//                         Vos informations de paiement sont sécurisées. Vous pourrez les modifier à tout moment dans vos paramètres.
//                       </p>
//                     </div>

//                     <div className="space-y-3">
//                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Moyen de paiement préféré</span>
//                       <div className="grid grid-cols-2 gap-4">
//                         <button
//                           onClick={() => setPaymentMethod('Mixx')}
//                           className={`relative p-6 rounded-[2rem] border-2 transition-all text-left flex flex-row gap-4 overflow-hidden ${paymentMethod === 'Mixx' ? 'border-indigo-600 bg-indigo-50/50' : 'bg-gray-50 border-gray-50 hover:bg-white'}`}
//                         >
//                           <div className="w-12 h-12 rounded-xl overflow-hidden relative shadow-sm border border-white">
//                             <div className="absolute inset-0 bg-[#00338d] flex items-center justify-center">
//                               <span className="text-yellow-400 font-black italic text-[11px] select-none">mixx</span>
//                               <div className="absolute bottom-1 right-1 bg-yellow-400 w-3 h-3 rounded-full flex items-center justify-center text-[#00338d] font-black italic text-[5px]">TG</div>
//                             </div>
//                           </div>
//                           <div>
//                             <span className="font-black text-gray-900 block leading-tight">Mixx by YAS</span>
//                             <span className="text-[10px] text-gray-400 font-bold uppercase">YAS</span>
//                           </div>
//                           {paymentMethod === 'Mixx' && <CheckCircle2 className="absolute top-4 right-4 text-indigo-600" size={18} />}
//                         </button>

//                         <button
//                           onClick={() => setPaymentMethod('Moov')}
//                           className={`relative p-6 rounded-[2rem] border-2 transition-all text-left flex flex-row gap-4 overflow-hidden ${paymentMethod === 'Moov' ? 'border-indigo-600 bg-indigo-50/50' : 'bg-gray-50 border-gray-50 hover:bg-white'}`}
//                         >
//                           <div className="w-12 h-12 rounded-xl overflow-hidden relative shadow-sm border border-white">
//                             <div className="absolute inset-0 bg-[#0066cc] flex items-center justify-center">
//                               <div className="bg-[#f37021] w-8 h-8 rotate-45 flex items-center justify-center shadow-lg border-2 border-white/20">
//                                 <div className="-rotate-45 text-[5px] text-white font-black text-center leading-[1.1] scale-90">MOOV<br />Money</div>
//                               </div>
//                             </div>
//                           </div>
//                           <div>
//                             <span className="font-black text-gray-900 block leading-tight">Moov Africa</span>
//                             <span className="text-[10px] text-gray-400 font-bold uppercase">Moov Money</span>
//                           </div>
//                           {paymentMethod === 'Moov' && <CheckCircle2 className="absolute top-4 right-4 text-indigo-600" size={18} />}
//                         </button>
//                       </div>
//                     </div>

//                     <label className="block">
//                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Numéro Mobile Money pour les retraits</span>
//                       <div className="relative">
//                         <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
//                         <input
//                           type="tel"
//                           value={momoNumber}
//                           onChange={(e) => setMomoNumber(e.target.value)}
//                           className="w-full bg-slate-300 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white"
//                           placeholder="+228 90 00 00 00"
//                         />
//                       </div>
//                     </label>
//                   </div>
//                 )}
//               </div>

//               {error && (
//                 <div className="mt-6 flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
//                   <AlertCircle size={18} className="shrink-0" />
//                   <p className="text-xs font-bold">{error}</p>
//                 </div>
//               )}

//               <div className="mt-10 flex gap-4">
//                 {step > 1 && (
//                   <button
//                     onClick={handlePrevStep}
//                     className="px-6 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
//                   >
//                     <ArrowLeft size={20} />
//                   </button>
//                 )}

//                 <button
//                   disabled={
//                     loading ||
//                     (step === 1 && (!email || !password || !pwdStrong || password !== confirmPassword)) ||
//                     (step === 2 && (!name || !gender || !city || !ageRange)) ||
//                     (step === 3 && (!paymentMethod || !momoNumber))
//                   }
//                   onClick={handleNextStep}
//                   className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:shadow-none disabled:cursor-not-allowed"
//                 >
//                   {loading ? <Loader2 className="animate-spin" size={24} /> : (
//                     <>
//                       {step === 3 ? "Finaliser l'inscription" : "Étape suivante"}
//                       <ArrowRight size={20} />
//                     </>
//                   )}
//                 </button>
//               </div>

//               {step === 1 && (
//                 <div className="space-y-4">
//                   <p className="mt-8 text-center text-xs font-bold text-gray-500">
//                     Déjà un compte ?{' '}
//                     <button onClick={onGoToLogin} className="text-indigo-600 underline hover:text-indigo-800">
//                       Se connecter
//                     </button>
//                   </p>
//                   <p className="text-center text-[10px] text-gray-400 font-bold leading-relaxed px-4">
//                     En continuant, vous acceptez nos <span className="text-indigo-600 underline cursor-pointer">Conditions Générales d'Utilisation</span> et notre <span className="text-indigo-600 underline cursor-pointer">Politique de Confidentialité</span>.
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RegistrationForm;
