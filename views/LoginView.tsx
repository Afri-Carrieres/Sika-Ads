import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, Loader2, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';


interface LoginViewProps {
  onSuccess: () => void;
  onGoBack: () => void;
  onGoToRegister: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onGoBack, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      });
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
        options: {
          redirectTo: `${window.location.origin}/#/app`
        }
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
        redirectTo: `${window.location.origin}/?mode=resetPassword`
      });
      if (apiErr) throw apiErr;
      setResetSuccess("Email de réinitialisation envoyé. Vérifiez votre boîte mail.");
    } catch (apiErr: any) {
      console.error('Password reset error:', apiErr);
      setResetError("Impossible d'envoyer l'email de réinitialisation: " + apiErr.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(1200px_circle_at_20%_15%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(900px_circle_at_85%_20%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(244,63,94,0.18),transparent_55%),linear-gradient(135deg,#05070f_0%,#0b1030_45%,#06152b_100%)] selection:bg-indigo-200/40 selection:text-white">
      <div className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-indigo-500/25 blur-3xl animate-auth-float" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full bg-emerald-400/20 blur-3xl animate-auth-float2" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-rose-400/15 blur-3xl animate-auth-float" />

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="hidden lg:flex flex-col justify-between rounded-[2.75rem] p-10 border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.45)] relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.9)_1px,transparent_0)] [background-size:18px_18px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 border border-white/10 text-white/80 text-xs font-black uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                SikaAds
              </div>
              <h1 className="mt-6 text-4xl leading-[1.05] font-black text-white font-display">
                Connectez-vous. Lancez des campagnes. Suivez les flux.
              </h1>
              <p className="mt-4 text-white/70 font-medium max-w-md">
                Une interface rapide et claire pour garder retraits, preuves et campagnes sous controle.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-3xl p-5 bg-white/7 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Signal</p>
                  <p className="mt-2 text-2xl font-black text-white font-display">Temps reel</p>
                  <p className="mt-2 text-xs text-white/65 font-medium">Recevez des mails et des notifications instantanées.</p>
                </div>
                <div className="rounded-3xl p-5 bg-white/7 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Decision</p>
                  <p className="mt-2 text-2xl font-black text-white font-display">1 clic</p>
                  <p className="mt-2 text-xs text-white/65 font-medium">Valider ou rejeter sans friction.</p>
                </div>
              </div>

              <div className="mt-5 rounded-[2.25rem] p-6 bg-gradient-to-br from-white/12 to-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-white/70">Apercu</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="w-2 h-2 rounded-full bg-amber-300" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="mt-4 h-20 rounded-2xl bg-black/30 border border-white/10 overflow-hidden relative">
                  <svg viewBox="0 0 400 80" className="w-full h-full opacity-90">
                    <defs>
                      <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#60a5fa" />
                        <stop offset="0.5" stopColor="#34d399" />
                        <stop offset="1" stopColor="#fb7185" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,55 C55,20 95,72 140,44 C175,22 205,36 240,28 C290,16 318,58 400,22"
                      fill="none"
                      stroke="url(#spark)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="auth-shimmer absolute inset-0" />
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-between text-white/60 text-xs font-bold">
              <span>Secured by Adwalet</span>
              <span className="uppercase tracking-widest">TOGO</span>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full bg-white/85 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-white/40 p-8 md:p-12 relative overflow-hidden animate-in zoom-in-95 duration-500">
              <button
                onClick={onGoBack}
                className="absolute top-6 left-6 p-2.5 rounded-2xl bg-black/5 text-gray-500 hover:text-gray-800 hover:bg-black/10 transition-all"
                title="Retour"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="text-center mb-10 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Connexion</p>
                <h2 className="mt-2 text-3xl md:text-4xl font-black text-gray-900 leading-tight font-display">
                  Reprendre la main.
                </h2>
                <p className="text-gray-600 font-medium mt-2">Accedez a votre espace ambassadeur.</p>
              </div>

              <div className="space-y-6">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  type="button"
                  className="w-full py-4 bg-slate-300 border border-gray-200 text-gray-800 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin text-gray-400" size={20} />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continuer avec Google
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-200/80"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-black uppercase tracking-widest">
                    OU
                  </span>
                  <div className="flex-grow border-t border-gray-200/80"></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">
                      Adresse Email
                    </span>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-300 border border-gray-300 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                        placeholder="jean@exemple.com"
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">
                      Mot de passe
                    </span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-300 border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                  </label>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleOpenReset}
                      className="text-xs font-black text-indigo-700 hover:text-indigo-900 underline underline-offset-4"
                    >
                      Mot de passe oublie ?
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                      <AlertCircle size={18} className="shrink-0" />
                      <p className="text-xs font-bold">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative overflow-hidden py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200/50 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight size={20} />
                      </>
                    )}
                    <span className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(500px_circle_at_30%_10%,rgba(255,255,255,0.20),transparent_60%)]" />
                  </button>
                </form>
              </div>

              <p className="mt-8 text-center text-xs font-bold text-gray-600">
                Pas encore de compte ?{' '}
                <button onClick={onGoToRegister} className="text-indigo-700 underline hover:text-indigo-900">
                  S'inscrire
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResetOpen(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/60">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Reinitialisation</p>
              <h3 className="mt-1 text-xl font-black text-gray-900 font-display">Modifier votre mot de passe</h3>
              <p className="mt-2 text-xs text-gray-600 font-medium">
                Entrez votre email. Un lien de reinitialisation sera envoye.
              </p>
            </div>
            <form onSubmit={handleSendReset} className="p-6 space-y-4">
              <label className="block">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Email</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all"
                    placeholder="jean@exemple.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              {resetError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">{resetError}</p>
                </div>
              )}
              {resetSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold">{resetSuccess}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-700 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={18} /> : 'Envoyer le lien'}
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
