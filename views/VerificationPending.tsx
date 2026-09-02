
import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldAlert, LogOut, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface VerificationPendingProps {
  email?: string | null;
  onGoToLogin: () => void;
  onResend?: () => Promise<void>;
}

const VerificationPending: React.FC<VerificationPendingProps> = ({ email, onGoToLogin, onResend }) => {
  const [resendState, setResendState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!onResend || resendState === 'loading') return;
    setResendState('loading');
    setResendError('');
    try {
      await onResend();
      setResendState('success');
      // Revenir à idle après 4 secondes
      setTimeout(() => setResendState('idle'), 4000);
    } catch (err: any) {
      setResendState('error');
      setResendError(err?.message || 'Erreur lors du renvoi de l\'email.');
      setTimeout(() => setResendState('idle'), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 selection:bg-[#D9ECEC]">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95 duration-500">
        
        <div className="relative">
          <div className="bg-[#D9ECEC] w-24 h-24 rounded-full flex items-center justify-center mx-auto text-[#128686] mb-4">
            <Mail size={48} />
          </div>
          <div className="absolute top-0 right-1/2 translate-x-10 bg-orange-100 p-2 rounded-full border-2 border-white text-orange-500">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">Vérifiez votre email</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Nous vous avons envoyé un email de vérification à <br/>
            <span className="text-[#128686] font-bold">{email || 'votre adresse email'}</span>.
            <br/>Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm text-gray-400 font-medium italic">
          "Vérifiez votre dossier spam si vous ne voyez pas l'email dans quelques minutes."
        </div>

        {/* Feedback renvoi email */}
        {resendState === 'success' && (
          <div className="flex items-center gap-2 justify-center text-green-600 font-semibold text-sm bg-green-50 py-3 px-4 rounded-2xl border border-green-100">
            <CheckCircle2 size={18} />
            Email renvoyé ! Vérifiez votre boîte.
          </div>
        )}
        {resendState === 'error' && (
          <div className="flex items-center gap-2 justify-center text-red-500 font-semibold text-sm bg-red-50 py-3 px-4 rounded-2xl border border-red-100">
            <AlertCircle size={18} />
            {resendError}
          </div>
        )}

        {/* Bouton Renvoyer */}
        {onResend && (
          <button
            onClick={handleResend}
            disabled={resendState === 'loading' || resendState === 'success'}
            className="w-full bg-[#E7F4F4] hover:bg-[#D9ECEC] text-[#0E6B6B] py-4 rounded-2xl font-bold tracking-wide border border-[#128686]/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={resendState === 'loading' ? 'animate-spin' : ''} />
            {resendState === 'loading' ? 'Envoi en cours…' : 'Renvoyer l\'email de vérification'}
          </button>
        )}

        <button 
          onClick={onGoToLogin}
          className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <LogOut size={18} />
          Se connecter
        </button>
      </div>
    </div>
  );
};

export default VerificationPending;
