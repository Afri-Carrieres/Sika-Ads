import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, Facebook, Loader2, Lock, MessageCircle, Instagram, PartyPopper, Share2, Copy } from 'lucide-react';
import { supabase } from '../supabase';
import { Campaign } from '../types';

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

  const buildSafeName = (title: string) =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';

  const fetchImageBlob = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    return response.blob();
  };

  const downloadImage = async (url: string, title: string) => {
    const safeName = buildSafeName(title);

    try {
      const blob = await fetchImageBlob(url);

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

  // Tente d'ouvrir le partage natif (feuille de partage OS) avec l'image jointe,
  // ce qui permet à l'ambassadeur de choisir directement "Statut" / "Story"
  // dans WhatsApp, Instagram ou Facebook avec le visuel déjà attaché.
  const shareImageNatively = async (imageUrl: string, title: string, text: string) => {
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (!nav.share || !nav.canShare) return { supported: false, cancelled: false };

    try {
      const blob = await fetchImageBlob(imageUrl);
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'png';
      const file = new File([blob], `sikaads-${buildSafeName(title)}.${ext}`, { type: blob.type });
      const shareData: ShareData = { files: [file], text, title };

      if (!nav.canShare(shareData)) return { supported: false, cancelled: false };

      await nav.share(shareData);
      return { supported: true, cancelled: false };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { supported: true, cancelled: true };
      }
      console.warn('Partage natif indisponible, repli sur le lien web:', err);
      return { supported: false, cancelled: false };
    }
  };

  const [guideMessage, setGuideMessage] = useState<string | null>(null);

  const fetchImageAsFile = async (url: string, title: string): Promise<File> => {
    const safeName = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
    return new File([blob], `sikaads-${safeName}.${ext}`, { type: blob.type || 'image/jpeg' });
  };

  const handleShare = async (platform: 'native' | 'whatsapp' | 'facebook' | 'instagram') => {
    if (!campaign || isLimitReached || isCampaignUnavailable) return;

    setIsSharing(true);
    setGuideMessage(null);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    } catch (err) {
      console.warn('Erreur copie presse-papiers:', err);
    }

    const { supported, cancelled } = await shareImageNatively(
      campaign.imageUrl,
      campaign.title,
      shareText
    );

    if (cancelled) {
      setIsSharing(false);
      return;
    }

    if (!supported) {
      await downloadImage(campaign.imageUrl, campaign.title);

      let url = '';
      if (platform === 'whatsapp') {
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        setGuideMessage("L'image a été téléchargée et le texte a été copié. Ouvrez votre statut WhatsApp et sélectionnez l'image.");
      } else if (platform === 'facebook') {
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${trackingLink}&platform=facebook`)}`;
        setGuideMessage("L'image a été téléchargée et le texte a été copié. Créez ensuite votre Story Facebook.");
      } else if (platform === 'instagram') {
        url = 'https://www.instagram.com/';
        setGuideMessage("L'image a été téléchargée et le texte a été copié. Ouvrez Instagram Stories et sélectionnez l'image.");
      } else {
        setGuideMessage("L'image a été téléchargée et le texte a été copié.");
      }

      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setGuideMessage('Image et texte partagés avec succès ! Revenez envoyer votre preuve de vues dans 24h.');
    }

    try {
      await supabase.from('campaign_share_events').insert([{
        campaign_id: campaign.id,
        platforms: platform === 'native' ? 'whatsapp' : platform,
        user_id: referrerId
      }]);
    } catch (err) {
      console.warn('Erreur enregistrement partage:', err);
    }

    incrementDailyCount();
    setIsSharing(false);
    setShareSuccess(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#128686]">
        <Loader2 className="animate-spin" size={36} />
        <p className="text-xs font-bold uppercase tracking-widest">Chargement de la campagne...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#128686]">
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
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#128686] transition-colors">
        <ArrowLeft size={18} />
        Retour aux campagnes
      </button>

      {shareSuccess && (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-green-100 flex items-start gap-4">
          <div className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100 shrink-0">
            <PartyPopper size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">C'est parti !</p>
            <p className="text-xs text-gray-600 font-medium mt-1">
              {guideMessage || "Lien copié & partage ouvert. N'oubliez pas d'attacher l'image à votre statut/story ! Revenez envoyer votre preuve de vues dans 24h."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm flex flex-col">
          {/* Image container */}
          <div className="relative w-full h-72 md:h-[420px] bg-gray-100 overflow-hidden">
            <img
              src={campaign.imageUrl}
              className="w-full h-full object-cover"
              alt={campaign.title}
            />
          </div>

          {/* Details below image */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-[#E7F4F4] text-[#128686]">
                Partage de campagne
              </span>
              {campaign.category && (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                  {campaign.category}
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight text-gray-900">
              {campaign.title}
            </h2>

            <p className="text-gray-600 text-sm md:text-base font-normal leading-relaxed whitespace-pre-line">
              {campaign.description}
            </p>

            {campaign.targetUrl && (
              <div className="pt-2">
                <a
                  href={campaign.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#128686] hover:underline"
                >
                  Visiter le lien cible →
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Quota journalier</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${isLimitReached ? 'bg-red-50 text-red-600' : 'bg-[#E7F4F4] text-[#128686]'}`}>
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

          {/* Primary Action Button: Mobile Native Share with Image */}
          <button
            onClick={() => handleShare('native')}
            disabled={isSharing || isLimitReached || isCampaignUnavailable}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#128686] text-white hover:bg-[#0e6c6c] transition-all shadow-lg shadow-[#128686]/20 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            Partager l'affiche & le lien
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-gray-400 tracking-wider">ou par réseau</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleShare('whatsapp')}
              disabled={isSharing || isLimitReached || isCampaignUnavailable}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-green-50 border border-green-100 hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-green-800 uppercase tracking-widest">
                <span className="bg-[#25D366] text-white p-3 rounded-xl">
                  <img src="/icons-whatsapp.png" alt="WhatsApp" className='h-6 w-6'/>
                </span>
                Statut WhatsApp
              </span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              disabled={isSharing || isLimitReached || isCampaignUnavailable}
              className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-3 text-sm font-bold text-blue-800 uppercase tracking-widest">
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
              <span className="flex items-center gap-3 text-sm font-bold text-pink-800 uppercase tracking-widest">
                <span className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white p-3 rounded-xl">
                  {isSharing ? <Loader2 size={22} className="animate-spin" /> : <Instagram size={22} />}
                </span>
                Story Instagram
              </span>
            </button>
          </div>

          {copyFeedback && (
            <div className="bg-[#128686] text-white p-4 rounded-2xl text-center text-xs font-bold animate-in slide-in-from-bottom-2 duration-300 shadow-xl">
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
