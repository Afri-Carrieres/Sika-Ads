import React, { useState } from 'react';
import { supabase } from '../supabase';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Speaker,
  SpeakerIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface LoginViewProps {
  onSuccess: () => void;
  onGoBack: () => void;
  onGoToRegister: () => void;
}

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onGoBack, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app` },
      });
      if (err) throw err;
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Impossible de se connecter avec Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReset = () => {
    setResetError('');
    setResetSuccess('');
    setResetEmail((email || '').trim());
    setResetOpen(true);
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (resetEmail || '').trim();
    if (!targetEmail) {
      setResetError('Veuillez entrer votre adresse email.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const { error: apiErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/?mode=resetPassword`,
      });
      if (apiErr) throw apiErr;
      setResetSuccess('Email de réinitialisation envoyé. Vérifiez votre boîte mail.');
    } catch (apiErr: any) {
      console.error('Password reset error:', apiErr);
      setResetError("Impossible d'envoyer l'email de réinitialisation: " + apiErr.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 selection:bg-[#f55d05] selection:text-slate-950">
      <div className="min-h-screen lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden min-h-screen flex-col justify-between overflow-hidden bg-[#062127] px-10 py-10 text-white lg:flex xl:px-14">
          <div>
            <div className="flex justify-start place-items-start">
              <button onClick={onGoBack} className="inline-flex items-center gap-3" aria-label="Retour à l'accueil">
                <img src="/Header-LogoSika-Ads.png" alt="SikaAds" className="w-44 h-auto object-contain" />
              </button>
            </div>

            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl xl:text-[2.6rem] leading-[1.08] font-bold text-white font-display">
                Monétisez vos statuts,<br />
                <span className="text-[#128785]">pilotez vos gains.</span>
              </h1>
              <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-slate-300">
                Retrouvez vos campagnes, vos preuves et vos retraits dans un espace clair, rapide et sécurisé.
              </p>
            </div>

            <div className="mt-10 space-y-6">
              {[
                { icon: Megaphone, title: 'Campagnes disponibles', desc: 'Choisissez les annonces adaptées à votre audience.' },
                { icon: TrendingUp, title: 'Suivi transparent', desc: 'Gardez un oeil sur les vues, preuves et validations.' },
                { icon: Wallet, title: 'Retraits Mobile Money', desc: 'Recevez vos gains sur Mixx by YAS ou Moov Money.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-300/10 text-teal-300">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="mt-1 text-sm font-medium text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>© 2026 SikaAds</span>
            {/* <span>Plateforme sécurisée</span> */}
          </div>
        </aside>

        <main className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <button onClick={onGoBack} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-900">
              <ArrowLeft size={17} />
              Accueil
            </button>
            <img src="/Header-LogoSika-Ads.png" alt="SikaAds" className="w-36 h-auto object-contain lg:hidden" />
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Bon retour</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                Connectez-vous pour gérer vos campagnes, vos preuves et vos retraits.
              </p>
            </div>

            <button onClick={handleGoogleLogin} disabled={loading} type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? <Loader2 className="animate-spin text-slate-400" size={20} /> : <GoogleIcon />}
              Continuer avec Google
            </button>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Adresse e-mail</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pl-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100" placeholder="vous@email.com" autoComplete="email" />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Mot de passe</span>
                  <button type="button" onClick={handleOpenReset} className="text-xs font-bold text-[#128785] transition hover:text-teal-700">Mot de passe oublié ?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100" placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-bold leading-5">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#f55d05] text-sm font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-[#f56505e3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" size={22} /> : 'Se connecter'}
              </button>
            </form>

            <p className="mt-7 text-center text-sm font-medium text-slate-500">
              Pas encore de compte ?{' '}
              <button onClick={onGoToRegister} className="font-bold text-teal-700 transition hover:text-teal-900">Inscrivez-vous</button>
            </p>
          </div>
        </main>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setResetOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-slate-50 p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <ShieldCheck size={21} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Réinitialisation</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-950">Modifier votre mot de passe</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Entrez votre email. Un lien de réinitialisation vous sera envoyé.</p>
            </div>
            <form onSubmit={handleSendReset} className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Email</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pl-12 text-sm font-bold text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100" placeholder="vous@email.com" autoComplete="email" />
                </div>
              </label>

              {resetError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-bold leading-5">{resetError}</p>
                </div>
              )}
              {resetSuccess && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-800">{resetSuccess}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResetOpen(false)} className="h-12 flex-1 rounded-xl bg-slate-100 text-xs font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-200">Annuler</button>
                <button type="submit" disabled={resetLoading} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f55d05] text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#f55d05] disabled:cursor-not-allowed disabled:opacity-70">
                  {resetLoading ? <Loader2 className="animate-spin" size={18} /> : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
