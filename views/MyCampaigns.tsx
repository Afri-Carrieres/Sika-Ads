import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Campaign } from '../types';
import { useUserData } from '../hooks/useUserData';
import { 
  Megaphone, 
  BarChart2, 
  Share2, 
  Eye, 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Layers,
  ChevronRight,
  PlusCircle
} from 'lucide-react';

interface MyCampaignsProps {
  onRetryPayment: (campaignId: string, amount: number) => void;
  onNavigateToCreate: () => void;
}

interface CampaignStats {
  shares: number;
  clicks: number;
}

const MyCampaigns: React.FC<MyCampaignsProps> = ({ onRetryPayment, onNavigateToCreate }) => {
  const { user } = useUserData();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCampaigns = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch campaigns created by user
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('advertiserId', user.id)
        .order('createdAt', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        setStats({});
        return;
      }

      setCampaigns(campaignsData);

      // 2. Fetch shares and clicks aggregates for user's campaigns
      const campaignIds = campaignsData.map(c => c.id);

      const { data: sharesData, error: sharesError } = await supabase
        .from('campaign_share_events')
        .select('campaign_id')
        .in('campaign_id', campaignIds);

      const { data: clicksData, error: clicksError } = await supabase
        .from('campaign_clicks')
        .select('campaign_id')
        .in('campaign_id', campaignIds);

      if (sharesError) console.warn('Error fetching shares count:', sharesError.message);
      if (clicksError) console.warn('Error fetching clicks count:', clicksError.message);

      // 3. Compute counts
      const statsMap: Record<string, CampaignStats> = {};
      campaignIds.forEach(id => {
        statsMap[id] = { shares: 0, clicks: 0 };
      });

      sharesData?.forEach((event: any) => {
        const campaignId = event.campaign_id ?? event.campaignId;
        if (campaignId && statsMap[campaignId]) {
          statsMap[campaignId].shares++;
        }
      });

      clicksData?.forEach((click: any) => {
        const campaignId = click.campaign_id ?? click.campaignId;
        if (campaignId && statsMap[campaignId]) {
          statsMap[campaignId].clicks++;
        }
      });

      setStats(statsMap);
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      setError(err.message || 'Impossible de charger vos campagnes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCampaigns();
  }, [user]);

  const getStatusBadge = (campaign: Campaign) => {
    // 1. Check payment status first
    const isUnpaid = campaign.paymentStatus === 'pending_payment' || 
                    campaign.campaignPaymentStatus === 'pending_payment';

    if (isUnpaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} />
          Attente paiement
        </span>
      );
    }

    // 2. Check admin status / approval
    if (campaign.status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={12} />
          En révision
        </span>
      );
    }

    if (campaign.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={12} />
          Active
        </span>
      );
    }

    if (campaign.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <CheckCircle size={12} />
          Terminée
        </span>
      );
    }

    if (campaign.status === 'paused') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          <PauseCircle size={12} />
          En pause
        </span>
      );
    }

    if (campaign.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} />
          Rejetée
        </span>
      );
    }

    return null;
  };

  // Aggregated totals
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalShares = Object.values(stats).reduce((acc, curr) => acc + curr.shares, 0);
  // viewsCurrent = vues réellement validées par les admins (somme de tous les proofs validés)
  const totalValidatedViews = campaigns.reduce((acc, c) => acc + (c.viewsCurrent ?? 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-[#128686]" size={40} />
        <p className="text-slate-500 font-medium">Chargement de vos campagnes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl my-10 p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
        <AlertCircle className="mx-auto text-rose-500 mb-3" size={32} />
        <h3 className="text-rose-900 font-bold mb-1">Une erreur est survenue</h3>
        <p className="text-rose-700 text-sm mb-4">{error}</p>
        <button 
          onClick={fetchUserCampaigns}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Mes Campagnes créées</h1>
          <p className="text-slate-500 text-sm mt-1">Suivez les performances de vos campagnes publicitaires et gérez vos paiements.</p>
        </div>
        <button
          onClick={onNavigateToCreate}
          className="flex items-center gap-2 px-5 py-3 bg-[#128686] hover:bg-[#0E6B6B] text-white font-bold rounded-xl shadow-lg shadow-[#062127]/20 hover:shadow-[#062127]/40 transition-all text-sm self-start sm:self-center"
        >
          <PlusCircle size={16} />
          Lancer une campagne
        </button>
      </div>

      {totalCampaigns === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-slate-800 font-bold text-lg mb-2">Aucune campagne pour le moment</h3>
          <p className="text-slate-500 text-sm mb-6">
            Vous pouvez promouvoir votre marque, entreprise ou projet auprès de nos milliers d'ambassadeurs en quelques clics.
          </p>
          <button
            onClick={onNavigateToCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#128686] hover:bg-[#0E6B6B] text-white font-bold rounded-xl shadow-md transition"
          >
            Créer ma première campagne
            <ChevronRight size={16} />
          </button>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-[#E7F4F4] rounded-xl text-[#128686]">
                <Layers size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Campagnes</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{totalCampaigns}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Actives</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{activeCampaigns}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
                <Share2 size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Partages</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{totalShares}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Vues validées</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{totalValidatedViews.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => {
              const cStats = stats[campaign.id] || { shares: 0, clicks: 0 };
              // Vues validées par l'admin (source de vérité)
              const validatedViews = campaign.viewsCurrent ?? 0;
              const target = campaign.targetViews || 1;
              const progress = Math.min(100, Math.round((validatedViews / target) * 100));
              const isUnpaid = campaign.paymentStatus === 'pending_payment' || 
                              campaign.campaignPaymentStatus === 'pending_payment';

              return (
                <div 
                  key={campaign.id}
                  className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition duration-200"
                >
                  {/* Image banner & Status */}
                  <div className="relative h-48 bg-slate-100">
                    <img 
                      src={campaign.imageUrl} 
                      alt={campaign.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      {getStatusBadge(campaign)}
                    </div>
                    {campaign.category && (
                      <span className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        {campaign.category}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2">{campaign.title}</h3>
                      <p className="text-slate-500 text-xs mt-1">Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</p>
                      <p className="text-slate-600 text-sm mt-3 line-clamp-3">{campaign.description}</p>
                    </div>

                    {/* Progress bar (vues validées vs objectif) */}
                    {!isUnpaid && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            VUES VALIDÉES
                          </span>
                          <span className="text-[#0E6B6B]">
                            {validatedViews.toLocaleString()} / {target.toLocaleString()} ({progress}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: progress >= 100
                                ? 'linear-gradient(90deg, #0E6B6B, #2BA8A8)'
                                : 'linear-gradient(90deg, #D14E04, #FB7A28)'
                            }}
                          />
                        </div>
                        {/* Clics bruts (trafic) en métrique secondaire */}
                        <p className="text-[11px] text-slate-400">
                          {cStats.clicks.toLocaleString()} clic{cStats.clicks > 1 ? 's' : ''} de trafic · {cStats.shares.toLocaleString()} partage{cStats.shares > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Financial details */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Budget Total</span>
                        <span className="text-base font-bold text-[#062127]">{(campaign.totalBudget || campaign.paymentAmount || 0).toLocaleString()} F</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Budget restant</span>
                        <span className="text-sm font-extrabold text-slate-800">{(campaign.remainingBudget ?? campaign.totalBudget ?? 0).toLocaleString()} F</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Coût / Vue</span>
                        <span className="text-sm font-extrabold text-slate-800">{(campaign.cpv || 0)} F</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {isUnpaid && (
                      <div className="pt-4">
                        <button
                          onClick={() => onRetryPayment(campaign.id, campaign.paymentAmount || campaign.totalBudget)}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 transition duration-200 cursor-pointer"
                        >
                          <CreditCard size={16} />
                          Finaliser le paiement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MyCampaigns;
