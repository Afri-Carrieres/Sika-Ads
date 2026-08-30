
import React, { useState, useMemo, useEffect } from 'react';
import { CATEGORIES } from '../constants';
import { supabase } from '../supabase';
import { Campaign } from '../types';
import { Share2, Download, X, Instagram, Facebook, MessageCircle, Copy, Check, Loader2, Smartphone, TrendingUp, Sparkles, CheckCircle2, PartyPopper, Archive, Ban, Lock, Info, Zap, PauseCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface CampaignMarketplaceProps {
  onShareCampaign: (campaignId: string) => void;
}


const CampaignMarketplace: React.FC<CampaignMarketplaceProps> = ({ onShareCampaign }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showGlobalSuccess, setShowGlobalSuccess] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [recentlySharedId, setRecentlySharedId] = useState<string | null>(null);

  // const user = supabase.auth.getUser(); // Assuming you have user authentication set up and this returns the current user
  // Daily Limit State
  const DAILY_LIMIT = 3;
  const isLimitReached = dailyCount >= DAILY_LIMIT;
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Campagnes Firestore
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({});
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchDailyStats = async () => {
      if (!referrerId) return;

      const { data, error } = await supabase
        .from('users')
        .select('dailyStats')
        .eq('id', referrerId)
        .single();

      if (!active) return;

      if (!error && data) {
        const stats = data.dailyStats as { sharedCount?: number; lastSharedDate?: string } | null;
        const today = new Date().toDateString();

        if (stats?.lastSharedDate === today) {
          setDailyCount(stats.sharedCount || 0);
        } else {
          setDailyCount(0);
        }
      }
    };

    fetchDailyStats();

    return () => {
      active = false;
    };
  }, [referrerId]);


  // Récupération temps réel des campagnes Supabase
  useEffect(() => {
    let active = true;

    const fetchCampaigns = async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error("Error fetching campaigns:", error);
        return;
      }

      if (data && active) {
        const fetched = data as Campaign[];
        setCampaigns(fetched);
        // Met à jour les budgets locaux
        const budgets: Record<string, number> = {};
        fetched.forEach(c => { budgets[c.id] = c.remainingBudget ?? c.totalBudget ?? 0; });
        setLocalBudgets(budgets);
      }
    };

    fetchCampaigns();

    const channel = supabase.channel('marketplace-campaigns-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, fetchCampaigns)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (selectedCategory === 'Terminé') {
      return campaigns.filter(c => c.status === 'completed' || localBudgets[c.id] <= 0);
    }
    let base = campaigns.filter(c => c.status === 'active' && localBudgets[c.id] > 0);
    if (selectedCategory !== 'All') {
      base = base.filter(c => c.category === selectedCategory);
    }
    return base;
  }, [selectedCategory, localBudgets, campaigns]);

  // Reset page on category change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE);
  const paginatedCampaigns = useMemo(() => {
    return filteredCampaigns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredCampaigns, currentPage]);

  const openSharePage = (campaign: Campaign) => {
    const budget = localBudgets[campaign.id] || 0;
    if (campaign.status === 'completed' || campaign.status === 'paused' || budget <= 0) return;

    if (dailyCount >= DAILY_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    onShareCampaign(campaign.id);
  };


  const downloadImage = async (url: string, title: string) => {
  const safeName = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const blob = await response.blob();

    // Détecte l'extension à partir du type MIME (png, jpg, webp, svg…)
    const ext = blob.type.split('/')[1]?.split('+')[0] || 'png';

    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `sikaads-${safeName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libère la mémoire une fois le téléchargement déclenché
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Échec du téléchargement de l\'image :', err);
    // Optionnel : fallback → ouvrir l'image dans un nouvel onglet
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

  // const downloadImage = (url: string, title: string) => {
  //   const safeName = title
  //     .toLowerCase()
  //     .normalize('NFD')
  //     .replace(/[\u0300-\u036f]/g, '')
  //     .replace(/[^a-z0-9]+/g, '-')
  //     .replace(/^-+|-+$/g, '')
  //     .slice(0, 60) || 'image';

  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.target = '_blank';
  //   link.rel = 'noopener noreferrer';
  //   // `download` ne fonctionne pas toujours en cross-origin (Firebase Storage),
  //   // mais ça n'échoue pas : le navigateur ouvrira l'image dans un nouvel onglet.
  //   link.download = `sikaads-${safeName}`;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  const getStatusBadgeConfig = (campaign: Campaign, budget: number) => {
    if (campaign.status === 'completed' || budget <= 0) {
      return { label: 'Terminé', className: 'bg-gray-800 text-white', icon: Ban };
    }
    if (campaign.status === 'paused') {
      return { label: 'En Pause', className: 'bg-yellow-500 text-white', icon: PauseCircle };
    }
    return { label: 'Active', className: 'bg-green-500 text-white', icon: Zap };
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 relative">

        {showGlobalSuccess && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-500">
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-green-100 flex items-center gap-5">
              <div className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100 animate-bounce">
                <PartyPopper size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-900 leading-tight">C'est parti ! 🚀</p>
                <p className="text-[10px] text-gray-500 font-bold mt-1">Lien copié. Partage ouvert. N'oubliez pas de revenir envoyer votre preuve de vues dans 24h !</p>
              </div>
              <button onClick={() => setShowGlobalSuccess(false)} className="text-gray-300 hover:text-gray-500">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Marché des Campagnes</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-sm">Gagnez de l'argent en partageant.</p>
              {/* <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quota journalier</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black ${isLimitReached ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {isLimitReached ? <Lock size={14} /> : <Check size={14} />}
                  {dailyCount}/{DAILY_LIMIT} participations
                </div>
              </div> */}
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'}`}
            >
              Tous
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'}`}
              >
                {cat}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-2 shrink-0"></div>
            <button
              onClick={() => setSelectedCategory('Terminé')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${selectedCategory === 'Terminé' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
            >
              <Archive size={14} />
              Archives
            </button>
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-[3rem] py-20 border border-dashed border-gray-100 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
              <Archive size={40} />
            </div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Aucune campagne {selectedCategory === 'Terminé' ? 'archivée' : 'dans cette catégorie'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedCampaigns.map((campaign) => {
              const currentBudget = localBudgets[campaign.id] || 0;
              const isCompleted = campaign.status === 'completed' || currentBudget <= 0;
              const isPaused = campaign.status === 'paused';
              const isRecentlyShared = recentlySharedId === campaign.id;
              const isProcessing = false;
              const isLimitReached = dailyCount >= DAILY_LIMIT;

              const badgeConfig = getStatusBadgeConfig(campaign, currentBudget);
              const BadgeIcon = badgeConfig.icon;

              return (
                <div key={campaign.id} className={`bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col group transition-all duration-500 ${isCompleted ? 'opacity-80' : 'hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-1'}`}>
                  <div className="relative h-64 overflow-hidden">
                    <img src={campaign.imageUrl} alt={campaign.title} className={`w-full h-full object-cover transition-all duration-700 ${isCompleted ? 'grayscale brightness-50 contrast-[0.8]' : 'group-hover:scale-110'}`} />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>

                    {!isCompleted && !isPaused && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(campaign.imageUrl, campaign.title);
                        }}
                        className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-2xl backdrop-blur-md transition-all shadow-lg z-10 group/dl"
                        title="Télécharger l'image"
                      >
                        <Download size={20} className="group-hover/dl:scale-110 transition-transform" />
                      </button>
                    )}

                    {isCompleted && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-white/90 px-6 py-2 rounded-full flex items-center gap-2 shadow-xl border border-gray-100 animate-in fade-in zoom-in-90 duration-500">
                          <Ban size={16} className="text-red-600" />
                          <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Épuisée / Terminé</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
                      <span className={`${isCompleted ? 'bg-gray-700/80' : 'bg-indigo-600/90'} backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-lg`}>
                        {campaign.category}
                      </span>
                      {!isCompleted && (
                        <span className={`${badgeConfig.className} backdrop-blur-md text-[9px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}>
                          <BadgeIcon size={10} />
                          {badgeConfig.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className={`text-xl font-black mb-2 leading-tight ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{campaign.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-8 font-medium leading-relaxed">{campaign.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {/* <div className={`${isCompleted ? 'bg-gray-50 border-gray-100 grayscale' : 'bg-green-50/50 border-green-100'} p-4 rounded-2xl border`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCompleted ? 'text-gray-300' : 'text-green-700'}`}>Par Clic</p>
                      <p className={`text-xl font-black ${isCompleted ? 'text-gray-400' : 'text-green-800'}`}>{campaign.cpc} FCFA</p>
                    </div> */}
                      <div className={`${isCompleted ? 'bg-gray-50 border-gray-100 grayscale' : 'bg-indigo-50/50 border-indigo-100'} p-4 rounded-2xl border`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCompleted ? 'text-gray-300' : 'text-indigo-700'}`}>Par Statut</p>
                        <p className={`text-xl font-black ${isCompleted ? 'text-gray-400' : 'text-indigo-800'}`}>{campaign.cpv} FCFA</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          Budget rest.
                          {lastUpdatedId === campaign.id && !isCompleted && !isPaused && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                          )}
                        </p>
                        <p className={`text-sm font-bold transition-colors duration-500 ${isCompleted ? 'text-gray-300 line-through' : (lastUpdatedId === campaign.id ? 'text-green-600' : 'text-gray-900')}`}>
                          {(localBudgets[campaign.id] || 0).toLocaleString()} F
                        </p>
                      </div>
                      <button
                        onClick={() => openSharePage(campaign)}
                        disabled={isCompleted || isPaused || isProcessing}
                        className={`px-8 py-3.5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${isCompleted || isPaused
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : isRecentlyShared
                            ? 'bg-green-500 text-white shadow-xl shadow-green-100'
                            : isLimitReached
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95'
                          }`}
                      >
                        {isCompleted ? 'Terminé' : isPaused ? 'En Pause' : (isRecentlyShared ? 'Partagé !' : isProcessing ? 'En cours...' : (isLimitReached ? 'Limite atteinte' : 'Participer'))}
                        {isRecentlyShared ? <Check size={16} /> : isProcessing ? <Loader2 size={16} className="animate-spin" /> : (!isCompleted && !isPaused && (isLimitReached ? <Lock size={16} /> : <Share2 size={16} />))}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-gray-100 disabled:hover:text-gray-400 active:scale-90"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  const isSelected = currentPage === pageNum;

                  // Show first, last, current, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-11 h-11 rounded-2xl text-xs font-black transition-all active:scale-90 ${isSelected
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }

                  // Show ellipsis
                  if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span key={pageNum} className="w-11 h-11 flex items-center justify-center text-gray-300">
                        •
                      </span>
                    );
                  }

                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-gray-100 disabled:hover:text-gray-400 active:scale-90"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Page {currentPage} sur {totalPages} — {filteredCampaigns.length} campagnes au total
            </p>
          </div>
        )}
      </div>

      {/* Modals outside the animated container to ensure they are relative to the viewport */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-red-500 mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Limite Journalière Atteinte</h3>
            <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
              Pour donner la chance à tout le monde de gagner, nous limitons la participation à <strong>3 campagnes par jour</strong>.
              <br /><br />
              Revenez demain pour de nouvelles opportunités !
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all active:scale-95"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

    </>
  );
};

export default CampaignMarketplace;
