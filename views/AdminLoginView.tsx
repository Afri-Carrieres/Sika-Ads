import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface AdminLoginViewProps {
  onSuccess: () => void;
  onGoBack: () => void;
}

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onSuccess, onGoBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const MAX_ATTEMPTS = 3;
  const LOCKOUT_MS = 120_000;

  const isLockedOut = (): boolean => {
    if (!lockoutUntil) return false;
    if (Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setAttempts(0);
      return false;
    }
    return true;
  };

  const verifyStaffRole = async (): Promise<boolean> => {
    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !profile) return false;

      return profile.role === 'ADMIN' || profile.role === 'MODERATOR';
    } catch {
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut()) {
      const remaining = Math.ceil(((lockoutUntil || 0) - Date.now()) / 1000);
      setError(`Trop de tentatives. Reessayez dans ${remaining}s.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_MS);
          setError(`Acces restreint. Compte verrouille pour 2 minutes.`);
        } else {
          setError(`Identifiants incorrects. (${MAX_ATTEMPTS - newAttempts} essais restants)`);
        }
        return;
      }

      const isStaff = await verifyStaffRole();
      if (!isStaff) {
        await supabase.auth.signOut();
        setError('Acces refuse. Ce compte n\'a pas les privileges administrateur.');
        return;
      }

      onSuccess();
    } catch {
      setError('Erreur de connexion. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isStaff = await verifyStaffRole();
        if (isStaff) {
          onSuccess();
        } else {
          await supabase.auth.signOut();
        }
      }
    };
    checkExistingSession();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-red-500/30">
      <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1fr]">
        <aside className="hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black px-10 py-10 lg:flex xl:px-14">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">SikaAds</h1>
                <p className="text-xs font-medium text-slate-400">Espace Administration</p>
              </div>
            </div>

            <div className="mt-12 max-w-xl">
              <h2 className="text-4xl xl:text-[2.8rem] leading-[1.08] font-bold">
                Acces<br />
                <span className="text-red-400">Restreint</span>
              </h2>
              <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-slate-400">
                Cette zone est reservee au personnel autorise. Toute tentative d'acces non autorise est enregistree et surveillee.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, title: 'Authentification securisee', desc: 'Verification du role en temps reel' },
                { icon: ShieldAlert, title: 'Protection renforcee', desc: 'Verrouillage apres 3 tentatives echouees' },
                { icon: Lock, title: 'Session protegee', desc: 'Donnees chiffrees de bout en bout' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>© 2026 SikaAds - Systeme securise</span>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <button onClick={onGoBack} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-slate-400 transition hover:text-white">
              <ArrowLeft size={17} />
              Retour
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Shield size={20} className="text-red-400" />
              <span className="text-sm font-bold">Admin</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <Shield size={28} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Connexion Admin</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                Identifiez-vous pour acceder au panneau d'administration.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Email professionnel</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 pl-12 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                    placeholder="admin@sika-ads.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mot de passe</span>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border border-slate-800 bg-slate-900 px-12 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-bold leading-5">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || verifying}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {(loading || verifying) ? <Loader2 className="animate-spin" size={22} /> : 'Acceder au panneau'}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs font-medium text-slate-500">
                <span className="font-bold text-slate-400">Rappel de securite :</span> Ne partagez jamais vos identifiants. En cas de suspicion de compromission, contactez immediatement l'equipe technique.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLoginView;
