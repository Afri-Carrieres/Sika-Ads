import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import LandingLogo from '@/public/Header-LogoSika-Ads.png';

interface ResetPasswordViewProps {
  onSuccess: () => void;
  onBackToLogin: () => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onSuccess, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const init = async () => {
      // ─── Cas 1 : HashRouter double-hash  #/#access_token=...&type=recovery ───
      // Supabase + HashRouter génèrent une URL comme :
      //   /?mode=resetPassword#/#access_token=xxx&refresh_token=yyy&type=recovery
      // window.location.hash vaut "#/#access_token=xxx..."
      // On cherche le 2ème '#' pour extraire les params Supabase
      const fullHash = window.location.hash; // ex : "#/#access_token=...&type=recovery"
      const secondHash = fullHash.indexOf('#', 1);
      const tokenFragment = secondHash !== -1
        ? fullHash.substring(secondHash + 1)   // "access_token=...&type=recovery"
        : fullHash.substring(1);               // fallback : hash simple sans '/'

      const params = new URLSearchParams(tokenFragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (access_token && refresh_token && type === 'recovery') {
        // On établit la session manuellement avec les tokens extraits
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          setError("Le lien de réinitialisation est invalide ou a expiré.");
          setVerifying(false);
          return;
        }

        if (data.session?.user) {
          setEmail(data.session.user.email || '');
          // Nettoyer l'URL (retirer les tokens du hash pour sécurité)
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setVerifying(false);
          return;
        }
      }

      // ─── Cas 2 : Session déjà active (token déjà échangé avant ce composant) ───
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || '');
        setVerifying(false);
        return;
      }

      // ─── Cas 3 : Attendre PASSWORD_RECOVERY via onAuthStateChange ───
      // (cas où Supabase détecte le token tout seul dans un hash simple)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (session?.user) {
            setEmail(session.user.email || '');
            clearTimeout(timeoutId);
            setVerifying(false);
          }
        }
      });

      // Timeout de sécurité : 6 secondes, puis message d'erreur
      timeoutId = setTimeout(() => {
        setVerifying((prev) => {
          if (prev) {
            setError("Le lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.");
            return false;
          }
          return prev;
        });
        subscription.unsubscribe();
      }, 6000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeoutId);
      };
    };

    init();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || "Une erreur est survenue lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-white text-slate-950 selection:bg-[#f55d05] selection:text-slate-950">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <img src={LandingLogo} alt="SikaAds" className="mb-8 w-56 object-contain" />
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-[#128785]">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Sécurité</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Vérification de la session</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">Nous validons votre lien de réinitialisation. Cela ne prendra qu’un instant.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-950 selection:bg-[#f55d05] selection:text-slate-950">
      <div className="min-h-screen lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden min-h-screen flex-col justify-between overflow-hidden bg-[#0F172A] px-10 py-10 text-white lg:flex xl:px-14">
          <div>
            <img src={LandingLogo} alt="SikaAds" className="w-[320px] object-contain" />
            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl font-black leading-[1.02] tracking-tight xl:text-5xl">
                Réinitialisez votre accès <span className="text-[#128785]">en toute sécurité.</span>
              </h1>
              <p className="mt-6 max-w-md text-base font-medium leading-8 text-slate-300">
                Choisissez un nouveau mot de passe pour reprendre l’accès à vos campagnes, preuves et gains SikaAds.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>© 2026 SikaAds Togo</span>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <button onClick={onBackToLogin} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-900">
              <ArrowLeft size={17} />
              Retour
            </button>
            <img src={LandingLogo} alt="SikaAds" className="w-60 object-contain lg:hidden" />
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-[#128785] shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Nouveau mot de passe</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                {email ? `Réinitialisation pour ${email}` : 'Choisissez un mot de passe robuste pour sécuriser votre compte.'}
              </p>
            </div>

            {success ? (
              <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950">Succès !</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Votre mot de passe a été modifié avec succès.</p>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Redirection vers la connexion dans quelques secondes...</p>
                <button
                  onClick={onBackToLogin}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#f55d05] text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-[#f56505e3] active:scale-[0.99]"
                >
                  Retourner à la connexion
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-600">Nouveau mot de passe</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pl-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-600">Confirmer le mot de passe</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pl-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="text-xs font-bold leading-5">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!!error && !email)}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#f55d05] text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:bg-[#f56505e3] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : <>
                    Changer mon mot de passe
                    <ArrowRight size={18} />
                  </>}
                </button>

                <p className="text-center text-sm font-medium text-slate-500">
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <button type="button" onClick={onBackToLogin} className="font-black text-[#128785] transition hover:text-teal-700">
                    Retourner à la connexion
                  </button>
                </p>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResetPasswordView;
