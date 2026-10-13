import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase";
import { Campaign } from "../types";
import { useUserData } from "../hooks/useUserData";
import { CATEGORIES } from "../constants";
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
  PlusCircle,
  Edit3,
  Upload,
  Image as ImageIcon,
  Globe,
  X,
  Check,
  Coins,
} from "lucide-react";

interface MyCampaignsProps {
  onRetryPayment: (campaignId: string, amount: number, title?: string) => void;
  onNavigateToCreate: () => void;
}

interface CampaignStats {
  shares: number;
  clicks: number;
}

const MyCampaigns: React.FC<MyCampaignsProps> = ({
  onRetryPayment,
  onNavigateToCreate,
}) => {
  const { user } = useUserData();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Constants for campaign editing & budget
  const CPV = 5; // Coût par vue
  const VIEWS_PER_AMBASSADOR = 20; // Estimation moyenne
  const MIN_BUDGET = 1000;
  const MAX_BUDGET = 50000;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo

  const PACKS = [
    { id: "starter", label: "Starter", price: 1000, color: "bg-blue-50 border-blue-200 text-blue-700" },
    { id: "boost", label: "Boost", price: 5000, color: "bg-[#E7F4F4] border-[#9ED0D0] text-[#0E6B6B]" },
    { id: "business", label: "Business", price: 25000, color: "bg-[#E7F4F4] border-[#9ED0D0] text-[#0E6B6B]" },
    { id: "pro", label: "Pro", price: 50000, color: "bg-orange-50 border-orange-200 text-orange-700" },
  ];

  // Helper: check if a campaign is not yet paid / pending payment / failed
  const isCampaignUnpaidOrPending = (campaign: Campaign | null) => {
    if (!campaign) return false;
    const isFailed =
      campaign.paymentStatus === "failed" ||
      campaign.campaignPaymentStatus === "payment_failed" ||
      campaign.status === "failed";
    const isUnpaid =
      campaign.paymentStatus === "pending_payment" ||
      campaign.campaignPaymentStatus === "pending_payment" ||
      campaign.paymentStatus === "pending" ||
      !campaign.paymentConfirmed;
    const isPending = campaign.status === "pending";
    return !campaign.paymentConfirmed && (isUnpaid || isFailed || isPending);
  };

  // Edit Campaign State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Budget State
  const [editBudget, setEditBudget] = useState<number>(1000);
  const [editCustomAmount, setEditCustomAmount] = useState<string>("");
  const [editSelectedPackId, setEditSelectedPackId] = useState<string | null>("starter");
  const [editBudgetError, setEditBudgetError] = useState<string>("");

  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditTitle(campaign.title || "");
    setEditCategory(campaign.category || "");
    setEditDescription(campaign.description || "");
    setEditTargetUrl(campaign.targetUrl || "");
    setEditImageFile(null);
    setEditImagePreview(campaign.imageUrl || null);
    setEditError(null);
    setEditSuccess(null);

    // Initialiser le budget
    const currentBudget = campaign.totalBudget || campaign.paymentAmount || 1000;
    setEditBudget(currentBudget);
    const matchingPack = PACKS.find((p) => p.price === currentBudget);
    if (matchingPack) {
      setEditSelectedPackId(matchingPack.id);
      setEditCustomAmount("");
    } else {
      setEditSelectedPackId(null);
      setEditCustomAmount(String(currentBudget));
    }
    setEditBudgetError("");
  };

  const handleCloseEdit = () => {
    setEditingCampaign(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditError(null);
    setEditSuccess(null);
    setEditBudgetError("");
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        setEditError(
          `L'image sélectionnée est trop lourde (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de 5 Mo.`
        );
        e.target.value = "";
        return;
      }
      setEditError(null);
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditPackSelect = (pack: typeof PACKS[0]) => {
    setEditBudget(pack.price);
    setEditSelectedPackId(pack.id);
    setEditCustomAmount("");
    setEditBudgetError("");
  };

  const handleEditCustomBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setEditCustomAmount(val);
    setEditSelectedPackId(null);

    const numVal = parseInt(val, 10);
    if (isNaN(numVal)) {
      setEditBudget(0);
      return;
    }

    setEditBudget(numVal);

    if (numVal < MIN_BUDGET) {
      setEditBudgetError(`Le budget minimum est de ${MIN_BUDGET.toLocaleString()} FCFA`);
    } else if (numVal > MAX_BUDGET) {
      setEditBudgetError(`Le budget maximum est de ${MAX_BUDGET.toLocaleString()} FCFA`);
    } else {
      setEditBudgetError("");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent, proceedToPayment = false) => {
    e.preventDefault();
    if (!editingCampaign || !user) return;

    if (!editTitle.trim()) {
      setEditError("Veuillez renseigner un titre pour la campagne.");
      return;
    }
    if (!editCategory) {
      setEditError("Veuillez sélectionner une catégorie.");
      return;
    }
    if (!editDescription.trim()) {
      setEditError("Veuillez renseigner une description pour la campagne.");
      return;
    }

    const canEditBudget = isCampaignUnpaidOrPending(editingCampaign);
    if (canEditBudget) {
      if (!editBudget || editBudget < MIN_BUDGET || editBudget > MAX_BUDGET) {
        setEditError(
          `Le budget doit être compris entre ${MIN_BUDGET.toLocaleString()} et ${MAX_BUDGET.toLocaleString()} FCFA.`
        );
        return;
      }
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      let finalImageUrl = editingCampaign.imageUrl;

      if (editImageFile) {
        const timestamp = Date.now();
        const fileExt = editImageFile.name.split(".").pop() || "jpg";
        const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("campaign-visuals")
          .upload(filePath, editImageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("campaign-visuals")
          .getPublicUrl(filePath);

        finalImageUrl = urlData.publicUrl;
      }

      const updatePayload: Record<string, any> = {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        targetUrl: editTargetUrl.trim() || null,
        imageUrl: finalImageUrl,
        updatedAt: new Date().toISOString(),
      };

      if (canEditBudget) {
        const targetViews = Math.floor(editBudget / CPV);
        const estimatedAmbassadors = Math.ceil(targetViews / VIEWS_PER_AMBASSADOR);
        const remainingBudget = Math.round((editBudget / 5) * 4);
        const budgetPackLabel = editSelectedPackId
          ? PACKS.find((p) => p.id === editSelectedPackId)?.label || "Custom"
          : "Custom";

        updatePayload.totalBudget = editBudget;
        updatePayload.remainingBudget = remainingBudget;
        updatePayload.targetViews = targetViews;
        updatePayload.maxAmbassadors = estimatedAmbassadors;
        updatePayload.budgetPack = budgetPackLabel;
      }

      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updatePayload)
        .eq("id", editingCampaign.id)
        .eq("advertiserId", user.id);

      if (updateError) throw updateError;

      // Update state locally
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === editingCampaign.id ? { ...c, ...updatePayload } : c
        )
      );

      setEditSuccess("Campagne mise à jour avec succès !");

      const savedCampaignId = editingCampaign.id;
      const savedTitle = editTitle.trim();
      const savedAmount = canEditBudget
        ? editBudget
        : editingCampaign.totalBudget || editingCampaign.paymentAmount || 1000;

      setTimeout(() => {
        handleCloseEdit();
        if (proceedToPayment) {
          onRetryPayment(savedCampaignId, savedAmount, savedTitle);
        }
      }, 700);
    } catch (err: any) {
      console.error("Erreur lors de la modification de la campagne:", err);
      setEditError(
        err.message || "Une erreur est survenue lors de la mise à jour."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchUserCampaigns = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch campaigns created by user
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("advertiserId", user.id)
        .order("createdAt", { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        setStats({});
        return;
      }

      setCampaigns(campaignsData);

      // 2. Fetch shares and clicks aggregates for user's campaigns
      const campaignIds = campaignsData.map((c) => c.id);

      const { data: sharesData, error: sharesError } = await supabase
        .from("campaign_share_events")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      const { data: clicksData, error: clicksError } = await supabase
        .from("campaign_clicks")
        .select("campaign_id")
        .in("campaign_id", campaignIds);

      if (sharesError)
        console.warn("Error fetching shares count:", sharesError.message);
      if (clicksError)
        console.warn("Error fetching clicks count:", clicksError.message);

      // 3. Compute counts
      const statsMap: Record<string, CampaignStats> = {};
      campaignIds.forEach((id) => {
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
      console.error("Error loading campaigns:", err);
      setError(err.message || "Impossible de charger vos campagnes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCampaigns();
  }, [user]);

  const getStatusBadge = (campaign: Campaign) => {
    // 1. Check payment status first
    const isFailed =
      campaign.paymentStatus === "failed" ||
      campaign.campaignPaymentStatus === "payment_failed" ||
      campaign.status === "failed";

    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle size={12} />
          Paiement échoué
        </span>
      );
    }

    const isUnpaid =
      campaign.paymentStatus === "pending_payment" ||
      campaign.campaignPaymentStatus === "pending_payment";

    if (isUnpaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} />
          Attente paiement
        </span>
      );
    }

    // 2. Check admin status / approval
    if (campaign.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock size={12} />
          En révision
        </span>
      );
    }

    if (campaign.status === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={12} />
          Active
        </span>
      );
    }

    if (campaign.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <CheckCircle size={12} />
          Terminée
        </span>
      );
    }

    if (campaign.status === "paused") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          <PauseCircle size={12} />
          En pause
        </span>
      );
    }

    if (campaign.status === "rejected") {
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
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalShares = Object.values(stats).reduce(
    (acc, curr) => acc + curr.shares,
    0,
  );
  // viewsCurrent = vues réellement validées par les admins (somme de tous les proofs validés)
  const totalValidatedViews = campaigns.reduce(
    (acc, c) => acc + (c.viewsCurrent ?? 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-[#128686]" size={40} />
        <p className="text-slate-500 font-medium">
          Chargement de vos campagnes...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl my-10 p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center">
        <AlertCircle className="mx-auto text-rose-500 mb-3" size={32} />
        <h3 className="text-rose-900 font-bold mb-1">
          Une erreur est survenue
        </h3>
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
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Mes Campagnes créées
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Suivez les performances de vos campagnes publicitaires et gérez vos
            paiements.
          </p>
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
          <h3 className="text-slate-800 font-bold text-lg mb-2">
            Aucune campagne pour le moment
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Vous pouvez promouvoir votre marque, entreprise ou projet auprès de
            nos milliers d'ambassadeurs en quelques clics.
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
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                  Campagnes
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {totalCampaigns}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                  Actives
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {activeCampaigns}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
                <Share2 size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                  Partages
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {totalShares}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                  Vues validées
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {totalValidatedViews.toLocaleString()}
                </p>
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
              const progress = Math.min(
                100,
                Math.round((validatedViews / target) * 100),
              );
              const isFailed =
                campaign.paymentStatus === "failed" ||
                campaign.campaignPaymentStatus === "payment_failed" ||
                campaign.status === "failed";
              const isUnpaid =
                campaign.paymentStatus === "pending_payment" ||
                campaign.campaignPaymentStatus === "pending_payment";

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
                      <h3 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2">
                        {campaign.title}
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Créée le{" "}
                        {new Date(campaign.createdAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                      <p className="text-slate-600 text-sm mt-3 line-clamp-3">
                        {campaign.description}
                      </p>
                    </div>

                    {/* Progress bar (vues validées vs objectif) */}
                    {!isUnpaid && !isFailed && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            VUES VALIDÉES
                          </span>
                          <span className="text-[#0E6B6B]">
                            {validatedViews.toLocaleString()} /{" "}
                            {target.toLocaleString()} ({progress}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background:
                                progress >= 100
                                  ? "linear-gradient(90deg, #0E6B6B, #2BA8A8)"
                                  : "linear-gradient(90deg, #D14E04, #FB7A28)",
                            }}
                          />
                        </div>
                        {/* Clics bruts (trafic) en métrique secondaire */}
                        <p className="text-[11px] text-slate-400">
                          {cStats.clicks.toLocaleString()} clic
                          {cStats.clicks > 1 ? "s" : ""} de trafic ·{" "}
                          {cStats.shares.toLocaleString()} partage
                          {cStats.shares > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}

                    {/* Financial details */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Budget Total
                        </span>
                        <span className="text-base font-bold text-[#062127]">
                          {(
                            campaign.totalBudget ||
                            campaign.paymentAmount ||
                            0
                          ).toLocaleString()}{" "}
                          F
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Budget restant
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                          {(
                            campaign.remainingBudget ??
                            campaign.totalBudget ??
                            0
                          ).toLocaleString()}{" "}
                          F
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Coût / Vue
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                          {campaign.cpv || 0} F
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(campaign)}
                        className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                      >
                        <Edit3 size={14} />
                        Modifier
                      </button>

                      {(isUnpaid || isFailed) && (
                        <button
                          onClick={() =>
                            onRetryPayment(
                              campaign.id,
                              campaign.totalBudget || campaign.paymentAmount || 1000,
                              campaign.title,
                            )
                          }
                          className={`flex-1 py-2.5 px-3 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition duration-200 cursor-pointer ${
                            isFailed
                              ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/10"
                              : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/10"
                          }`}
                        >
                          <CreditCard size={14} />
                          {isFailed ? "Réessayer" : "Payer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de modification de campagne */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto scrollbar-hide">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F4F4] text-[#128686] flex items-center justify-center font-bold">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Modifier la campagne</h3>
                  <p className="text-xs text-slate-400 font-medium">Mettez à jour les informations de votre annonce</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={isSavingEdit}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-center gap-2 p-3.5 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-bold">
                <AlertCircle size={18} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-xs font-bold">
                <CheckCircle size={18} className="shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Titre de l'offre
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#128686] focus:bg-white transition-all text-sm"
                  placeholder="Ex: Promo Pizza 2 achetées = 1 offerte"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Catégorie
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#128686] focus:bg-white transition-all text-sm"
                  required
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {editCategory && !CATEGORIES.includes(editCategory) && (
                    <option value={editCategory}>{editCategory}</option>
                  )}
                </select>
              </div>

              {/* SECTION BUDGET */}
              {isCampaignUnpaidOrPending(editingCampaign) ? (
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#E7F4F4] text-[#128686]">
                        <Coins size={15} />
                      </div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Budget de la campagne
                      </label>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Modifiable avant paiement
                    </span>
                  </div>

                  {/* Packs prédéfinis */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => handleEditPackSelect(pack)}
                        className={`p-2.5 rounded-xl border-2 transition-all text-left flex flex-col justify-between ${
                          editSelectedPackId === pack.id
                            ? "border-[#128686] ring-2 ring-[#9ED0D0] bg-[#E7F4F4]/50"
                            : "border-slate-200 hover:border-[#9ED0D0] bg-white"
                        }`}
                      >
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded w-fit mb-1 ${pack.color}`}
                        >
                          {pack.label}
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {pack.price.toLocaleString()} F
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            ~{Math.floor(pack.price / CPV)} vues
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Montant personnalisé */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">
                        Autre montant :
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editCustomAmount}
                      onChange={handleEditCustomBudgetChange}
                      className={`w-full bg-white border-2 rounded-xl py-2.5 pl-28 pr-12 text-sm font-bold text-slate-900 outline-none transition-all ${
                        editBudgetError
                          ? "border-red-300 bg-red-50 text-red-900"
                          : "border-slate-200 focus:border-[#128686]"
                      }`}
                      placeholder="5000"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">FCFA</span>
                    </div>
                  </div>

                  {editBudgetError && (
                    <div className="flex items-center gap-1.5 text-red-600 bg-red-50 p-2.5 rounded-xl text-xs font-bold">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{editBudgetError}</span>
                    </div>
                  )}

                  {/* Résumé des estimations */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">
                        Objectif :{" "}
                        <strong className="text-slate-800 font-extrabold">
                          ~{Math.floor(editBudget / CPV).toLocaleString()} vues
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-medium">
                        Mobilisation :{" "}
                        <strong className="text-[#128686] font-extrabold">
                          ~{Math.ceil(Math.floor(editBudget / CPV) / VIEWS_PER_AMBASSADOR)} ambassadeurs
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      CPV 5 FCFA
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Budget de la campagne
                      </span>
                      <span className="text-base font-extrabold text-slate-800">
                        {(
                          editingCampaign.totalBudget ||
                          editingCampaign.paymentAmount ||
                          0
                        ).toLocaleString()}{" "}
                        FCFA
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={12} />
                      Validé & payé
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Le budget ne peut plus être modifié une fois la campagne active ou payée.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Consignes / Description (Max 300 caractères)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={300}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#128686] focus:bg-white transition-all text-sm min-h-[90px]"
                  placeholder="Décrivez ce que l'ambassadeur doit mettre en avant..."
                  required
                />
                <p className="text-[10px] text-slate-400 text-right mt-1 font-semibold">
                  {editDescription.length}/300 caractères
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Lien de redirection (Optionnel)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="url"
                    value={editTargetUrl}
                    onChange={(e) => setEditTargetUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-10 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#128686] focus:bg-white transition-all text-sm"
                    placeholder="https:// ou wa.me/..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                  Visuel de la campagne (Max 5 Mo)
                </label>
                <div
                  onClick={() => editFileInputRef.current?.click()}
                  className="relative w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#128686] bg-slate-50 hover:bg-slate-100/50 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
                >
                  {editImagePreview ? (
                    <>
                      <img src={editImagePreview} alt="Aperçu" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white gap-2 font-bold text-xs">
                        <Upload size={18} />
                        Changer le visuel
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <ImageIcon size={28} />
                      <span className="text-xs font-bold text-slate-600">Cliquez pour modifier l'image</span>
                      <span className="text-[10px]">PNG, JPG, WEBP (Max 5 Mo)</span>
                    </div>
                  )}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditImageSelect}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || (isCampaignUnpaidOrPending(editingCampaign) && !!editBudgetError)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Enregistrer
                    </>
                  )}
                </button>
                {isCampaignUnpaidOrPending(editingCampaign) && (
                  <button
                    type="button"
                    onClick={(e) => handleSaveEdit(e, true)}
                    disabled={isSavingEdit || !!editBudgetError}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#128686] to-[#0E6B6B] hover:from-[#0E6B6B] hover:to-[#0B5454] active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#128686]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard size={14} />
                    Enregistrer & Payer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCampaigns;
