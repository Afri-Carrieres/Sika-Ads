
import React from 'react';
import { CheckCircle, Copy, ArrowRight, Share2, Wallet } from 'lucide-react';

interface SuccessCampaignProps {
  campaignId: string;
  amount: number;
  onFinish: () => void;
}

const SuccessCampaign: React.FC<SuccessCampaignProps> = ({ campaignId, amount, onFinish }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(campaignId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-green-600">
          <CheckCircle size={56} />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Presque fini !</h1>
          <p className="text-gray-500 font-medium">Votre demande de campagne a été enregistrée avec succès.</p>
        </div>

        <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 space-y-6 text-left">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600 text-white p-2 rounded-xl mt-1">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Étape Finale</p>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Envoyez <span className="text-indigo-600">{amount.toLocaleString()} FCFA</span> par T-Money</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase ml-1">Numéro de transfert</span>
              <div className="bg-white border border-gray-100 p-4 rounded-2xl font-black text-xl text-gray-900 flex items-center justify-between">
                <span>+228 90 85 41 22</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase ml-1">Référence obligatoire</span>
              <div className="bg-white border border-indigo-200 p-4 rounded-2xl font-mono font-bold text-xl text-indigo-600 flex items-center justify-between">
                <span>{campaignId}</span>
                <button onClick={handleCopy} className="text-indigo-300 hover:text-indigo-600 transition-colors">
                  {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed px-4 italic">
          "Votre campagne sera validée et lancée par l'administrateur dans l'heure qui suit la réception du paiement."
        </p>

        <button 
          onClick={onFinish}
          className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3"
        >
          Retour à l'accueil
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default SuccessCampaign;
