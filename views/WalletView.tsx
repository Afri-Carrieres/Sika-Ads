import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  Info
} from 'lucide-react';

import { useUserData } from '../hooks/useUserData';
import { requestWithdrawal } from '../services/withdrawals';
import { supabase } from '../supabase';

interface WalletViewProps {
  onWithdrawalRequested?: (amount: number, provider: string) => void;
}

const WalletView: React.FC<WalletViewProps> = ({ onWithdrawalRequested }) => {
  const { user, userData, loading: loadingUser } = useUserData();

  const [amount, setAmount] = useState<string>('0');
  const [provider, setProvider] = useState<'yas' | 'moov' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const MIN_WITHDRAWAL = 2000;

  const loadWithdrawals = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(5);
      if (error) {
        console.warn('WalletView withdrawals fetch error:', error);
      } else if (data) {
        setWithdrawals(data);
      }
    } catch (err) {
      console.warn('WalletView withdrawals fetch error:', err);
    }
  };

  useEffect(() => {
    loadWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Set default values when userData is loaded
  useEffect(() => {
    if (userData) {
      setAmount(userData.balance?.toString() || '0');
      setPhoneNumber(userData.momoNumber || '');
    }
  }, [userData]);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <Clock className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!userData) {
    return <div className="text-center mt-20">Utilisateur introuvable.</div>;
  }

  const canWithdraw = userData.balance >= MIN_WITHDRAWAL;
  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount =
    numericAmount >= MIN_WITHDRAWAL &&
    numericAmount <= userData.balance;

  const handleWithdraw = async () => {
    if (!isValidAmount || !provider || !phoneNumber || !user) return;

    setIsSubmitting(true);

    try {
      const clientRequestId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      await requestWithdrawal({
        amount: numericAmount,
        provider,
        phone: phoneNumber,
        country: 'TG',
        clientRequestId
      });

      if (onWithdrawalRequested)
        onWithdrawalRequested(numericAmount, provider);

      setShowSuccess(true);
      loadWithdrawals();
    } catch (error: any) {
      console.error(error);
      const msg = String(error?.message || '');
      if (msg.includes('insufficient_balance')) {
        alert('Solde insuffisant pour effectuer ce retrait.');
      } else if (msg.includes('below_minimum_withdrawal')) {
        alert(`Le montant minimum pour un retrait est de ${MIN_WITHDRAWAL.toLocaleString()} FCFA.`);
      } else {
        alert('Erreur lors de la demande de retrait.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      // <div className="text-center mt-20">
      //   <CheckCircle2 size={60} className="text-green-600 mx-auto mb-4" />
      //   <h2 className="text-2xl font-bold">Demande envoyée !</h2>
      //   <p className="text-gray-500 mt-2">
      //     Retrait de {numericAmount.toLocaleString()} FCFA enregistré.
      //   </p>
      //   <button
      //     onClick={() => setShowSuccess(false)}
      //     className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-xl"
      //   >
      //     Retour
      //   </button>
      // </div>
      <div className="max-w-xl mx-auto py-12 px-6 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 text-center space-y-8">
          <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-green-600 animate-bounce">
            <CheckCircle2 size={56} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900 leading-tight">Demande Reçue !</h2>
            <p className="text-gray-500 font-medium">Votre retrait de <span className="text-indigo-600 font-bold">{numericAmount.toLocaleString()} FCFA</span> via {provider === 'yas' ? 'Mixx by YAS' : 'Moov Money'} est enregistré.</p>
          </div>
          <div className="bg-indigo-50 p-6 rounded-2xl flex items-center gap-4 text-left border border-indigo-100">
            <Clock className="text-indigo-600 shrink-0" size={24} />
            <p className="text-sm text-indigo-900 font-medium">Validation prévue sous <strong>24 heures</strong> après vérification de votre activité par notre service financier.</p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
          >
            Retour au portefeuille
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Mon Portefeuille</h2>
          <p className="text-gray-500 text-sm font-medium">Suivez vos gains et retirez votre cash instantanément.</p>
        </div>
        {!canWithdraw && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 rounded-full text-[11px] font-black uppercase tracking-widest border border-orange-200 shadow-sm animate-pulse">
            <AlertCircle size={14} />
            Retrait dès {MIN_WITHDRAWAL.toLocaleString()} FCFA
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
            <div className="relative z-10 space-y-1">
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.25em]">Solde Disponible</p>
              <h3 className="text-5xl font-bold tracking-tighter">{userData.balance.toLocaleString()} <span className="text-2xl opacity-70">F CFA</span></h3>
            </div>
            <div className="pt-12 relative z-10 flex items-center justify-between">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-0.5">Total gagné</p>
                <p className="text-sm font-bold">{userData.totalEarned.toLocaleString()} FCFA</p>
              </div>
              <Wallet className="text-white/20 -rotate-12" size={64} />
            </div>
            {/* Decorations */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <History size={14} />
              Historique récent
            </h4>
            <div className="space-y-4">
              {withdrawals.length === 0 && (
                <p className="text-xs text-gray-400 font-medium text-center py-2">Aucun retrait pour le moment.</p>
              )}
              {withdrawals.slice(0, 3).map((w: any) => {
                const status = String(w.status || '').toLowerCase();
                const isCompleted = status === 'completed';
                const isFailed = status === 'failed';
                const statusLabel = isCompleted ? 'Validé' : isFailed ? 'Échoué' : 'En attente';
                const amountText = `${(Number(w.amount) || 0).toLocaleString('fr-FR')} F`;
                return (
                  <div key={w.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className={`${isCompleted ? 'bg-green-50 text-green-600' : isFailed ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} p-2.5 rounded-xl`}>
                        {isCompleted ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Retrait {w.provider || 'Mobile Money'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {new Date(w.createdAt || w.date || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {statusLabel}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${isCompleted ? 'text-green-600' : isFailed ? 'text-red-500' : 'text-orange-500'}`}>{amountText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Withdrawal Form */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm space-y-10">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Demander un Retrait</h3>
              <p className="text-sm text-gray-500 font-medium">Sélectionnez votre opérateur et le montant souhaité.</p>
            </div>

            <div className="space-y-8">
              {/* Provider Selection */}
              <div className="space-y-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Choix de l'opérateur</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Mixx by YAS */}
                  <button 
                    onClick={() => setProvider('yas')}
                    className={`relative overflow-hidden rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 group ${provider === 'yas' ? 'border-indigo-600 scale-[1.02] shadow-xl' : 'border-transparent hover:scale-95'}`}
                  >
                    <div className="absolute inset-0 bg-[#00338d] flex flex-col items-center justify-center p-4">
                        <div className="text-yellow-400 font-black italic text-4xl tracking-tighter mb-1 select-none">mixx</div>
                        <div className="absolute bottom-4 right-4 bg-yellow-400 w-10 h-10 rounded-full flex items-center justify-center text-[#00338d] font-black italic text-sm">TG</div>
                    </div>
                    {provider === 'yas' && (
                        <div className="absolute top-3 left-3 bg-white text-indigo-600 p-1.5 rounded-full shadow-lg z-10 animate-in zoom-in-50 duration-200">
                            <CheckCircle2 size={16} />
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 w-full py-2 bg-black/20 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest">Mixx by YAS</div>
                  </button>

                  {/* Moov Money */}
                  <button 
                    onClick={() => setProvider('moov')}
                    className={`relative overflow-hidden rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 group ${provider === 'moov' ? 'border-indigo-600 scale-[1.02] shadow-xl' : 'border-transparent hover:scale-95'}`}
                  >
                    <div className="absolute inset-0 bg-[#0066cc] flex flex-col items-center justify-center p-4">
                        <div className="bg-[#f37021] w-full aspect-square md:w-28 md:h-28 rotate-45 flex items-center justify-center shadow-lg border-4 border-white/10">
                            <div className="-rotate-45 text-center">
                                <p className="text-white font-black text-[10px] md:text-xs leading-none">MOOV</p>
                                <p className="text-white font-bold text-lg md:text-2xl leading-none">Money</p>
                                <p className="text-white font-black text-[8px] md:text-[10px] tracking-[0.2em] mt-1">TOGO</p>
                            </div>
                        </div>
                    </div>
                    {provider === 'moov' && (
                        <div className="absolute top-3 left-3 bg-white text-indigo-600 p-1.5 rounded-full shadow-lg z-10 animate-in zoom-in-50 duration-200">
                            <CheckCircle2 size={16} />
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 w-full py-2 bg-black/20 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest">Moov Money</div>
                  </button>
                </div>
              </div>

              {/* Number & Amount Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block space-y-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Numéro Mobile Money</span>
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="tel" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white text-gray-900"
                            placeholder="90 00 00 00"
                        />
                    </div>
                </label>

                <label className="block space-y-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Montant à retirer</span>
                    <div className="relative">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white text-gray-900"
                            placeholder="Ex: 5000"
                        />
                        <button 
                            onClick={() => setAmount(userData.balance.toString())}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                        >
                            Max
                        </button>
                    </div>
                </label>
              </div>

              {/* Error/Warning Messages */}
              {!isValidAmount && numericAmount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-xs font-bold">
                        {numericAmount < MIN_WITHDRAWAL ? `Le montant minimum pour un retrait est de ${MIN_WITHDRAWAL.toLocaleString()} FCFA.` : 'Votre solde est insuffisant pour ce montant.'}
                    </p>
                </div>
              )}

              {/* Info Box */}
              <div className="flex gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                <div className="bg-white p-2 rounded-xl h-fit border border-gray-100">
                    <Info size={16} className="text-gray-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">Délai de traitement</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                        Les retraits sont validés manuellement sous <strong>24 heures</strong> (jours ouvrés) pour garantir la conformité des preuves de campagnes partagées.
                    </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button 
                  disabled={!canWithdraw || !isValidAmount || !provider || !phoneNumber || isSubmitting}
                  onClick={handleWithdraw}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <><Clock className="animate-spin" size={20} /> Traitement...</>
                  ) : (
                    <>
                      Confirmer le Retrait
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-gray-400 font-bold mt-5 uppercase tracking-tighter">
                    Sécurisé par SikaAds Togo Financial Service
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletView;
