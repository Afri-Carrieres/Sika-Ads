import React, { useState, useEffect } from 'react';
import { Proof, Notification, AIAnalysis, Campaign } from '../types';
import { Upload, CheckCircle2, XCircle, Clock, Trash2, Eye, X, Image as ImageIcon, FileText, AlertCircle, Loader2, BrainCircuit, ShieldCheck, ShieldAlert, ChevronDown, Info, Search, Sparkles, Video, Play, Film } from 'lucide-react';
import { supabase } from '../supabase';
import { validateProofWithAI } from '../services/geminiService';
import Pagination from '../components/Pagination';
import { useUserData } from '../hooks/useUserData';

const ITEMS_PER_PAGE = 6;

interface TaskHistoryProps {
  proofs: (Proof & { campaignTitle?: string; userName?: string })[];
  setProofs: React.Dispatch<React.SetStateAction<(Proof & { campaignTitle?: string; userName?: string })[]>>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ proofs, setProofs, addNotification }) => {
  const { user } = useUserData();
  
  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<Proof | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [analysisProof, setAnalysisProof] = useState<Proof | null>(null);

  // Upload Form States
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    // Initial fetch of active campaigns
    supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching campaigns:", error);
        } else if (data) {
          setCampaigns(data as Campaign[]);
        }
      });

    // Realtime subscription for campaigns
    const channel = supabase
      .channel('public:campaigns:active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          supabase
            .from('campaigns')
            .select('*')
            .eq('status', 'active')
            .then(({ data }) => {
              if (data) setCampaigns(data as Campaign[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for images
  const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB for videos

  // Real-time listener for proofs from Supabase
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const fetchProofs = async () => {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('userId', userId)
        .order('submittedAt', { ascending: false });

      if (error) {
        console.warn("Error fetching proofs:", error.message);
        return;
      }

      // Map database snake_case fields to camelCase properties for component compatibility
      const fetchedProofs = (data || []).map(p => ({
        id: p.id,
        userId: p.userId,
        userName: p.userName,
        campaignId: p.campaignId,
        campaignName: p.campaignName,
        fileName: p.fileName,
        storagePath: p.storagePath,
        downloadURL: p.downloadURL,
        size: p.size,
        type: p.type,
        videoUrl: p.videoUrl || p.video_url,
        videoStoragePath: p.videoStoragePath || p.video_storage_path,
        videoFileName: p.videoFileName || p.video_file_name,
        videoSize: p.videoSize || p.video_size,
        videoType: p.videoType || p.video_type,
        status: p.status,
        aiValidation: p.aiValidation,
        submittedAt: p.submittedAt || new Date().toISOString(),
        rejectionReason: p.rejectionReason,
        viewsCount: p.viewsCount,
        aiAnalysis: p.aiAnalysis
      })) as Proof[];

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const validProofs = fetchedProofs.filter(p => new Date(p.submittedAt) >= cutoff);
      const expiredProofs = fetchedProofs.filter(p => new Date(p.submittedAt) < cutoff);

      // Nettoyer les expirés de la DB et Storage
      for (const proof of expiredProofs) {
        try {
          if (proof.storagePath) {
            await supabase.storage.from('proofs').remove([proof.storagePath]);
          }
          if (proof.videoStoragePath) {
            await supabase.storage.from('proofs').remove([proof.videoStoragePath]);
          }
          await supabase.from('proofs').delete().eq('id', proof.id);
        } catch (err) {
          console.error("Auto-cleanup user error:", err);
        }
      }

      const combinedProofs = [...validProofs];

      combinedProofs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setProofs(combinedProofs);
    };

    fetchProofs();

    // Create channel synchronously - all .on() calls must happen before .subscribe()
    const channel = supabase
      .channel(`public:proofs:userId=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proofs', filter: `userId=eq.${userId}` },
        () => {
          fetchProofs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setProofs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');

    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Veuillez sélectionner une image valide (JPG, PNG).');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`L'image est trop volumineuse (Max: 5MB).`);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');

    if (file) {
      if (!file.type.startsWith('video/')) {
        setUploadError('Veuillez sélectionner un format vidéo valide (MP4, MOV, WebM).');
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setUploadError(`La vidéo est trop volumineuse (Max: 25MB).`);
        return;
      }
      setSelectedVideo(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const saveProofToFirestore = async (
    downloadURL: string,
    storagePath: string,
    fileName: string,
    size: number,
    type: string,
    videoData?: {
      videoUrl?: string;
      videoStoragePath?: string;
      videoFileName?: string;
      videoSize?: number;
      videoType?: string;
    }
  ): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const proofData: any = {
      userId: session.user.id,
      userName: session.user.user_metadata?.full_name || 'Utilisateur',
      campaignName: campaignName,
      campaignId: campaignId,
      fileName: fileName,
      storagePath: storagePath,
      downloadURL: downloadURL,
      size: size,
      type: type,
      status: 'pending',
      aiValidation: false,
      submittedAt: new Date().toISOString()
    };

    if (videoData?.videoUrl) {
      proofData.videoUrl = videoData.videoUrl;
      proofData.videoStoragePath = videoData.videoStoragePath;
      proofData.videoFileName = videoData.videoFileName;
      proofData.videoSize = videoData.videoSize;
      proofData.videoType = videoData.videoType;
    }

    const { data, error } = await supabase.from('proofs').insert(proofData).select('id').single();
    if (error) {
      console.error("Error saving proof:", error);
      return null;
    }

    return data?.id || null;
  };

  const performBackgroundAIAnalysis = async (file: File, proofId: string, userId: string, videoUrl?: string) => {
    try {
      console.log("Starting background AI analysis with image and optional video...", { hasVideo: !!videoUrl });
      const base64 = await fileToBase64(file);
      const aiResult = await validateProofWithAI(base64, proofId, videoUrl);

      const action = aiResult.suggestedAction || 'manual_review';
      console.log(`Background AI analysis completed. Action: ${action}`);

      if (action === 'approve') {
        addNotification({
          title: '✅ Preuve validée automatiquement',
          message: 'Votre preuve (capture et vidéo) a été validée avec succès ! Vos gains sont pris en compte.',
          type: 'status'
        });
      } else if (action === 'reject') {
        const fraudTypeLabel = aiResult.fraudType?.replace(/_/g, ' ') || 'fraude détectée';
        const confidencePercent = Math.round(aiResult.confidence || 0);
        addNotification({
          title: '❌ Preuve rejetée',
          message: `Votre preuve a été rejetée (${fraudTypeLabel}, ${confidencePercent}% de certitude). Motif: ${aiResult.reason || 'Non spécifié'}. Contactez le support pour plus de détails.`,
          type: 'status'
        });
      } else {
        addNotification({
          title: '⏳ Preuve en révision',
          message: 'Votre preuve est en cours de révision manuelle par notre équipe. Nous vous notifierons rapidement.',
          type: 'status'
        });
      }
    } catch (error) {
      console.error("Background AI Analysis failed:", error);
    }
  };

  const handleUpload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!selectedFile || !campaignName.trim() || !session?.user) {
      setUploadError('Veuillez sélectionner une image de capture et choisir la campagne.');
      addNotification({
        title: '⚠️ Formulaire incomplet',
        message: 'Veuillez sélectionner une image et choisir la campagne correspondante.',
        type: 'status'
      });
      return;
    }

    setIsAnalyzingAI(true);
    setIsUploading(true);
    setUploadError('');

    try {
      const timestamp = Date.now();
      const userId = session.user.id;
      const safeCampaignName = campaignName.replace(/[^a-zA-Z0-9]/g, '_');

      // 1. Upload de la capture d'écran
      const imageExtension = selectedFile.type.split('/')[1] || 'jpg';
      const imageFileName = `preuve_${safeCampaignName}_${timestamp}.${imageExtension}`;
      const imageStoragePath = `${userId}/${imageFileName}`;

      setUploadProgress(20);
      const { error: uploadImgErr } = await supabase.storage
        .from('proofs')
        .upload(imageStoragePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
      if (uploadImgErr) throw uploadImgErr;

      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(imageStoragePath);
      const downloadURL = urlData.publicUrl;
      setUploadProgress(50);

      // 2. Upload optionnel de la vidéo d'enregistrement
      let videoData: { videoUrl?: string; videoStoragePath?: string; videoFileName?: string; videoSize?: number; videoType?: string } | undefined;

      if (selectedVideo) {
        const videoExtension = selectedVideo.name.split('.').pop() || 'mp4';
        const videoFileName = `video_${safeCampaignName}_${timestamp}.${videoExtension}`;
        const videoStoragePath = `${userId}/${videoFileName}`;

        setUploadProgress(65);
        const { error: uploadVidErr } = await supabase.storage
          .from('proofs')
          .upload(videoStoragePath, selectedVideo, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadVidErr) {
          console.warn("Échec upload vidéo, continuation avec la capture:", uploadVidErr);
        } else {
          const { data: vidUrlData } = supabase.storage.from('proofs').getPublicUrl(videoStoragePath);
          videoData = {
            videoUrl: vidUrlData.publicUrl,
            videoStoragePath,
            videoFileName,
            videoSize: selectedVideo.size,
            videoType: selectedVideo.type
          };
        }
      }

      setUploadProgress(85);

      // 3. Sauvegarde dans la base de données
      const proofId = await saveProofToFirestore(
        downloadURL,
        imageStoragePath,
        imageFileName,
        selectedFile.size,
        selectedFile.type,
        videoData
      );

      setUploadProgress(100);

      // 4. Lancement de l'analyse IA croisée en arrière-plan
      if (proofId) {
        performBackgroundAIAnalysis(selectedFile, proofId, userId, videoData?.videoUrl);
      }

      addNotification({
        title: '✅ Preuve envoyée avec succès !',
        message: `Votre preuve pour "${campaignName}" ${selectedVideo ? 'avec enregistrement vidéo ' : ''}a été transmise avec succès. Analyse IA en cours...`,
        type: 'status'
      });

      setIsUploadModalOpen(false);
      setCampaignName('');
      setCampaignId('');
      setSelectedFile(null);
      setSelectedVideo(null);
      setUploadProgress(0);
      setIsUploading(false);

    } catch (error) {
      console.error("Error in upload workflow:", error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      setUploadError('Une erreur est survenue lors de la transmission de votre preuve.');
      addNotification({
        title: '❌ Erreur lors de l\'envoi',
        message: errorMessage || 'Veuillez vérifier votre connexion et réessayer.',
        type: 'status'
      });
    } finally {
      setIsAnalyzingAI(false);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!proofToDelete) return;
    setIsDeleting(true);
    try {
      if (proofToDelete.storagePath) {
        await supabase.storage.from('proofs').remove([proofToDelete.storagePath]).catch(() => { });
      }
      if (!proofToDelete.id.startsWith('p-')) {
        const { error } = await supabase.from('proofs').delete().eq('id', proofToDelete.id);
        if (error) throw error;
      } else {
        setProofs(prev => prev.filter(p => p.id !== proofToDelete.id));
      }
      setProofToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(proofs.length / ITEMS_PER_PAGE);
  const paginatedProofs = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return proofs.slice(start, start + ITEMS_PER_PAGE);
  }, [proofs, currentPage]);

  const getGainDisplay = (status: Proof['status']) => {
    switch (status) {
      case 'validated': return { text: 'Gain validé', color: 'text-green-600', icon: CheckCircle2 };
      case 'rejected': return { text: '0 FCFA', color: 'text-red-500', icon: XCircle };
      default: return { text: 'En attente', color: 'text-gray-400', icon: Clock };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Preuves</h2>
          <p className="text-gray-500">Gérez vos fichiers de preuve et suivez leur validation.</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-[#128686] hover:bg-[#0E6B6B] text-white px-8 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-[#128686]/20 transition-all flex items-center gap-2 justify-center active:scale-95"
        >
          <Upload size={18} /> Soumettre une preuve
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold">
              <tr>
                <th className="px-8 py-5">Campagne</th>
                <th className="px-8 py-5">Date & Analyse</th>
                <th className="px-8 py-5">Statut</th>
                <th className="px-8 py-5">Gains</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedProofs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 text-sm font-medium">
                    Aucune preuve soumise pour le moment.
                  </td>
                </tr>
              ) : (
                paginatedProofs.map((proof) => {
                  const gainInfo = getGainDisplay(proof.status);
                  return (
                    <tr key={proof.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 block leading-tight">{proof.campaignName}</span>
                            {proof.videoUrl && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Film size={10} /> +Vidéo
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{proof.id.substring(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-xs text-gray-500 font-bold mb-2">
                          {new Date(proof.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {proof.aiAnalysis ? (
                          <div className="flex flex-col gap-1 items-start">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${proof.aiAnalysis.fraudAlert ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#E7F4F4] text-[#128686] border-[#128686]/20'}`}>
                              {proof.aiAnalysis.fraudAlert ? <ShieldAlert size={10} /> : <BrainCircuit size={10} />}
                              {proof.aiAnalysis.fraudAlert ? 'Fraude Détectée' : `IA Confiance: ${Math.round(proof.aiAnalysis.confidence)}%`}
                            </div>
                            <button onClick={() => setAnalysisProof(proof)} className="text-[10px] text-[#128686] font-bold hover:text-[#0E6B6B] hover:underline flex items-center gap-1 ml-0.5 mt-0.5 transition-colors">
                              <Info size={10} /> Voir détails
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#128686] animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Analyse IA en cours...</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-2">
                          {proof.status === 'pending' && <span className="flex items-center gap-1.5 text-yellow-600 font-bold text-[9px] uppercase tracking-widest bg-yellow-100/50 px-3 py-1.5 rounded-full w-fit border border-yellow-100/50"><Clock size={12} /> En examen</span>}
                          {proof.status === 'validated' && <span className="flex items-center gap-1.5 text-green-600 font-bold text-[9px] uppercase tracking-widest bg-green-100/50 px-3 py-1.5 rounded-full w-fit border border-green-100/50"><CheckCircle2 size={12} /> Validé</span>}
                          {proof.status === 'rejected' && <span className="flex items-center gap-1.5 text-red-600 font-bold text-[9px] uppercase tracking-widest bg-red-100/50 px-3 py-1.5 rounded-full w-fit border border-red-100/50"><XCircle size={12} /> Refusé</span>}

                          {proof.aiAnalysis && (
                            <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2 py-1 rounded shadow-sm w-fit animate-pulse">
                              <ShieldCheck size={10} />
                              <span className="text-[8px] font-bold uppercase tracking-tighter">IA Validation</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-2 font-bold text-sm ${gainInfo.color}`}>
                          <gainInfo.icon size={14} />
                          {gainInfo.text}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewMedia({ url: proof.downloadURL, type: 'image' })}
                            className="p-2 text-[#128686] bg-[#E7F4F4] hover:bg-[#D9ECEC] rounded-xl transition-colors"
                            title="Voir la capture"
                          >
                            <Eye size={18} />
                          </button>
                          {proof.videoUrl && (
                            <button
                              onClick={() => setPreviewMedia({ url: proof.videoUrl!, type: 'video' })}
                              className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                              title="Lire l'enregistrement vidéo"
                            >
                              <Play size={18} />
                            </button>
                          )}
                          {proof.status === 'pending' && (
                            <button onClick={() => setProofToDelete(proof)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Supprimer">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={proofs.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {/* Analysis Details Modal */}
      {analysisProof && analysisProof.aiAnalysis && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAnalysisProof(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9ECEC] p-2 rounded-xl text-[#128686]"><BrainCircuit size={20} /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Analyse Intelligente</h3>
                  <p className="text-xs text-gray-500 font-medium">{analysisProof.campaignName}</p>
                </div>
              </div>
              <button onClick={() => setAnalysisProof(null)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${analysisProof.aiAnalysis.fraudAlert ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${analysisProof.aiAnalysis.fraudAlert ? 'text-red-400' : 'text-green-400'}`}>Statut Sécurité</p>
                  <div className={`flex items-center gap-2 font-bold ${analysisProof.aiAnalysis.fraudAlert ? 'text-red-700' : 'text-green-700'}`}>
                    {analysisProof.aiAnalysis.fraudAlert ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                    {analysisProof.aiAnalysis.fraudAlert ? 'Fraude Suspectée' : 'Preuve Légitime'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#E7F4F4] border border-[#128686]/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#7FD1D1]">Confiance IA</p>
                  <div className="flex items-center gap-2 font-bold text-[#0E6B6B]"><Search size={18} />{Math.round(analysisProof.aiAnalysis.confidence)}% certitude</div>
                </div>
              </div>

              {/* Scores vidéo & image détaillés */}
              <div className="grid grid-cols-2 gap-3">
                {analysisProof.aiAnalysis.imageAuthenticityConfidence !== undefined && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Authenticité Capture</p>
                    <p className="text-base font-bold text-gray-800">{analysisProof.aiAnalysis.imageAuthenticityConfidence}%</p>
                  </div>
                )}
                {analysisProof.aiAnalysis.videoAuthenticityConfidence !== undefined && (
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-purple-600">Authenticité Vidéo</p>
                    <p className="text-base font-bold text-purple-900">{analysisProof.aiAnalysis.videoAuthenticityConfidence}%</p>
                  </div>
                )}
                {analysisProof.aiAnalysis.videoConsistencyScore !== undefined && (
                  <div className="col-span-2 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600">Cohérence Capture ↔ Vidéo</p>
                      <p className="text-xs text-indigo-700 font-medium">Vérification de synchronisation des vues</p>
                    </div>
                    <span className="text-lg font-bold text-indigo-900">{analysisProof.aiAnalysis.videoConsistencyScore}%</span>
                  </div>
                )}
              </div>

              {analysisProof.aiAnalysis.viewsCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vues Détectées</span>
                  <span className="text-lg font-bold text-gray-900">{analysisProof.aiAnalysis.viewsCount} vues</span>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-gray-400" />Rapport d'analyse</h4>
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed font-medium">"{analysisProof.aiAnalysis.reason}"</div>
              </div>

              {analysisProof.videoUrl && (
                <button
                  onClick={() => {
                    const videoUrl = analysisProof.videoUrl;
                    setAnalysisProof(null);
                    if (videoUrl) setPreviewMedia({ url: videoUrl, type: 'video' });
                  }}
                  className="w-full py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={14} /> Voir la vidéo associée
                </button>
              )}

              <button onClick={() => setAnalysisProof(null)} className="w-full py-4 bg-[#128686] text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-[#128686]/20 hover:bg-[#0E6B6B] active:scale-95 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden relative max-h-[92vh] flex flex-col">
            <button onClick={() => !isUploading && setIsUploadModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors z-10"><X size={24} /></button>
            <div className="p-8 md:p-10 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="bg-[#128686] p-2.5 rounded-2xl text-white"><Upload size={22} /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Soumettre une Preuve</h3>
                  <p className="text-xs text-gray-500 font-medium">Capture d'écran + Enregistrement vidéo pour validation instantanée</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* 1. Sélection Campagne */}
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">1. Nom de la Campagne</span>
                  <div className="relative">
                    <select
                      value={campaignId}
                      onChange={(e) => {
                        const selected = campaigns.find(c => c.id === e.target.value);
                        if (selected) {
                          setCampaignId(selected.id);
                          setCampaignName(selected.title);
                        }
                      }}
                      disabled={isUploading}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pr-10 focus:ring-2 focus:ring-[#128686] outline-none font-bold transition-all focus:bg-white text-gray-900 appearance-none"
                    >
                      <option value="">Sélectionnez une campagne active...</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </label>

                {/* 2. Capture d'écran (Obligatoire) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">2. Capture d'écran (Obligatoire)</span>
                    <span className="text-[9px] font-bold text-[#128686] uppercase bg-[#E7F4F4] px-2 py-0.5 rounded-full">Requis</span>
                  </div>
                  <div className={`border-2 border-dashed rounded-[1.8rem] p-5 flex flex-col items-center justify-center transition-all relative overflow-hidden group cursor-pointer ${selectedFile ? 'border-[#7FD1D1]/60 bg-[#E7F4F4]/20' : 'border-gray-200 hover:border-[#7FD1D1]/60 hover:bg-gray-50'}`}>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileSelect} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {selectedFile ? (
                      <div className="text-center relative z-0">
                        <div className="bg-[#D9ECEC] w-10 h-10 rounded-xl flex items-center justify-center text-[#128686] mx-auto mb-2"><ImageIcon size={20} /></div>
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[220px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB • Image prête</p>
                      </div>
                    ) : (
                      <div className="text-center relative z-0">
                        <div className="bg-gray-100 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#128686] group-hover:bg-[#E7F4F4] transition-colors mx-auto mb-2"><Upload size={20} /></div>
                        <p className="text-xs font-bold text-gray-700">Choisir la capture d'écran</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 font-medium">Max 5 MB • JPG, PNG</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Enregistrement Vidéo (Optionnel / Recommandé) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Video size={12} className="text-purple-600" /> 3. Vidéo d'enregistrement d'écran
                    </span>
                    <span className="text-[9px] font-bold text-purple-700 uppercase bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Optionnel / Anti-fraude</span>
                  </div>
                  <div className={`border-2 border-dashed rounded-[1.8rem] p-5 flex flex-col items-center justify-center transition-all relative overflow-hidden group cursor-pointer ${selectedVideo ? 'border-purple-300 bg-purple-50/40' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/20'}`}>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoSelect} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {selectedVideo ? (
                      <div className="text-center relative z-0">
                        <div className="bg-purple-100 w-10 h-10 rounded-xl flex items-center justify-center text-purple-700 mx-auto mb-2"><Film size={20} /></div>
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[220px]">{selectedVideo.name}</p>
                        <p className="text-[10px] text-purple-600 font-medium mt-0.5">{(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB • Vidéo prête</p>
                      </div>
                    ) : (
                      <div className="text-center relative z-0">
                        <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform mx-auto mb-2"><Film size={20} /></div>
                        <p className="text-xs font-bold text-purple-900">Ajouter un enregistrement vidéo (5-30s)</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 font-medium">Recommandé pour validation IA accélérée • Max 25 MB</p>
                      </div>
                    )}
                  </div>
                  {selectedVideo && (
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(null)}
                      className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1 ml-1"
                    >
                      <X size={12} /> Retirer la vidéo
                    </button>
                  )}
                </div>

                {uploadError && <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3.5 rounded-2xl"><AlertCircle size={16} /><p className="text-xs font-bold">{uploadError}</p></div>}

                {(isUploading || isAnalyzingAI) && (
                  <div className="space-y-3 p-4 bg-[#E7F4F4] rounded-2xl border border-[#128686]/20 animate-pulse">
                    <div className="flex items-center gap-2 text-[#128686] font-bold text-[10px] uppercase tracking-widest">
                      <Sparkles size={14} />
                      {isAnalyzingAI ? "Analyse IA croisée (Image + Vidéo)..." : "Téléchargement sécurisé des fichiers..."}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#7FD1D1]"><span>Progression</span><span>{Math.round(uploadProgress)}%</span></div>
                      <div className="h-2 bg-[#D9ECEC] rounded-full overflow-hidden"><div className="h-full bg-[#128686] transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || isAnalyzingAI || !selectedFile || !campaignName}
                  className="w-full bg-[#128686] hover:bg-[#0E6B6B] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-[1.5rem] font-bold uppercase tracking-widest shadow-xl shadow-[#128686]/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : "Transmettre et analyser"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {proofToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-red-500 mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Êtes-vous sûr ?</h3>
            <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
              Voulez-vous vraiment supprimer cette preuve ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProofToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-2xl transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-4 text-xs font-bold uppercase tracking-widest bg-red-500 text-white rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal (Image & Video) */}
      {previewMedia && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200" style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)' }} onClick={() => setPreviewMedia(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all backdrop-blur-md z-10" onClick={() => setPreviewMedia(null)}><X size={24} /></button>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10"
              />
            ) : (
              <img src={previewMedia.url} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500" alt="Preuve" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHistory;
