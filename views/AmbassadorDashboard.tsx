
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { Wallet, MousePointerClick, TrendingUp, ArrowUpRight, Copy, Check, BellRing, X, Sparkles, History, Filter, Calendar, Share2 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../supabase';
import NotificationBell from '../components/NotificationBell';

interface AmbassadorDashboardProps {
  onNavigateToWallet: () => void;
  userData: User | null;
}

interface ActivityItem {
  id: string;
  type: 'click' | 'validation' | 'payout';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
}

const ArrowDownRight: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m7 7 10 10" />
    <path d="M17 7v10H7" />
  </svg>
);

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`${colorMap[color]} p-3.5 rounded-2xl`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{title}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
};

const AmbassadorDashboard: React.FC<AmbassadorDashboardProps> = ({ onNavigateToWallet, userData }) => {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'week' | 'month' | '3months'>('week');
  const [proofDocs, setProofDocs] = useState<any[]>([]);
  const [withdrawalDocs, setWithdrawalDocs] = useState<any[]>([]);
  const [shareCount, setShareCount] = useState<number>(0);

  const displayUser = userData;

  const asDate = (value: any): Date | null => {
    if (!value) return null;
    try {
      if (typeof value?.toDate === 'function') return value.toDate();
      if (value instanceof Date) return value;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      // Fetch proofs
      const { data: proofsData, error: proofsError } = await supabase
        .from('proofs')
        .select('*')
        .eq('userId', uid)
        .order('submittedAt', { ascending: false })
        .limit(50);

      if (proofsError) {
        console.warn('AmbassadorDashboard proofs fetch error:', proofsError);
      } else if (proofsData && active) {
        setProofDocs(proofsData);
      }

      // Fetch withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', uid)
        .order('createdAt', { ascending: false })
        .limit(50);

      if (withdrawalsError) {
        console.warn('AmbassadorDashboard withdrawals fetch error:', withdrawalsError);
      } else if (withdrawalsData && active) {
        setWithdrawalDocs(withdrawalsData);
      }

      // Fetch share count
      const { data: shareData, error: shareError } = await supabase
        .from('campaign_share_events')
        .select('id')
        .eq('user_id', uid);

      if (shareError) {
        console.warn('AmbassadorDashboard shares fetch error:', shareError);
      } else if (shareData && active) {
        setShareCount(shareData.length);
      }
    };

    fetchDashboardData();

    // Realtime subscription for proofs, withdrawals, and share events updates
    const channel = supabase
      .channel('public:dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'proofs'
      }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawals'
      }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_share_events'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userData?.email]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPermissionPrompt(true), 2000);
        return () => clearTimeout(timer);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission();
      setShowPermissionPrompt(false);
    }
  };

  const handleWalletNavigation = () => {
    onNavigateToWallet();
  };

  if (!displayUser) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 font-bold">
        Chargement de vos statistiques…
      </div>
    );
  }

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    for (const p of proofDocs) {
      const status = String(p.status || 'pending').toLowerCase();
      const date = asDate(p.validatedAt || p.submittedAt) || new Date();
      const campaignName = String(p.campaignName || 'Campagne');

      if (status === 'validated') {
        const earnings = Number(p.earnings ?? (Number(p.viewsCount || 0) * Number(p.cpv || 20))) || 0;
        items.push({
          id: `proof-${String(p.id)}`,
          type: 'validation',
          title: 'Preuve validée',
          subtitle: campaignName,
          amount: earnings,
          date: date.toISOString(),
        });
      } else if (status === 'rejected') {
        items.push({
          id: `proof-${String(p.id)}`,
          type: 'validation',
          title: 'Preuve rejetée',
          subtitle: campaignName,
          amount: 0,
          date: date.toISOString(),
        });
      }
    }

    for (const w of withdrawalDocs) {
      const status = String(w.status || 'pending').toLowerCase();
      const amount = Number(w.amount || 0) || 0;
      const date = asDate(w.createdAt) || new Date();
      const subtitle = `${String(w.provider || '').toUpperCase()} · ${String(w.phone || '')}`.trim();

      if (status === 'pending' || status === 'processing') {
        items.push({
          id: `withdrawal-${String(w.id)}`,
          type: 'payout',
          title: 'Retrait demandé',
          subtitle,
          amount: -amount,
          date: date.toISOString(),
        });
      } else if (status === 'completed') {
        items.push({
          id: `withdrawal-${String(w.id)}`,
          type: 'payout',
          title: 'Retrait payé',
          subtitle,
          amount: -amount,
          date: date.toISOString(),
        });
      } else if (status === 'failed') {
        items.push({
          id: `withdrawal-${String(w.id)}`,
          type: 'payout',
          title: 'Retrait échoué',
          subtitle,
          amount: 0,
          date: date.toISOString(),
        });
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [proofDocs, withdrawalDocs]);

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const cutoff =
      historyFilter === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : historyFilter === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : now - 90 * 24 * 60 * 60 * 1000;

    return activities.filter((a) => new Date(a.date).getTime() >= cutoff);
  }, [activities, historyFilter]);

  const chartData = useMemo(() => {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const days: { date: Date; name: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ date: d, name: dayNames[d.getDay()] });
    }

    const sums = new Map<string, number>();
    for (const d of days) sums.set(d.date.toDateString(), 0);

    for (const p of proofDocs) {
      if (String(p.status || '').toLowerCase() !== 'validated') continue;
      const date = asDate(p.validatedAt || p.submittedAt);
      if (!date) continue;
      const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toDateString();
      if (!sums.has(dayKey)) continue;

      const earnings = Number(p.earnings ?? (Number(p.viewsCount || 0) * Number(p.cpv || 20))) || 0;
      sums.set(dayKey, (sums.get(dayKey) || 0) + earnings);
    }

    return days.map((d) => ({ name: d.name, earnings: Math.round(sums.get(d.date.toDateString()) || 0) }));
  }, [proofDocs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Push Notification Banner */}
      {showPermissionPrompt && (
        <div className="bg-indigo-600 text-white p-4 md:p-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-500 animate-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md animate-pulse">
              <BellRing size={28} className="text-white" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-black tracking-tight leading-none flex items-center justify-center md:justify-start gap-2">
                Ne manquez plus aucun gain ! 💸
                <Sparkles size={16} className="text-indigo-300" />
              </h3>
              <p className="text-indigo-100 text-sm font-medium">
                Recevez des alertes pour les <span className="text-white font-bold">nouvelles campagnes</span>, la <span className="text-white font-bold">validation de vos preuves</span> et vos <span className="text-white font-bold">paiements</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowPermissionPrompt(false)}
              className="px-6 py-3 text-indigo-200 text-sm font-bold hover:text-white transition-colors"
            >
              Plus tard
            </button>
            <button 
              onClick={requestNotificationPermission}
              className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-indigo-50 transition-all active:scale-95 whitespace-nowrap"
            >
              Activer maintenant
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenue, {displayUser.name?.split(' ')[0] || 'Ambassadeur'} 👋</h2>
            <p className="text-gray-500 text-sm">Prêt à booster vos revenus ?</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateToWallet}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 flex-1 md:flex-none justify-center active:scale-95"
          >
            Retrait rapide
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Solde Actuel" value={`${(displayUser.balance || 0).toLocaleString()} FCFA`} icon={Wallet} color="green" />
        {/* remplacer le nombre total de clics par le nombre total de partages par utilisateur */}
        <StatCard title='Total Partage' value={shareCount.toLocaleString()} icon={MousePointerClick} color="indigo" />
        <StatCard title="Total Gagné" value={`${(displayUser.totalEarned || 0).toLocaleString()} FCFA`} icon={TrendingUp} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Performance hebdomadaire</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(79, 70, 229, 0.05)'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}
                />
                <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#4f46e5' : '#e0e7ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Activités récentes</h3>
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 group">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 p-2.5 rounded-xl group-hover:bg-white transition-colors">
                    <ArrowUpRight size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{activity.subtitle}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${activity.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {activity.amount > 0 ? '+' : ''}{activity.amount} F
                </p>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="w-full mt-6 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            <History size={16} />
            Voir tout l'historique
          </button>
        </div>
      </div>

      {/* Full History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl shadow-sm">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Historique Complet</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Suivi détaillé de vos gains SikaAds</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-all hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
              <div className="flex items-center gap-2 text-gray-400 mr-2 shrink-0">
                <Filter size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Période :</span>
              </div>
              <button 
                onClick={() => setHistoryFilter('week')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyFilter === 'week' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'}`}
              >
                7 jours
              </button>
              <button 
                onClick={() => setHistoryFilter('month')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyFilter === 'month' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'}`}
              >
                Ce mois
              </button>
              <button 
                onClick={() => setHistoryFilter('3months')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyFilter === '3months' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'}`}
              >
                3 derniers mois
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-5 rounded-[1.75rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl shadow-sm transition-all group-hover:scale-110 ${
                        activity.type === 'validation' ? 'bg-green-100 text-green-600' :
                        activity.type === 'payout' ? 'bg-red-100 text-red-600' :
                        'bg-indigo-100 text-indigo-600'
                      }`}>
                        {activity.amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} className="rotate-90" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-gray-900 leading-none">{activity.title}</p>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{activity.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black ${activity.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {activity.amount > 0 ? '+' : ''}{activity.amount.toLocaleString()} F
                      </p>
                      <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest mt-1">Transaction OK</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Calendar size={64} className="text-gray-300" />
                  <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Aucune activité enregistrée</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 shrink-0 text-center">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all active:scale-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbassadorDashboard;
