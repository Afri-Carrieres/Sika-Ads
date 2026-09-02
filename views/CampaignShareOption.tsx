import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, Facebook, Loader2, Lock, MessageCircle, Instagram, PartyPopper } from 'lucide-react';
import { supabase } from '../supabase';
import { Campaign } from '../types';
import { platform } from 'os';

interface CampaignShareOptionProps {
  campaignId: string;
  onBack: () => void;
}

const DAILY_LIMIT = 3;

const CampaignShareOption: React.FC<CampaignShareOptionProps> = ({ campaignId, onBack }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [referrerId, setReferrerId] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      try {
        const { data: userData, error } = await supabase.auth.getUser();
        if (!error && userData?.user) setReferrerId(userData.user.id);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;

    const fetchCampaign = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!active) return;

      if (error) {
        console.error('Error fetching campaign:', error);
        setCampaign(null);
      } else {
        setCampaign(data as Campaign);
      }

      setIsLoading(false);
    };

    if (campaignId) {
      fetchCampaign();
    } else {
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [campaignId]);

  const isLimitReached = dailyCount >= DAILY_LIMIT;
  const remainingBudget = campaign ? (campaign.remainingBudget ?? campaign.totalBudget ?? 0) : 0;
  const isCampaignUnavailable = !campaign || campaign.status !== 'active' || remainingBudget <= 0;

  const shareText = useMemo(() => {
    if (!campaign) return '';
    const ref = referrerId || 'u123';
    const trackerBase = import.meta.env.VITE_TRACKER_URL || `${window.location.origin}/ref`;
    const trackingLink = `${trackerBase}?ref=${encodeURIComponent(ref)}&campaignId=${encodeURIComponent(campaign.id)}&platform=${campaign.platform}`;
    return `${campaign.title} ${campaign.description} ${campaign.targetUrl} \n\nCliquez ici : ${trackingLink} `;
  }, [campaign, referrerId]);

  const trackingLink = useMemo(() => {
    if (!campaign) return '';
    const ref = referrerId || 'u123';
    const trackerBase = import.meta.env.VITE_TRACKER_URL || `${window.location.origin}/ref`;
    return `${trackerBase}?ref=${encodeURIComponent(ref)}&campaignId=${encodeURIComponent(campaign.id)}`;
  }, [campaign, referrerId]);

  const incrementDailyCount = async () => {
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    
    if (referrerId) {
      const today = new Date().toDateString();
      const newStats = {
        sharedCount: newCount,
        lastSharedDate: today
      };
      
      try {
        await supabase
          .from('users')
          .update({ dailyStats: newStats })
          .eq('id', referrerId);
      } catch (err) {
        console.warn('Erreur mise à jour dailyStats:', err);
      }
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
  //   link.download = `sikaads-${safeName}`;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

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

  const handleShare = (platform: 'whatsapp' | 'facebook' | 'instagram') => {
    if (!campaign || isLimitReached || isCampaignUnavailable) return;

    setIsSharing(true);

    navigator.clipboard.writeText(shareText)
      .then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 3000);
      })
      .catch((err) => {
        console.warn('Erreur copie presse-papiers:', err);
      });

    if (platform === 'instagram') {
      downloadImage(campaign.imageUrl, campaign.title);
    }

    let url = '';
    if (platform === 'whatsapp') {
      // Ensure platform is visible in the tracking link
      const shareTextWithPlatform = shareText.replace('?platform=whatsapp', '?platform=whatsapp');
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWithPlatform)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackingLink + '&platform=facebook')}`;
    } else if (platform === 'instagram') {
      url = 'https://www.instagram.com/';
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Record share event (non-blocking)
    (async () => {
      try {
        await supabase.from('campaign_share_events').insert([{ campaign_id: campaign.id, platforms: platform, user_id: referrerId }]);
      } catch (err) {
        console.warn('Erreur enregistrement partage:', err);
      }
    })();

    setTimeout(() => {
      incrementDailyCount();
      setIsSharing(false);
      setShareSuccess(true);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-indigo-600">
        <Loader2 className="animate-spin" size={36} />
        <p className="text-xs font-black uppercase tracking-widest">Chargement de la campagne...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600">
          <ArrowLeft size={18} />
          Retour aux campagnes
        </button>
        <div className="bg-white rounded-[2rem] border border-gray-100 p-10 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Campagne introuvable</h2>
          <p className="text-sm text-gray-500 font-medium">Cette campagne n'existe plus ou n'est pas disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={18} />
        Retour aux campagnes
      </button>

      {shareSuccess && (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-green-100 flex items-center gap-4">
          <div className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100">
            <PartyPopper size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">C'est parti !</p>
            <p className="text-xs text-gray-500 font-bold mt-1">Lien copié. Partage ouvert. Revenez envoyer votre preuve de vues dans 24h.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
          <div className="relative h-72 md:h-[420px]">
            <img src={campaign.imageUrl} className="w-full h-full object-cover" alt={campaign.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-3">Partage de campagne</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">{campaign.title}</h2>
              <p className="text-white/80 text-sm font-medium max-w-2xl leading-relaxed">{campaign.description}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quota journalier</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black ${isLimitReached ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {isLimitReached ? <Lock size={14} /> : <Check size={14} />}
              {dailyCount}/{DAILY_LIMIT} participations
            </div>
          </div>

          {isCampaignUnavailable && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-500">
              Cette campagne n'est plus disponible pour le partage.
            </div>
          )}

          {isLimitReached && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm font-bold text-red-600">
              Limite journaliere atteinte. Revenez demain pour participer a de nouvelles campagnes.
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleShare('whatsapp')}
              disabled={isSharing || isLimitReached || isCampaignUnavailable}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-green-50 border border-green-100 hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-3 text-sm font-black text-green-800 uppercase tracking-widest">
                <span className="bg-[#25D366] text-white p-3 rounded-xl">
                    <img src="/icons-whatsapp.png" alt="WhatsApp" className='h-6 w-6'/>
                  {/* {isSharing ? <Loader2 size={22} className="animate-spin" /> : <MessageCircle size={22} />} */}
                </span>
                Statut WhatsApp
              </span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              disabled={isSharing || isLimitReached || isCampaignUnavailable}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-3 text-sm font-black text-blue-800 uppercase tracking-widest">
                <span className="bg-[#1877F2] text-white p-3 rounded-xl">
                  {isSharing ? <Loader2 size={22} className="animate-spin" /> : <Facebook size={22} />}
                </span>
                Story Facebook
              </span>
            </button>

            <button
              onClick={() => handleShare('instagram')}
              disabled={isSharing || isLimitReached || isCampaignUnavailable}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-pink-50 border border-pink-100 hover:bg-pink-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-3 text-sm font-black text-pink-800 uppercase tracking-widest">
                <span className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-3 rounded-xl">
                  {isSharing ? <Loader2 size={22} className="animate-spin" /> : <Instagram size={22} />}
                </span>
                Story Instagram
              </span>
            </button>
          </div>

          {copyFeedback && (
            <div className="bg-indigo-600 text-white p-4 rounded-2xl text-center text-xs font-bold animate-in slide-in-from-bottom-2 duration-300 shadow-xl">
              Lien copie !
            </div>
          )}

          <div className="pt-6 border-t border-gray-100">
            <button
              onClick={() => downloadImage(campaign.imageUrl, campaign.title)}
              disabled={isSharing}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gray-50 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 disabled:opacity-50"
            >
              <Download size={18} />
              Telecharger uniquement l'image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignShareOption;
