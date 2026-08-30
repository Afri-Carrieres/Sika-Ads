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
  Landmark,
  EyeOff,
  Eye
} from 'lucide-react';


interface RegistrationFormProps {
  onComplete: () => void;
  onCancel: () => void;
  onGoToLogin: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({onComplete, onCancel, onGoToLogin }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);


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
  const ageRanges = ['18-20', '21-30', '31-45', '45+'];

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
            emailRedirectTo: `${window.location.origin}/app?tab=dashboard`
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
          redirectTo: `${window.location.origin}/app`
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
          className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-[#f55d05]' : step > s ? 'w-8 bg-[#128785]' : 'w-8 bg-gray-200'
            }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[0.75fr_1.05fr]">
      
      {/* LEFT PANEL — brand / progress */}
      <div className="hidden flex-col justify-between overflow-hidden bg-[#0F172A] px-10 py-6 text-white lg:flex xl:px-14">

        {/* Logo */}
        <div className="flex justify-start place-items-start">
          <button onClick={onCancel} className="inline-flex items-center" aria-label="Retour à l'accueil">
            <img src="/Header-LogoSika-Ads.png" alt="SikaAds" className="w-44 h-auto object-contain" />
          </button>
        </div>

        {/* Headline + steps */}
        <div className="relative min-w-x">
          <h1 className="text-4xl xl:text-[2.6rem] leading-[1.08] font-black text-white font-display">
            Partagez !<br />
            <span className="text-[#128785]">Soyez payé.</span>
          </h1>
          <p className="mt-4 text-white/70 font-medium max-w-sm">
            Créez votre compte Ambassadeur en trois étapes rapides et commencez à gagner grâce à vos vues.
          </p>

          <div className="mt-10 space-y-3">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.n;
              const isDone = step > s.n;
              return (
                <div
                  key={s.n}
                  className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${isActive ? 'bg-white/12 border-[#f55d05]' : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500/80 text-white' : isActive ? 'bg-[#f55d05] text-white ' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-300/10 text-teal-300'
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
                    className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#f55d05]' : isDone ? 'text-emerald-300' : 'text-white/35'
                      }`}
                  >
                    {isActive ? 'En cours' : isDone ? 'OK' : `0${s.n}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 relative text-white/50 text-xs font-bold">
          <span>© 2026 SikaAds</span>
          {/* <span className="uppercase tracking-widest">Togo</span> */}
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 bg-white flex flex-col">
        <div className="flex justify-between items-center px-6 py-6 lg:px-14 lg:py-8">
          {/* Mobile logo */}
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Accueil
          </button>
          <div className="flex lg:hidden items-center gap-2">
            <button onClick={onCancel} className="inline-flex items-center gap-3" aria-label="Retour à l'accueil">
              <img src="/Header-LogoSika-Ads.png" alt="SikaAds" className="w-36 h-auto object-contain" />
            </button>
          </div>
          <div className="hidden lg:block" />
          
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:px-14">
          <div className="w-full max-w-md">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#f55d05] mb-2">
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
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all"
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
                          type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} 
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Confirmer</span>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all"
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all"
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
                          className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'M' ? 'bg-[#f55d05] text-white border-[#f56505e3] shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >Homme</button>
                        <button
                          onClick={() => setGender('F')}
                          className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${gender === 'F' ? 'bg-[#f55d05] text-white border-[#f56505e3] shadow-lg shadow-indigo-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
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
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all appearance-none"
                        >
                          <option value="">Choisir...</option>
                          {ageRanges.map(range => <option key={range} value={range}>{range} ans</option>)}
                        </select>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 ml-1">Vous devez avoir au moins 18 ans pour vous inscrire, conformément aux CGU.</p>
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
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all appearance-none"
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
                        className={`relative p-5 rounded-2xl border-2 transition-all text-left flex flex-row gap-3 overflow-hidden ${paymentMethod === 'Mixx' ? 'border-[#f55d05] bg-indigo-50/50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
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
                        {paymentMethod === 'Mixx' && <CheckCircle2 className="absolute top-3 right-3 text-[#f55d05]" size={16} />}
                      </button>

                      <button
                        onClick={() => setPaymentMethod('Moov')}
                        className={`relative p-5 rounded-2xl border-2 transition-all text-left flex flex-row gap-3 overflow-hidden ${paymentMethod === 'Moov' ? 'border-[#f55d05] bg-indigo-50/50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
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
                        {paymentMethod === 'Moov' && <CheckCircle2 className="absolute top-3 right-3 text-[#f55d05]" size={16} />}
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
                        className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-[#f55d05] focus:border-[#f55d05] outline-none font-bold text-gray-900 transition-all"
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
                className="flex-1 py-4 bg-[#f55d05] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-200 hover:bg-[#f56505e3] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
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
                  <button onClick={onGoToLogin} className="text-[#128785] underline hover:text-{#128785}">
                    Se connecter
                  </button>
                </p>
                <p className="text-center text-[10px] text-gray-400 font-bold leading-relaxed px-4">
                  En continuant, vous acceptez nos <span className="text-[#128785] underline cursor-pointer">Conditions Générales d'Utilisation</span> et notre <span className="text-[#128785] underline cursor-pointer">Politique de Confidentialité</span>.
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
