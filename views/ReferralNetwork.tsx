import React, { useState, useEffect } from 'react';
import { Referral } from '../types';
import { Users, UserPlus, Copy, Check, Smartphone, User as UserIcon, X, Wallet, TrendingUp, Share2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useUserData } from '../hooks/useUserData';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 6;

const ReferralNetwork: React.FC = () => {
  const { userData } = useUserData();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralCode = userData?.referralCode || 'SIKAADS';
  const referralCount = userData?.referralCount || 0;
  const referralEarnings = userData?.referralEarnings || 0;

  useEffect(() => {
    let active = true;

    const fetchReferrals = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Error fetching referrals:", error.message);
        setLoading(false);
        return;
      }

      if (data && active) {
        setReferrals(data.map(r => ({
          id: r.id,
          name: r.name,
          phone: r.phone || '',
          status: r.status || 'inactive',
          earningsGenerated: r.earnings_generated ?? r.earningsGenerated ?? 0,
          createdAt: r.created_at || r.createdAt || new Date().toISOString()
        } as Referral)));
        setLoading(false);
      }
    };

    fetchReferrals();

    return () => {
      active = false;
    };
  }, [userData]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Rejoins SikaAds Togo',
      text: `Utilise mon code ${referralCode} pour gagner de l'argent avec tes statuts WhatsApp !`,
      url: `https://www.sika-ads.com/ref/${referralCode}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      handleCopyCode();
      alert('Lien copié dans le presse-papier !');
    }
  };

  const totalPages = Math.ceil(referrals.length / ITEMS_PER_PAGE);
  const paginatedReferrals = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return referrals.slice(start, start + ITEMS_PER_PAGE);
  }, [referrals, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Mon Réseau</h2>
          <p className="text-gray-500 text-sm font-medium">Gérez votre équipe et suivez vos commissions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 justify-center active:scale-95"
        >
          <UserPlus size={18} /> Inviter un ami
        </button>
      </div>

      {/* Code Banner */}
      <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-indigo-300 text-xs font-black uppercase tracking-[0.2em]">Votre Code Parrain</p>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-3xl font-mono font-bold tracking-wider">{referralCode}</span>
              <button onClick={handleCopyCode} className="text-indigo-200 hover:text-white transition-colors">
                {copied ? <Check size={24} className="text-green-400" /> : <Copy size={24} />}
              </button>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Total Filleuls</p>
              <p className="text-3xl font-black">{referralCount}</p>
            </div>
            <div className="w-px bg-white/10"></div>
            <div>
              <p className="text-green-300 text-[10px] font-black uppercase tracking-widest mb-1">Commissions</p>
              <p className="text-3xl font-black">{referralEarnings.toLocaleString()} F</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-900 mb-6 px-2 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          Membres de l'équipe
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-4 rounded-l-xl">Filleul</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Gains Générés</th>
                <th className="px-6 py-4 rounded-r-xl text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus size={32} className="opacity-20" />
                      <span className="text-xs font-bold uppercase tracking-widest">Aucun filleul enregistré</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                          {ref.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{ref.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{ref.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ref.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                        <TrendingUp size={14} />
                        +{ref.earningsGenerated} F
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400 font-bold">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={referrals.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {/* Invite Referral Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                  <UserPlus size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Inviter un ami</h3>
                <p className="text-gray-500 text-sm mt-1">Partagez votre lien pour gagner des bonus.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Votre Code Unique</p>
                <p className="text-3xl font-black text-indigo-600 tracking-wider font-mono">{referralCode}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 ml-1">Lien de parrainage</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                  <input
                    readOnly
                    value={`https://www.sika-ads.com/ref/${referralCode}`}
                    className="bg-transparent border-none outline-none text-xs font-medium text-gray-600 flex-1 w-full"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://www.sika-ads.com/ref/${referralCode}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Share2 size={18} />
                Partager le lien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralNetwork;
