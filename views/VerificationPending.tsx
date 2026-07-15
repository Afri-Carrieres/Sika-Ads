
import React from 'react';
import { Mail, ArrowRight, ShieldAlert, LogOut } from 'lucide-react';

interface VerificationPendingProps {
  email?: string | null;
  onGoToLogin: () => void;
}

const VerificationPending: React.FC<VerificationPendingProps> = ({ email, onGoToLogin }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 selection:bg-indigo-100">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95 duration-500">
        
        <div className="relative">
          <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-4">
            <Mail size={48} />
          </div>
          <div className="absolute top-0 right-1/2 translate-x-10 bg-orange-100 p-2 rounded-full border-2 border-white text-orange-500">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Vérifiez votre email</h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Nous vous avons envoyé un email de vérification à <br/>
            <span className="text-indigo-600 font-bold">{email || 'votre adresse email'}</span>.
            <br/>Veuillez vérifier et vous connecter.
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm text-gray-400 font-medium italic">
          "Vérifiez votre dossier spam si vous ne voyez pas l'email dans quelques minutes."
        </div>

        <button 
          onClick={onGoToLogin}
          className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <LogOut size={18} />
          Se connecter
        </button>
      </div>
    </div>
  );
};

export default VerificationPending;
