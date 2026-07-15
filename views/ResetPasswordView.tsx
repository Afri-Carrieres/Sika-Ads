import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '');
      } else {
        setError("Le lien de réinitialisation est invalide ou a expiré.");
      }
      setVerifying(false);
    });
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05070f] text-indigo-400 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-bold text-sm uppercase tracking-widest animate-pulse">Vérification de la session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(1200px_circle_at_20%_15%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(900px_circle_at_85%_20%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(900px_circle_at_70%_85%,rgba(244,63,94,0.18),transparent_55%),linear-gradient(135deg,#05070f_0%,#0b1030_45%,#06152b_100%)] selection:bg-indigo-200/40 selection:text-white">
      <div className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-indigo-500/25 blur-3xl animate-auth-float" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full bg-emerald-400/20 blur-3xl animate-auth-float2" />

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-white/40 p-8 md:p-12 relative overflow-hidden animate-in zoom-in-95 duration-500">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100/50">
              <ShieldCheck size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sécurité</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 leading-tight font-display">
              Nouveau départ.
            </h2>
            {email && (
              <p className="text-gray-600 font-medium mt-2">
                Réinitialisation pour <span className="text-indigo-600 font-bold">{email}</span>
              </p>
            )}
          </div>

          {success ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-emerald-800">
                <CheckCircle2 size={48} className="mb-4" />
                <h3 className="text-xl font-black mb-2">Succès !</h3>
                <p className="text-sm font-bold opacity-80">Votre mot de passe a été modifié avec succès.</p>
              </div>
              <p className="text-gray-500 text-xs font-bold animate-pulse">Redirection vers la connexion dans quelques secondes...</p>
              <button
                onClick={onBackToLogin}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
              >
                Retourner à la connexion
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">
                    Nouveau mot de passe
                  </span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-100 border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all text-gray-900"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">
                    Confirmer le mot de passe
                  </span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-100 border border-gray-200 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all text-gray-900"
                      placeholder="••••••••"
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || (!!error && !email)}
                  className="w-full relative overflow-hidden py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200/50 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      Changer mon mot de passe
                      <ArrowRight size={20} />
                    </>
                  )}
                  <span className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(500px_circle_at_30%_10%,rgba(255,255,255,0.20),transparent_60%)]" />
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-xs font-black text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  Retourner à la connexion
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
