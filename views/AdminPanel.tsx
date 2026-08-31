import React, { useState, useEffect, useMemo } from 'react';
import { Proof, Notification, Campaign, User, UserRole, Withdrawal } from '../types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import {
  Check, X, Eye, AlertTriangle, Users, Clock, Key, Ban,
  Activity, CheckCircle2, Banknote, Search,
  Loader2, ChevronLeft, ChevronRight, Wallet, Shield, Mail, ShieldCheck, UserPlus, Trash2, ArrowRight,
  Pencil, Pause, Play, BarChart2, ChevronDown,
  Megaphone, PauseCircle, Zap, CreditCard, DollarSign, RefreshCcw,
  TrendingUp, Target, ArrowUpRight, Sparkles
} from 'lucide-react';

import { supabase } from '../supabase';
import { useUserData } from '../hooks/useUserData';
import { gomboAdminApproveWithdrawal, gomboAdminRejectWithdrawal, gomboCheckTransactionStatus } from '../services/gomboPlus';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 6;

const StatCard: React.FC<{ title: string; value: string; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600'
  };
  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1">
      <div className={`${colorMap[color] || 'bg-gray-100 text-gray-600'} p-4 rounded-2xl shadow-inner`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
};

interface AdminPanelProps {
  proofs: (Proof & { campaignTitle: string; userName: string })[];
  setProofs: React.Dispatch<React.SetStateAction<(Proof & { campaignTitle: string; userName: string })[]>>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  activeTab?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ proofs: propProofs, setProofs, addNotification, activeTab }) => {
  const [view, setView] = useState<'overview' | 'validation' | 'users' | 'payouts' | 'team' | 'campaigns' | 'withdrawals' | 'campaignPayments' | 'gomboChecker'>('overview');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [statsCampaign, setStatsCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const { userData: currentAdminData, isStaff } = useUserData();

  const isSuperAdmin = currentAdminData?.role === UserRole.ADMIN;

  const [allProofs, setAllProofs] = useState<Proof[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allPayouts, setAllPayouts] = useState<Withdrawal[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [campaignShareEvents, setCampaignShareEvents] = useState<any[]>([]);
  const [campaignClickEvents, setCampaignClickEvents] = useState<any[]>([]);

  const userById = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<null | {
    title: string;
    message: string;
    variant?: 'success' | 'warning' | 'danger' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
  }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const confirmActionRef = React.useRef<null | (() => Promise<void> | void)>(null);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const [campaignPage, setCampaignPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [campaignPaymentPage, setCampaignPaymentPage] = useState(1);

  const [validatingProof, setValidatingProof] = useState<Proof | null>(null);
  const [viewsInput, setViewsInput] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [rejectingProof, setRejectingProof] = useState<Proof | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [processingWithdrawals, setProcessingWithdrawals] = useState<Set<string>>(new Set());
  const [wasBudgetLimited, setWasBudgetLimited] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState<Set<string>>(new Set());
  const [gomboRefInput, setGomboRefInput] = useState('');
  const [gomboCheckResult, setGomboCheckResult] = useState<any>(null);
  const [isCheckingGombo, setIsCheckingGombo] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // --- Financial & Operational Filters ---
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('pending');
  const [operatorFilter, setOperatorFilter] = useState<'all' | 'yas' | 'moov'>('all');

  // --- Proof Validation Filters ---
  const [proofStatusFilter, setProofStatusFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('pending');
  const [suggestedActionFilter, setSuggestedActionFilter] = useState<'all' | 'approve' | 'reject' | 'manual_review'>('all');

  // --- Real-time Listeners ---
  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.warn("Permission Users denied", error);
    } else if (data) {
      setAllUsers(data);
    }
  };

  const fetchAllProofs = async () => {
    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .order('submittedAt', { ascending: false });
    if (error) {
      console.warn("Permission Proofs denied", error);
    } else if (data) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Separate valid and expired
      const valid = data.filter(p => {
        const d = toJsDate(p.submittedAt);
        return d && d >= cutoff;
      });

      const expired = data.filter(p => {
        const d = toJsDate(p.submittedAt);
        return d && d < cutoff;
      });

      // Auto cleanup expired
      expired.forEach(async (proof) => {
        try {
          if (proof.storagePath) {
            await supabase.storage.from('proofs').remove([proof.storagePath]).catch(() => { });
          }
          await supabase.from('proofs').delete().eq('id', proof.id);
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      });

      setAllProofs(valid);
    }
  };

  const fetchAllCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.warn("Permission Campaigns denied", error);
    } else if (data) {
      setAllCampaigns(data);
    }
  };

  const fetchAllPayouts = async () => {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.warn("Permission Payouts denied", error);
    } else if (data) {
      setAllPayouts(data);
    }
  };

  const fetchCampaignShareEvents = async () => {
    const { data, error } = await supabase
      .from('campaign_share_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Permission campaign_share_events denied', error);
      setCampaignShareEvents([]);
    } else if (data) {
      const normalized = (data || []).map((event: any) => ({
        ...event,
        campaignId: event.campaign_id ?? event.campaignId ?? event.campaign ?? null,
        createdAt: event.created_at ?? event.createdAt ?? event.timestamp ?? null,
        platform: event.platform ?? event.platforms ?? event.platformName ?? 'unknown'
      }));
      setCampaignShareEvents(normalized);
    }
  };

  const fetchCampaignClickEvents = async () => {
    const { data, error } = await supabase
      .from('campaign_clicks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Permission campaign_clicks denied', error);
      setCampaignClickEvents([]);
    } else if (data) {
      const normalized = (data || []).map((event: any) => ({
        ...event,
        campaignId: event.campaign_id ?? event.campaignId ?? event.campaign ?? null,
        createdAt: event.created_at ?? event.createdAt ?? event.timestamp ?? null,
        platform: event.platform ?? event.platformName ?? 'unknown'
      }));
      setCampaignClickEvents(normalized);
    }
  };

  useEffect(() => {
    if (!isStaff) return;

    fetchAllUsers();
    fetchAllProofs();
    fetchAllCampaigns();
    fetchAllPayouts();
    fetchCampaignShareEvents();
    fetchCampaignClickEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('public:admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { fetchAllUsers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' }, () => { fetchAllProofs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => { fetchAllCampaigns(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => { fetchAllPayouts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_share_events' }, () => { fetchCampaignShareEvents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_clicks' }, () => { fetchCampaignClickEvents(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff]);

  // Sync with Sidebar Tabs
  useEffect(() => {
    if (!activeTab) return;
    if (activeTab === 'admin-dashboard') setView('overview');
    else if (activeTab === 'admin-validation') setView('validation');
    else if (activeTab === 'admin-campaigns') setView('campaigns');
    else if (activeTab === 'admin-users' && isSuperAdmin) setView('users');
    else if (activeTab === 'admin-payouts' && isSuperAdmin) setView('payouts');
    else if (activeTab === 'admin-team' && isSuperAdmin) setView('team');
    else if (activeTab === 'admin-withdrawals') setView('withdrawals');
    else if (activeTab === 'admin-campaign-payments' && isSuperAdmin) setView('campaignPayments');
    else if (activeTab === 'admin-gombo-status' && isSuperAdmin) setView('gomboChecker');
  }, [activeTab, isSuperAdmin]);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAdminFeedback({ message, type });
    setTimeout(() => setAdminFeedback(null), 3000);
  };

  const closeConfirmModal = (force = false) => {
    if (confirmBusy && !force) return;
    setConfirmModal(null);
    confirmActionRef.current = null;
    setConfirmBusy(false);
  };

  const openConfirmModal = (
    config: NonNullable<typeof confirmModal>,
    action: () => Promise<void> | void
  ) => {
    confirmActionRef.current = action;
    setConfirmBusy(false);
    setConfirmModal(config);
  };

  const runConfirmAction = async () => {
    const action = confirmActionRef.current;
    if (!action) return;
    setConfirmBusy(true);
    try {
      await action();
      closeConfirmModal(true);
    } catch (e: any) {
      console.error(e);
      showFeedback(`Erreur: ${e?.message || 'Inconnue'}`, 'error');
      setConfirmBusy(false);
    }
  };

  useEffect(() => {
    if (!confirmModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirmModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmModal, confirmBusy]);

  const normalizePayoutStatus = (raw: any): 'pending' | 'completed' | 'failed' => {
    const s = String(raw ?? 'pending').trim().toLowerCase();
    if (['completed', 'complete', 'success', 'succeeded', 'paid', 'valide', 'validé', 'validee', 'validee', 'done'].includes(s)) return 'completed';
    if (['failed', 'fail', 'error', 'rejected', 'refused', 'annule', 'annulé', 'cancelled', 'canceled', 'ko'].includes(s)) return 'failed';
    return 'pending';
  };

  const toJsDate = (value: any): Date | null => {
    if (!value) return null;
    try {
      if (typeof value?.toDate === 'function') return value.toDate();
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    } catch {
      return null;
    }
  };

  const formatDate = (value: any) => {
    if (!value) return '-';
    try {
      // Firestore Timestamp support (has toDate())
      if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString();
      return new Date(value).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const handleAddStaffMember = async () => {
    if (!newMemberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      const userToPromote = allUsers.find(u => u.email?.toLowerCase() === newMemberEmail.toLowerCase());
      if (!userToPromote) {
        showFeedback("Utilisateur non trouvé avec cet email.", "error");
        setIsAddingMember(false);
        return;
      }
      await supabase.from('users').update({ role: UserRole.MODERATOR }).eq('id', userToPromote.id);
      showFeedback(`${userToPromote.name} a été promu Modérateur !`);
      setNewMemberEmail('');
      setShowAddMemberModal(false);
    } catch (e) {
      showFeedback("Erreur lors de l'ajout.", "error");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDemoteMember = async (userId: string) => {
    const sessionRes = await supabase.auth.getSession();
    const currentUserId = sessionRes.data.session?.user.id;
    if (!isSuperAdmin || userId === currentUserId) return;

    const member = allUsers.find(u => u.id === userId);
    openConfirmModal(
      {
        variant: 'warning',
        title: "Retirer les droits d'administration ?",
        message: `Confirmez la rétrogradation${member?.name ? ` de ${member.name}` : ''} en Ambassadeur.`,
        confirmLabel: 'Rétrograder',
        cancelLabel: 'Annuler'
      },
      async () => {
        try {
          await supabase.from('users').update({ role: UserRole.AMBASSADOR }).eq('id', userId);
          showFeedback("Membre rétrogradé en Ambassadeur.");
        } catch (e) {
          showFeedback("Erreur lors de la rétrogradation.", "error");
        }
      }
    );
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?mode=resetPassword` });
      showFeedback(`Email de réinitialisation envoyé à ${email}`, 'success');
    } catch (e) {
      showFeedback("Erreur lors de l'envoi de l'email.", "error");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;
    try {
      await supabase.from('users').update({ role: newRole }).eq('id', userId);
      showFeedback(`Rôle de l'utilisateur mis à jour.`);
    } catch (e) {
      showFeedback("Erreur de mise à jour.", "error");
    }
  };

  const handleToggleUserBlock = async (userId: string, currentStatus: string) => {
    if (!isSuperAdmin) return;
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await supabase.from('users').update({ status: newStatus }).eq('id', userId);
      showFeedback(newStatus === 'active' ? "Utilisateur débloqué" : "Utilisateur bloqué", "info");
    } catch (e) { showFeedback("Erreur", "error"); }
  };

  const handleDeleteUser = (user: User) => {
    if (!isSuperAdmin) return;
    openConfirmModal(
      {
        variant: 'danger',
        title: "Supprimer définitivement l'utilisateur ?",
        message: `Voulez-vous vraiment supprimer ${user.name || 'cet utilisateur'} (${user.email || 'Pas d\'email'}) ? Toutes ses données (solde, preuves, historique) seront perdues. Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler'
      },
      async () => {
        try {
          await supabase.from('users').delete().eq('id', user.id);
          showFeedback("Utilisateur supprimé avec succès.", "success");
        } catch (e: any) {
          console.error(e);
          showFeedback(`Erreur lors de la suppression : ${e?.message || 'Inconnue'}`, 'error');
        }
      }
    );
  };

  const deleteProof = async (proof: Proof) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("proofs")
        .remove([proof.storagePath]);

      if (storageError) {
        console.warn("Impossible de supprimer le fichier :", storageError);
      }

      const { error: dbError } = await supabase
        .from("proofs")
        .delete()
        .eq("id", proof.id);

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleConfirmValidation = async () => {
    if (!validatingProof || !viewsInput) return;
    setIsValidating(true);
    try {
      const views = parseInt(viewsInput);
      const campaign = allCampaigns.find(c => c.id === validatingProof.campaignId);

      if (!campaign) {
        showFeedback("Campagne introuvable", "error");
        return;
      }

      const cpv = campaign.cpv ?? 5;
      const earnings = views * cpv;
      const remainingBudget = campaign.remainingBudget ?? 0;
      const viewsCurrent = campaign.viewsCurrent ?? 0;

      // Vérification du budget restant
      if (earnings > remainingBudget) {
        const maxViews = Math.floor(remainingBudget / cpv);
        showFeedback(`Budget insuffisant. Il reste ${remainingBudget.toLocaleString()} FCFA, soit ${maxViews.toLocaleString()} vues maximum.`, "error");
        setWasBudgetLimited(true);
        return;
      }

      // Update proof
      const { error: proofErr } = await supabase
        .from('proofs')
        .update({
          status: 'validated',
          viewsCount: views
        })
        .eq('id', validatingProof.id)
        .eq('userId', validatingProof.userId);

      if (proofErr) console.error("Erreur de mise à jour de la preuve:", proofErr);

      // Get user profile to calculate increments and retrieve email
      const { data: userProfile, error: fetchErr } = await supabase
        .from('users')
        .select('balance, totalEarned, email')
        .eq('id', validatingProof.userId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentBalance = userProfile?.balance ?? 0;
      const currentTotalEarned = userProfile?.totalEarned ?? 0;

      // Update user balances
      await supabase
        .from('users')
        .update({
          balance: currentBalance + earnings,
          totalEarned: currentTotalEarned + earnings
        })
        .eq('id', validatingProof.userId);

      await supabase
        .from('campaigns')
        .update({
          remainingBudget: remainingBudget - earnings,
          viewsCurrent: viewsCurrent + views,
        })
        .eq('id', campaign.id);

      // Notification personnalisée si le budget était limité
      const notificationMessage = wasBudgetLimited
        ? `Votre preuve a été validée, mais le budget restant de la campagne ne permettait pas de rémunérer la totalité de vos vues. +${earnings.toLocaleString()} FCFA ajoutés.`
        : `Votre preuve a été validée. +${earnings.toLocaleString()} FCFA ajoutés à votre solde.`;

      await supabase
        .from('notifications')
        .insert({
          userId: validatingProof.userId,
          title: wasBudgetLimited ? 'Rémunération plafonnée' : 'Preuve validée !',
          message: notificationMessage,
          type: 'payout',
          read: false,
          createdAt: new Date().toISOString()
        });

      // Envoi de l'email de confirmation de preuve validée à l'ambassadeur
      // if (userProfile?.email) {
      //   supabase.functions.invoke('send-email', {
      //     body: {
      //       to: userProfile.email,
      //       type: 'validated',
      //       data: {
      //         userName: validatingProof.userName || 'Ambassadeur',
      //         campaignTitle: campaign.title || validatingProof.campaignName || 'Campagne',
      //         views,
      //         earnings,
      //       }
      //     }
      //   }).catch(err => console.error("Erreur d'envoi de l'email de validation de preuve:", err));
      // }

      if (validatingProof?.userId) {
        supabase.functions.invoke('send-push-notification', {
          body: {
            userId: validatingProof.userId,
            title: 'Preuve validée ✅',
            body: `+${earnings} FCFA pour "${campaign.title || validatingProof.campaignName || 'votre campagne'}"`,
            data: {
              type: 'proof_validated',
              url: '/#/app/wallet',
            },
          },
        }).catch(err => console.error("Erreur d'envoi de la notification de validation:", err));
      }

      showFeedback(`Preuve validée ! +${earnings.toLocaleString()} FCFA crédités.`);
      setValidatingProof(null);
      // await deleteProof(validatingProof);
      setViewsInput('');
      setWasBudgetLimited(false);

    } catch (e) {
      showFeedback("Erreur lors de la validation", "error");
      console.error(e);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRejectProof = async () => {
    if (!rejectingProof || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      const { error: proofErr } = await supabase
        .from('proofs')
        .update({
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        })
        .eq('id', rejectingProof.id)
        .eq('userId', rejectingProof.userId);

      if (proofErr) console.error("Erreur de mise à jour de la preuve:", proofErr);

      await supabase
        .from('notifications')
        .insert({
          userId: rejectingProof.userId,
          title: 'Preuve refusée',
          message: `Votre preuve pour la campagne ${rejectingProof.campaignName} a été refusée. Motif : ${rejectionReason.trim()}`,
          type: 'status',
          read: false,
          createdAt: new Date().toISOString()
        });

      // Envoi de l'email de refus de preuve à l'ambassadeur
      // const { data: user, error: fetchErr } = await supabase
      //   .from('users')
      //   .select('email')
      //   .eq('id', rejectingProof.userId)
      //   .single();

      // if (!fetchErr && user?.email) {
      //   supabase.functions.invoke('send-email', {
      //     body: {
      //       to: user.email,
      //       type: 'rejected',
      //       data: {
      //         userName: rejectingProof.userName || 'Ambassadeur',
      //         campaignTitle: rejectingProof.campaignName || 'Campagne',
      //         reason: rejectionReason.trim()
      //       }
      //     }
      //   }).catch(err => console.error("Erreur d'envoi de l'email de refus de preuve:", err));
      // }

      if (validatingProof?.userId) {
        supabase.functions.invoke('send-push-notification', {
          body: {
            userId: validatingProof.userId,
            title: 'Preuve Refusée ❌',
            body: `Votre preuve pour la ${rejectingProof.campaignName || 'campagne'} a été refusée. Motif : ${rejectionReason.trim()}`,
            data: {
              type: 'rejected',
              url: '/#/app/wallet',
            },
          },
        }).catch(err => console.error("Erreur d'envoi de la notification de validation:", err));
      }

      // await deleteProof(rejectingProof);

      showFeedback("Preuve refusée avec succès", "info");
      setRejectingProof(null);
      setRejectionReason('');
    } catch (e) {
      showFeedback("Erreur lors du refus", "error");
      console.error(e);
    }
    finally { setIsRejecting(false); }
  };

  const stats = useMemo(() => ({
    totalInscrits: allUsers.length,
    pendingProofs: allProofs.filter(p => p.status === 'pending').length,
    totalDistribute: allPayouts.reduce((acc, p) => acc + (normalizePayoutStatus(p.status) === 'completed' ? p.amount : 0), 0),
    userDebt: allUsers.reduce((acc, u) => acc + (u.balance || 0), 0)
  }), [allUsers, allProofs, allPayouts]);

  const financialStats = useMemo(() => {
    const totalRevenue = allCampaigns.reduce((acc, c) => acc + (c.totalBudget || 0), 0);
    const totalPayouts = stats.totalDistribute;
    const totalDebt = stats.userDebt;
    const netProfit = totalRevenue - totalPayouts - totalDebt;
    return { totalRevenue, totalPayouts, totalDebt, netProfit };
  }, [allCampaigns, stats]);

  const campaignAnalytics = useMemo(() => {
    const campaignStats = allCampaigns.map((campaign) => {
      const shares = campaignShareEvents.filter(event => (event.campaignId ?? event.campaign_id) === campaign.id).length;
      const clicks = campaignClickEvents.filter(event => (event.campaignId ?? event.campaign_id) === campaign.id).length;
      const conversionRate = shares > 0 ? (clicks / shares) * 100 : 0;
      const platforms: Record<string, number> = {};

      campaignShareEvents
        .filter(event => (event.campaignId ?? event.campaign_id) === campaign.id)
        .forEach((event) => {
          const platform = String(event.platform || 'unknown').toLowerCase();
          platforms[platform] = (platforms[platform] || 0) + 1;
        });

      return {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        budget: campaign.totalBudget || 0,
        shares,
        clicks,
        conversionRate,
        engagementScore: shares + clicks * 2,
        platformBreakdown: Object.entries(platforms).map(([name, value]) => ({ name, value })),
        lastActivity: [...campaignShareEvents.filter(event => (event.campaignId ?? event.campaign_id) === campaign.id), ...campaignClickEvents.filter(event => (event.campaignId ?? event.campaign_id) === campaign.id)]
          .map(event => toJsDate(event.createdAt ?? event.created_at))
          .filter((value): value is Date => value !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0] || null
      };
    });

    const sorted = [...campaignStats].sort((a, b) => b.engagementScore - a.engagementScore);
    const totalShares = sorted.reduce((acc, item) => acc + item.shares, 0);
    const totalClicks = sorted.reduce((acc, item) => acc + item.clicks, 0);
    const conversionRate = totalShares > 0 ? (totalClicks / totalShares) * 100 : 0;

    const platformTotals: Record<string, number> = {};
    campaignShareEvents.forEach((event) => {
      const platform = String(event.platform || 'unknown').toLowerCase();
      platformTotals[platform] = (platformTotals[platform] || 0) + 1;
    });

    const platformChart = Object.entries(platformTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      campaigns: sorted,
      totalShares,
      totalClicks,
      conversionRate,
      activeCampaigns: allCampaigns.filter(c => c.status === 'active').length,
      bestCampaign: sorted[0] || null,
      platformChart
    };
  }, [allCampaigns, campaignShareEvents, campaignClickEvents]);

  const topEarners = useMemo(() => {
    return [...allUsers]
      .filter(u => (u.totalEarned || 0) > 0)
      .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
      .slice(0, 10);
  }, [allUsers]);

  const filteredWithdrawals = useMemo(() => {
    return allPayouts.filter(p => {
      const matchesSearch = (p.userName || '').toLowerCase().includes(withdrawalSearch.toLowerCase()) ||
        (p.phone || '').includes(withdrawalSearch);
      const matchesStatus = withdrawalStatusFilter === 'all' || normalizePayoutStatus(p.status) === withdrawalStatusFilter;
      const matchesOperator = operatorFilter === 'all' || p.provider === operatorFilter;
      return matchesSearch && matchesStatus && matchesOperator;
    });
  }, [allPayouts, withdrawalSearch, withdrawalStatusFilter, operatorFilter]);

  const handleManualGomboCheck = async () => {
    if (!gomboRefInput.trim()) {
      showFeedback("Veuillez entrer une référence de transaction.", "error");
      return;
    }
    setIsCheckingGombo(true);
    setGomboCheckResult(null);
    try {
      const result = await gomboCheckTransactionStatus({ transaction_reference: gomboRefInput.trim() });
      setGomboCheckResult(result);
      showFeedback("Vérification terminée.");
    } catch (err: any) {
      console.error("Gombo Check Error:", err);
      showFeedback("Erreur lors de la vérification : " + (err.message || "Inconnue"), "error");
    } finally {
      setIsCheckingGombo(false);
    }
  };

  const proofStatusChart = useMemo(() => {
    const pending = allProofs.filter(p => p.status === 'pending').length;
    const validated = allProofs.filter(p => p.status === 'validated').length;
    const rejected = allProofs.filter(p => p.status === 'rejected').length;
    return [
      { name: 'En attente', value: pending, color: '#f59e0b' },
      { name: 'Validées', value: validated, color: '#10b981' },
      { name: 'Rejetées', value: rejected, color: '#ef4444' }
    ];
  }, [allProofs]);

  const payoutStatusChart = useMemo(() => {
    const counts = { pending: 0, completed: 0, failed: 0 };
    for (const p of allPayouts) counts[normalizePayoutStatus(p.status)]++;
    return [
      { name: 'En attente', value: counts.pending, color: '#f59e0b' },
      { name: 'Validés', value: counts.completed, color: '#10b981' },
      { name: 'Rejetés', value: counts.failed, color: '#ef4444' }
    ];
  }, [allPayouts]);

  const campaignStatusChart = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const c of allCampaigns) {
      const k = String(c.status ?? 'pending');
      buckets[k] = (buckets[k] ?? 0) + 1;
    }
    const order = ['pending', 'active', 'paused', 'completed', 'rejected'];
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      active: '#10b981',
      paused: '#6366f1',
      completed: '#9ca3af',
      rejected: '#ef4444'
    };
    return [...order, ...Object.keys(buckets)].filter((v, i, a) => a.indexOf(v) === i && buckets[v] !== undefined).map((k) => ({
      name: k,
      value: buckets[k] ?? 0,
      color: colors[k] ?? '#94a3b8'
    }));
  }, [allCampaigns]);

  const payoutTrend14d = useMemo(() => {
    // Aggregate last 14 days by local date string (dd/mm/yyyy depends on locale)
    const map = new Map<string, { date: Date; requested: number; paid: number }>();
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 13);
    cutoff.setHours(0, 0, 0, 0);

    for (const p of allPayouts) {
      const d = toJsDate(p.date);
      if (!d) continue;
      if (d < cutoff) continue;
      const key = d.toDateString();
      const row = map.get(key) ?? { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), requested: 0, paid: 0 };
      const status = normalizePayoutStatus(p.status);
      if (status === 'completed') row.paid += (p.amount || 0);
      else row.requested += (p.amount || 0);
      map.set(key, row);
    }

    const rows = Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    // Fill missing days for nicer chart
    const filled: { day: string; requested: number; paid: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(cutoff);
      d.setDate(cutoff.getDate() + i);
      const key = d.toDateString();
      const row = map.get(key);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      filled.push({ day: label, requested: row?.requested ?? 0, paid: row?.paid ?? 0 });
    }
    return filled;
  }, [allPayouts]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allUsers, searchTerm]);

  const teamMembers = useMemo(() => {
    return allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.MODERATOR);
  }, [allUsers]);

  const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  // Pagination for Campaigns
  const totalCampaignPages = Math.ceil(allCampaigns.length / ITEMS_PER_PAGE);
  const paginatedCampaigns = useMemo(() => {
    const start = (campaignPage - 1) * ITEMS_PER_PAGE;
    return allCampaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [allCampaigns, campaignPage]);

  // Pagination for Team
  const totalTeamPages = Math.ceil(teamMembers.length / ITEMS_PER_PAGE);
  const paginatedTeam = useMemo(() => {
    const start = (teamPage - 1) * ITEMS_PER_PAGE;
    return teamMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [teamMembers, teamPage]);

  // Pagination for Payouts
  const totalPayoutPages = Math.ceil(allPayouts.length / ITEMS_PER_PAGE);
  const paginatedPayouts = useMemo(() => {
    const start = (payoutPage - 1) * ITEMS_PER_PAGE;
    return allPayouts.slice(start, start + ITEMS_PER_PAGE);
  }, [allPayouts, payoutPage]);

  // Pagination for Withdrawals
  const totalWithdrawalPages = Math.ceil(filteredWithdrawals.length / ITEMS_PER_PAGE);
  const paginatedWithdrawals = useMemo(() => {
    const start = (withdrawalPage - 1) * ITEMS_PER_PAGE;
    return filteredWithdrawals.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWithdrawals, withdrawalPage]);

  // Pagination for Campaign Payments
  const campaignPaymentsList = useMemo(() =>
    allCampaigns.filter(c => c.createdBy === 'user' || c.createdBy === undefined),
    [allCampaigns]
  );
  const totalCampaignPaymentPages = Math.ceil(campaignPaymentsList.length / ITEMS_PER_PAGE);
  const paginatedCampaignPayments = useMemo(() => {
    const start = (campaignPaymentPage - 1) * ITEMS_PER_PAGE;
    return campaignPaymentsList.slice(start, start + ITEMS_PER_PAGE);
  }, [campaignPaymentsList, campaignPaymentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">

      {/* ── Toast Notification ── */}
      {adminFeedback && (
        <div
          className={`fixed top-24 right-4 z-[200] px-6 py-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${adminFeedback.type === 'success'
            ? 'bg-green-600 text-white border-green-500/20'
            : adminFeedback.type === 'error'
              ? 'bg-red-600 text-white border-red-500/20'
              : 'bg-gray-900 text-white border-white/10'
            }`}
        >
          {adminFeedback.type === 'success' ? (
            <CheckCircle2 size={24} />
          ) : adminFeedback.type === 'error' ? (
            <AlertTriangle size={24} />
          ) : (
            <Clock size={24} />
          )}
          <p className="font-bold text-sm">{adminFeedback.message}</p>
          <button
            onClick={() => setAdminFeedback(null)}
            className="ml-2 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Confirmation Card ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => closeConfirmModal()}
            aria-label="Fermer"
          />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 md:p-10 space-y-7 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${confirmModal.variant === 'success'
                  ? 'bg-green-100 text-green-700'
                  : confirmModal.variant === 'danger'
                    ? 'bg-red-100 text-red-700'
                    : confirmModal.variant === 'info'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
              >
                {confirmModal.variant === 'success' ? (
                  <CheckCircle2 size={26} />
                ) : confirmModal.variant === 'danger' ? (
                  <X size={26} />
                ) : confirmModal.variant === 'info' ? (
                  <Clock size={26} />
                ) : (
                  <AlertTriangle size={26} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{confirmModal.title}</h3>
                <p className="text-sm text-gray-600 font-medium mt-2 leading-relaxed">{confirmModal.message}</p>
              </div>
              <button
                type="button"
                onClick={() => closeConfirmModal()}
                className="p-2 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Fermer"
                disabled={confirmBusy}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirmModal()}
                disabled={confirmBusy}
                className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-60"
              >
                {confirmModal.cancelLabel || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={runConfirmAction}
                disabled={confirmBusy}
                className={`px-7 py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 ${confirmModal.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmModal.variant === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {confirmBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                {confirmBusy ? 'Traitement…' : (confirmModal.confirmLabel || 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {view === 'overview' && `Espace ${isSuperAdmin ? 'Administrateur' : 'Modérateur'}`}
            {view === 'users' && 'Utilisateurs & Ambassadeurs'}
            {view === 'payouts' && 'Gestion des Finances'}
            {view === 'validation' && 'Validation des Preuves'}
            {view === 'team' && 'Mon Équipe Staff'}
            {view === 'campaigns' && 'Gestion des Campagnes'}
            {view === 'withdrawals' && 'Demandes de Retraits'}
            {view === 'campaignPayments' && 'Paiements des Campagnes'}
            {view === 'gomboChecker' && 'Vérificateur GomboPlus'}
          </h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Console de gestion SikaAds Togo</p>
        </div>

        <div className="flex items-center gap-3">
          {view === 'team' && isSuperAdmin && (
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all"
            >
              <UserPlus size={16} /> Ajouter Membre
            </button>
          )}
          {view === 'users' && (
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          VIEW: OVERVIEW
      ══════════════════════════════════════════ */}
      {view === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Inscrits" value={stats.totalInscrits.toLocaleString()} icon={Users} color="blue" />
            <StatCard title="Preuves en attente" value={stats.pendingProofs.toString()} icon={Clock} color="orange" />
            <StatCard title="Total Distribué" value={stats.totalDistribute.toLocaleString() + ' F'} icon={CheckCircle2} color="green" />
            <StatCard title="Dette Ambassadeurs" value={stats.userDebt.toLocaleString() + ' F'} icon={Banknote} color="indigo" />
          </div>

          {/* <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.25em]">
                  <Sparkles size={14} /> Analytics de campagne
                </div>
                <h3 className="text-2xl font-black mt-4">Vue d’ensemble exécutive des performances</h3>
                <p className="text-sm text-indigo-50/90 mt-2 max-w-2xl">
                  Suivi des partages, clics, conversion et campagnes les plus actives pour piloter les actions marketing avec une logique de data analyst.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-widest text-indigo-100">Partages</p>
                  <p className="text-2xl font-black mt-1">{campaignAnalytics.totalShares.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-widest text-indigo-100">Clics</p>
                  <p className="text-2xl font-black mt-1">{campaignAnalytics.totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div> */}

          <div className="flex flex-col  lg:flex-row  lg:justify-between gap-6">

            <div className="bg-white rounded-[2.5rem] w-full shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Performance par campagne</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Clics, partages et conversion par campagne</p>
              </div>
              <div className="p-6 h-[320px]">
                {campaignAnalytics.campaigns.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignAnalytics.campaigns.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={{ fontSize: 11 }} angle={-10} textAnchor="end" height={70} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="clicks" name="Clics" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="shares" name="Partages" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 xl:grid-cols-1 gap-4">
              <StatCard title="Taux de conversion" value={`${campaignAnalytics.conversionRate.toFixed(1)}%`} icon={TrendingUp} color="emerald-700" />
              <StatCard title="Campagnes actives" value={campaignAnalytics.activeCampaigns} icon={Target} color="blue" />
              <StatCard title="Top campagne" value={campaignAnalytics.bestCampaign?.title || 'Aucune donnée'} icon={ArrowUpRight} color="violet-700" />
              <StatCard title="Score d'engagement" value={`${campaignAnalytics.conversionRate.toFixed(1)}%`} icon={Activity} color="amber-700" />
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">



            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Campagnes (Statuts)</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Nombre de campagnes par statut</p>
              </div>
              <div className="p-6 h-[280px]">
                {campaignStatusChart.every(d => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignStatusChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value">
                        {campaignStatusChart.map((entry, index) => (
                          <Cell key={`cell-campaign-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Preuves (Répartition)</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">En attente, validées, rejetées</p>
              </div>
              <div className="p-6 h-[280px]">
                {proofStatusChart.every(d => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={proofStatusChart} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                        {proofStatusChart.map((entry, index) => (
                          <Cell key={`cell-proof-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Répartition des partages</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Par plateforme de diffusion</p>
              </div>
              <div className="p-6 h-[320px]">
                {campaignAnalytics.platformChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={campaignAnalytics.platformChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                        {campaignAnalytics.platformChart.map((entry, index) => (
                          <Cell key={`platform-cell-${index}`} fill={['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Retraits (Répartition)</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">En attente, validées, rejetées</p>
              </div>
              <div className="p-6 h-[280px]">
                {payoutStatusChart.every(d => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={payoutStatusChart} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}>
                        {payoutStatusChart.map((entry, index) => (
                          <Cell key={`cell-withdraw-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                <h3 className="font-black text-gray-900 tracking-tight">Retraits (14 derniers jours)</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Demandé (pending) vs Payé (completed)</p>
              </div>
              <div className="p-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payoutTrend14d}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                    <Line type="monotone" dataKey="requested" name="Demandé" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="paid" name="Payé" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>




          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="font-black text-gray-900 tracking-tight">Classement des campagnes</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Les plus performantes selon l’engagement total</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/60 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Campagne</th>
                    <th className="px-8 py-6">Partages</th>
                    <th className="px-8 py-6">Clics</th>
                    <th className="px-8 py-6">Conversion</th>
                    <th className="px-8 py-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaignAnalytics.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50/40 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">{campaign.title.charAt(0).toUpperCase()}</div>
                          <div>
                            <p className="font-bold text-gray-900">{campaign.title}</p>
                            <p className="text-[11px] text-gray-400">Budget: {campaign.budget.toLocaleString()} F</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-gray-700 font-semibold">{campaign.shares}</td>
                      <td className="px-8 py-6 text-gray-700 font-semibold">{campaign.clicks}</td>
                      <td className="px-8 py-6 text-gray-700 font-semibold">{campaign.conversionRate.toFixed(1)}%</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${campaign.status === 'active' ? 'bg-green-100 text-green-700' : campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {campaign.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-50 p-6 rounded-3xl text-indigo-600 mb-6"><Activity size={48} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Centre de Contrôle Staff</h3>
            <p className="text-gray-500 max-w-sm font-medium mb-8">Bonjour {currentAdminData?.name}. Gérez les flux de la plateforme avec diligence.</p>
            <div className="flex gap-3">
              <button onClick={() => setView('validation')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all">Validation</button>
              {isSuperAdmin && <button onClick={() => setView('team')} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Gérer l'équipe</button>}
            </div>
          </div> */}


        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: CAMPAIGNS
      ══════════════════════════════════════════ */}
      {view === 'campaigns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20">
              <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
                <Megaphone className="text-indigo-600" />
                Liste des Campagnes
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Campagne</th>
                    <th className="px-8 py-6">Budget</th>
                    <th className="px-8 py-6">Vues / Cibles</th>
                    <th className="px-8 py-6">Statut</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img src={camp.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100" />
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">{camp.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{camp.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900">{camp.totalBudget.toLocaleString()} F</p>
                        <p className="text-[10px] text-gray-400 font-medium">Restant: {camp.remainingBudget.toLocaleString()} F</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, ((camp.totalBudget - camp.remainingBudget) / camp.totalBudget) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600">
                            {Math.round(((camp.totalBudget - camp.remainingBudget) / camp.totalBudget) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${camp.status === 'active' ? 'bg-green-100 text-green-700' :
                          camp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                          {camp.status === 'active' ? <Zap size={10} /> : <PauseCircle size={10} />}
                          {camp.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (openMenuId === camp.id) {
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            } else {
                              setOpenMenuId(camp.id);
                              setMenuPosition({
                                top: rect.bottom + window.scrollY + 8,
                                right: window.innerWidth - rect.right
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all"
                        >
                          Gérer
                          <ChevronDown size={13} className={`transition-transform duration-200 ${openMenuId === camp.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={campaignPage}
              totalPages={totalCampaignPages}
              onPageChange={setCampaignPage}
              totalItems={allCampaigns.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>

          {/* Menu déroulant global pour les actions de campagne */}
          {openMenuId && menuPosition && (() => {
            const camp = allCampaigns.find(c => c.id === openMenuId);
            if (!camp) return null;
            return (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => { setOpenMenuId(null); setMenuPosition(null); }} />
                <div
                  className="fixed w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-[101] overflow-hidden py-1"
                  style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
                >
                  <button
                    onClick={() => { setOpenMenuId(null); setMenuPosition(null); setEditingCampaign({ ...camp }); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium"
                  >
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Pencil size={13} className="text-indigo-600" />
                    </span>
                    Modifier
                  </button>
                  <button
                    onClick={async () => {
                      setOpenMenuId(null);
                      setMenuPosition(null);
                      const newStatus = camp.status === 'active' ? 'paused' : 'active';
                      try {
                        await supabase
                          .from('campaigns')
                          .update({
                            status: newStatus,
                            updatedAt: new Date().toISOString()
                          })
                          .eq('id', camp.id);
                        showFeedback(`Campagne ${newStatus === 'active' ? 'activée' : 'mise en pause'} !`);
                      } catch (e: any) {
                        console.error(e);
                        showFeedback(`Erreur: ${e?.message || 'Impossible de mettre à jour'}`, 'error');
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-all font-medium"
                  >
                    <span className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      {camp.status === 'active'
                        ? <Pause size={13} className="text-yellow-600" />
                        : <Play size={13} className="text-yellow-600" />
                      }
                    </span>
                    {camp.status === 'active' ? 'Mettre en pause' : 'Activer'}
                  </button>
                  <button
                    onClick={() => { setOpenMenuId(null); setMenuPosition(null); setStatsCampaign(camp); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all font-medium"
                  >
                    <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <BarChart2 size={13} className="text-blue-600" />
                    </span>
                    Voir statistiques
                  </button>
                  <div className="mx-4 my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { setOpenMenuId(null); setMenuPosition(null); setDeletingCampaign(camp); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-all font-medium"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Trash2 size={13} className="text-red-500" />
                    </span>
                    Supprimer
                  </button>
                </div>
              </>
            );
          })()}

          {/* Modal: Modifier */}
          {editingCampaign && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <Pencil size={18} className="text-indigo-600" />
                  </span>
                  <h2 className="font-black text-gray-900 text-lg">Modifier la campagne</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre</label>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editingCampaign.title}
                      onChange={e => setEditingCampaign(p => ({ ...p!, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Budget total (F)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editingCampaign.totalBudget}
                      onChange={e => setEditingCampaign(p => ({ ...p!, totalBudget: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catégorie</label>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editingCampaign.category}
                      onChange={e => setEditingCampaign(p => ({ ...p!, category: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingCampaign(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await supabase
                          .from('campaigns')
                          .update({
                            title: editingCampaign.title,
                            totalBudget: editingCampaign.totalBudget,
                            category: editingCampaign.category,
                            updatedAt: new Date().toISOString()
                          })
                          .eq('id', editingCampaign.id);
                        showFeedback("Campagne mise à jour avec succès !");
                        setEditingCampaign(null);
                      } catch (e: any) {
                        console.error(e);
                        showFeedback(`Erreur: ${e?.message || 'Impossible de mettre à jour'}`, 'error');
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Statistiques */}
          {statsCampaign && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                      <BarChart2 size={18} className="text-blue-600" />
                    </span>
                    <div>
                      <h2 className="font-black text-gray-900 text-lg">Statistiques</h2>
                      <p className="text-xs text-gray-400 font-medium">{statsCampaign.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setStatsCampaign(null)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Budget total', value: `${statsCampaign.totalBudget.toLocaleString()} F`, bg: 'bg-indigo-50', text: 'text-indigo-700' },
                    { label: 'Budget restant', value: `${statsCampaign.remainingBudget.toLocaleString()} F`, bg: 'bg-green-50', text: 'text-green-700' },
                    { label: 'Dépensé', value: `${(statsCampaign.totalBudget - statsCampaign.remainingBudget).toLocaleString()} F`, bg: 'bg-orange-50', text: 'text-orange-700' },
                    { label: 'Progression', value: `${Math.round(((statsCampaign.totalBudget - statsCampaign.remainingBudget) / statsCampaign.totalBudget) * 100)}%`, bg: 'bg-purple-50', text: 'text-purple-700' },
                  ].map(({ label, value, bg, text }) => (
                    <div key={label} className={`${bg} rounded-2xl p-4`}>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className={`text-lg font-black ${text} mt-1`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progression du budget</p>
                    <span className="text-[10px] font-black text-gray-500">
                      {Math.round(((statsCampaign.totalBudget - statsCampaign.remainingBudget) / statsCampaign.totalBudget) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((statsCampaign.totalBudget - statsCampaign.remainingBudget) / statsCampaign.totalBudget) * 100)}%` }}
                    />
                  </div>
                </div>
                <button onClick={() => setStatsCampaign(null)} className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-600 transition-all">
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Modal: Suppression */}
          {deletingCampaign && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-5 text-center">
                <div className="flex justify-center">
                  <span className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center">
                    <Trash2 size={28} className="text-red-500" />
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-black text-gray-900 text-xl">Supprimer la campagne ?</h2>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    Vous êtes sur le point de supprimer <span className="font-bold text-gray-700">"{deletingCampaign.title}"</span>. Cette action est irréversible.
                  </p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setDeletingCampaign(null)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await supabase
                          .from('campaigns')
                          .delete()
                          .eq('id', deletingCampaign.id);
                        showFeedback("Campagne supprimée avec succès.");
                        setDeletingCampaign(null);
                      } catch (e: any) {
                        console.error(e);
                        showFeedback(`Erreur: ${e?.message || 'Impossible de supprimer'}`, 'error');
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: TEAM (SUPER ADMIN ONLY)
      ══════════════════════════════════════════ */}
      {view === 'team' && isSuperAdmin && (
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20">
              <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
                <ShieldCheck className="text-indigo-600" />
                Membres de l'Équipe Administrative
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Membre</th>
                    <th className="px-8 py-6">Email</th>
                    <th className="px-8 py-6">Rôle Actuel</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedTeam.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/30 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{member.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{member.name}</p>
                            {member.id === currentAdminData?.id && <span className="text-[8px] font-black uppercase text-indigo-400">Moi</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-gray-500 font-medium">{member.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {member.role === UserRole.ADMIN ? 'SUPER_ADMIN' : 'MODÉRATEUR'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {member.id !== currentAdminData?.id && (
                          <button
                            onClick={() => handleDemoteMember(member.id)}
                            className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                            title="Rétrograder en Ambassadeur"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={teamPage}
              totalPages={totalTeamPages}
              onPageChange={setTeamPage}
              totalItems={teamMembers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: USERS (SUPER ADMIN ONLY)
      ══════════════════════════════════════════ */}
      {view === 'users' && isSuperAdmin && (
        <div className="space-y-8">
          <div className="bg-indigo-600 text-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Croissance Communauté</p>
              <h3 className="text-5xl font-black tracking-tighter">Total Inscrits : {stats.totalInscrits}</h3>
            </div>
            <Users size={80} className="text-white/10 absolute -right-4 -bottom-4 -rotate-12" />
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Utilisateur</th>
                    <th className="px-8 py-6">Email</th>
                    <th className="px-8 py-6">Rôle</th>
                    <th className="px-8 py-6">Solde</th>
                    <th className="px-8 py-6">Statut</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{user.name?.charAt(0) || 'U'}</div>
                          <p className="font-bold text-gray-900 leading-none">{user.name || 'Utilisateur sans nom'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm text-gray-500 font-medium">{user.email || '—'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                            user.role === UserRole.MODERATOR ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}
                        >
                          <option value={UserRole.AMBASSADOR}>Ambassadeur</option>
                          <option value={UserRole.MODERATOR}>Modérateur</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900 text-sm">{user.balance?.toLocaleString() || 0} F</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {user.status === 'active' ? 'ACTIF' : 'BLOQUÉ'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.email && (
                            <button
                              onClick={() => handleResetPassword(user.email!)}
                              className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Réinitialiser Mot de Passe"
                            >
                              <Key size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleUserBlock(user.id, user.status)}
                            className={`p-3 rounded-xl transition-all ${user.status === 'active' ? 'text-red-400 hover:bg-red-50' : 'text-green-400 hover:bg-green-50'
                              }`}
                          >
                            {user.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={userPage}
              totalPages={totalUserPages}
              onPageChange={setUserPage}
              totalItems={filteredUsers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: PAYOUTS / FINANCES (SUPER ADMIN ONLY)
      ══════════════════════════════════════════ */}
      {view === 'payouts' && isSuperAdmin && (
        <div className="space-y-8">
          {/* Section: Rentabilité Totale */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl"><CreditCard size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Revenus (Campagnes)</p>
                <p className="text-xl font-black text-gray-900 leading-none">{financialStats.totalRevenue.toLocaleString()} F</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl"><Banknote size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reversé (Users)</p>
                <p className="text-xl font-black text-gray-900 leading-none">{financialStats.totalPayouts.toLocaleString()} F</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl"><Wallet size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dette (Soldes)</p>
                <p className="text-xl font-black text-gray-900 leading-none">{financialStats.totalDebt.toLocaleString()} F</p>
              </div>
            </div>
            <div className={`p-6 rounded-3xl shadow-xl flex items-center gap-4 border ${financialStats.netProfit >= 0 ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-red-600 border-red-500 shadow-red-100'}`}>
              <div className="bg-white/20 text-white p-4 rounded-2xl"><Activity size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Profit Net Estimé</p>
                <p className="text-xl font-black text-white leading-none">{financialStats.netProfit.toLocaleString()} F</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Top 10 Earners */}
            <div className="xl:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 tracking-tight">Top 10 des Ambassadeurs</h3>
                  <p className="text-xs text-gray-400 font-medium mt-1">Classés par gains totaux générés</p>
                </div>
                <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Performances</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-6">Rang</th>
                      <th className="px-8 py-6">Utilisateur</th>
                      <th className="px-8 py-6">Gains Totaux</th>
                      <th className="px-8 py-6">Solde Actuel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topEarners.map((user, index) => (
                      <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-emerald-600">{user.totalEarned?.toLocaleString() || 0} F</td>
                        <td className="px-8 py-6 font-bold text-gray-600">{user.balance?.toLocaleString() || 0} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aide-mémoire Finance */}
            <div className="bg-indigo-900 rounded-[2.5rem] h-96 p-8 text-white space-y-8 relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-6 leading-tight">Comprendre vos Finances</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Formule Profit</p>
                    <p className="text-sm font-medium text-indigo-100 leading-relaxed">
                      Votre profit net est calculé ainsi : <br />
                      <span className="font-black text-white">(Budget total des campagnes)</span> <br />
                      <span className="text-indigo-400">- (Somme des retraits validés)</span> <br />
                      <span className="text-indigo-400">- (Soldes actuels des utilisateurs)</span>
                    </p>
                  </div>
                  <div className="pt-6 border-t border-indigo-800 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300"><RefreshCcw size={20} /></div>
                      <p className="text-xs font-bold">Mise à jour en temps réel à chaque transaction.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300"><ShieldCheck size={20} /></div>
                      <p className="text-xs font-bold">Données sécurisées et synchronisées avec Firestore.</p>
                    </div>
                  </div>
                </div>
              </div>
              <Activity size={150} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: WITHDRAWALS
      ══════════════════════════════════════════ */}
      {view === 'withdrawals' && (
        <div className="space-y-6">
          {/* Stat Cards — 3 frères dans le grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-yellow-200 text-yellow-600 p-4 rounded-2xl"><Clock size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">En Attente</p>
                <p className="text-xl font-bold text-gray-900 leading-none">{allPayouts.filter(p => normalizePayoutStatus(p.status) === "pending").length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-200 text-green-600 p-4 rounded-2xl"><CheckCircle2 size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Validés</p>
                <p className="text-xl font-bold text-gray-900 leading-none">{allPayouts.filter(p => normalizePayoutStatus(p.status) === 'completed').length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-red-200 text-red-600 p-4 rounded-2xl"><X size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rejetés</p>
                <p className="text-xl font-bold text-gray-900 leading-none">{allPayouts.filter(p => normalizePayoutStatus(p.status) === 'failed').length}</p>
              </div>
            </div>
          </div>

          {/* Table des retraits */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
                <Wallet className="text-indigo-600" />
                Demandes de Retraits
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Nom ou téléphone..."
                    value={withdrawalSearch}
                    onChange={(e) => setWithdrawalSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                  />
                </div>

                <select
                  value={withdrawalStatusFilter}
                  onChange={(e) => setWithdrawalStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pending">En attente</option>
                  <option value="completed">Validés</option>
                  <option value="failed">Rejetés</option>
                  <option value="all">Tous</option>
                </select>

                <select
                  value={operatorFilter}
                  onChange={(e) => setOperatorFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Tous Opérateurs</option>
                  <option value="yas">TMoney (YAS)</option>
                  <option value="moov">Moov Money</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Ambassadeur</th>
                    <th className="px-8 py-6">Montant</th>
                    <th className="px-8 py-6">Opérateur</th>
                    <th className="px-8 py-6">Téléphone</th>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6">Statut</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedWithdrawals.map((payout) => {
                    const payoutStatus = normalizePayoutStatus(payout.status);
                    return (
                      <tr key={payout.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-gray-900 leading-none">{payout.userName}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-gray-900">{payout.amount.toLocaleString()} FCFA</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${payout.provider === 'yas' ? 'bg-blue-100 text-blue-700' :
                            payout.provider === 'moov' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                            {payout.provider === 'yas' ? 'TMoney (YAS)' : (payout.provider === 'moov' ? 'Moov Money' : payout.provider)}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm text-gray-500 font-medium">{payout.phone}</td>
                        <td className="px-8 py-6 text-xs text-gray-500 font-medium">
                          {formatDate(payout.createdAt || payout.date)}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${payoutStatus === 'completed' ? 'bg-green-100 text-green-700' :
                            payoutStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {payoutStatus}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {payoutStatus === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={processingWithdrawals.has(payout.id)}
                                onClick={() => {
                                  openConfirmModal(
                                    {
                                      variant: 'success',
                                      title: 'Valider le retrait ?',
                                      message: `Confirmer le virement de ${payout.amount.toLocaleString()} FCFA vers ${payout.phone} (${payout.provider === 'yas' ? 'YAS' : payout.provider === 'moov' ? 'MOOV' : payout.provider || 'opérateur'}) ?`,
                                      confirmLabel: 'Valider',
                                      cancelLabel: 'Annuler'
                                    },
                                    async () => {
                                      setProcessingWithdrawals(prev => new Set(prev).add(payout.id));
                                      try {
                                        const res = await gomboAdminApproveWithdrawal({ withdrawalId: payout.id });
                                        if (res.success) {
                                          showFeedback('Retrait validé et virement effectué !');
                                        } else {
                                          showFeedback('Erreur lors du virement Gombo Plus', 'error');
                                        }
                                      } catch (e: any) {
                                        console.error(e);
                                        showFeedback(`Erreur: ${e?.message || 'Inconnue'}`, 'error');
                                      } finally {
                                        setProcessingWithdrawals(prev => {
                                          const next = new Set(prev);
                                          next.delete(payout.id);
                                          return next;
                                        });
                                      }
                                    }
                                  );
                                }}
                                className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all disabled:opacity-50"
                                title="Valider le retrait (Gombo Plus)"
                              >
                                {processingWithdrawals.has(payout.id) ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={18} />
                                )}
                              </button>
                              <button
                                disabled={processingWithdrawals.has(payout.id)}
                                onClick={() => {
                                  openConfirmModal(
                                    {
                                      variant: 'danger',
                                      title: 'Rejeter le retrait ?',
                                      message: `Rejeter la demande de ${payout.amount.toLocaleString()} FCFA vers ${payout.phone} ? (Remboursement automatique si le solde a été débité)`,
                                      confirmLabel: 'Rejeter',
                                      cancelLabel: 'Annuler'
                                    },
                                    async () => {
                                      setProcessingWithdrawals(prev => new Set(prev).add(payout.id));
                                      try {
                                        const res = await gomboAdminRejectWithdrawal({ withdrawalId: payout.id });
                                        if (res.success) {
                                          showFeedback('Retrait rejeté (remboursement effectué si débité).');
                                        } else {
                                          showFeedback('Erreur lors du rejet', 'error');
                                        }
                                      } catch (e: any) {
                                        console.error(e);
                                        showFeedback(`Erreur: ${e?.message || 'Inconnue'}`, 'error');
                                      } finally {
                                        setProcessingWithdrawals(prev => {
                                          const next = new Set(prev);
                                          next.delete(payout.id);
                                          return next;
                                        });
                                      }
                                    }
                                  );
                                }}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"
                                title="Rejeter le retrait"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {allPayouts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center">
                        <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Aucune demande de retrait</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={withdrawalPage}
              totalPages={totalWithdrawalPages}
              onPageChange={setWithdrawalPage}
              totalItems={allPayouts.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: CAMPAIGN PAYMENTS (SUPER ADMIN ONLY)
      ══════════════════════════════════════════ */}
      {view === 'campaignPayments' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-yellow-200 text-yellow-600 p-4 rounded-2xl"><Clock size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">En Attente</p>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  {allCampaigns.filter(c => c.paymentStatus === 'pending_payment' || c.paymentStatus === undefined).length}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-200 text-green-600 p-4 rounded-2xl"><CheckCircle2 size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmés</p>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  {allCampaigns.filter(c => c.paymentStatus === 'paid').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-red-200 text-red-600 p-4 rounded-2xl"><X size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Annulés</p>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  {allCampaigns.filter(c => c.paymentStatus === 'failed').length}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-indigo-200 text-indigo-600 p-4 rounded-2xl"><CreditCard size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Budget</p>
                <p className="text-xl font-bold text-gray-900 leading-none">
                  {allCampaigns.reduce((acc, c) => acc + (c.totalBudget || 0), 0).toLocaleString()} F
                </p>
              </div>
            </div>
          </div>

          {/* Table des paiements */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/20">
              <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
                <CreditCard className="text-indigo-600" />
                Paiements des Campagnes Utilisateurs
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-8 py-6">Campagne</th>
                    <th className="px-8 py-6">Annonceur</th>
                    <th className="px-8 py-6">Budget</th>
                    <th className="px-8 py-6">Pack</th>
                    <th className="px-8 py-6">Date Création</th>
                    <th className="px-8 py-6">Statut Paiement</th>
                    <th className="px-8 py-6">Reference de Transaction</th>
                    {/* <th className="px-8 py-6 text-right">Actions</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedCampaignPayments.map((campaign) => {
                    const advertiser = campaign.advertiserId ? userById.get(campaign.advertiserId) : undefined;
                    const advertiserName = campaign.advertiserName || advertiser?.name || 'Annonceur';
                    const advertiserPhone = campaign.advertiserPhone || advertiser?.momoNumber || '-';

                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <img src={campaign.imageUrl || '/placeholder.png'} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                            <p className="font-bold text-gray-900 leading-tight">{campaign.title}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-gray-500 font-medium">{advertiserName}</p>
                          <p className="text-xs text-gray-400">{advertiserPhone}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-gray-900">{campaign.totalBudget.toLocaleString()} F</td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700">
                            {campaign.budgetPack || 'Standard'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-xs text-gray-500 font-medium">
                          {formatDate(campaign.createdAt)}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${campaign.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            campaign.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                            {campaign.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold text-gray-500">{campaign.paymentReference || '—'}</p>
                        </td>
                        {/* Actions placeholder - migrated to Supabase */}
                      </tr>
                    );
                  })}
                  {allCampaigns.filter(c => c.createdBy === 'user' || c.createdBy === undefined).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center">
                        <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Aucune campagne utilisateur en attente</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={campaignPaymentPage}
              totalPages={totalCampaignPaymentPages}
              onPageChange={setCampaignPaymentPage}
              totalItems={campaignPaymentsList.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: GOMBO CHECKER
      ══════════════════════════════════════════ */}
      {view === 'gomboChecker' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 md:p-12 overflow-hidden">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="bg-indigo-50 p-6 rounded-3xl text-indigo-600 mb-6">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Vérificateur de Statut GomboPlus</h3>
              <p className="text-gray-500 max-w-md font-medium">
                Saisissez une référence de transaction pour interroger directement l'API GomboPlus et voir les détails.
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Ex: TXN_20241002_001 ou CMP-..."
                  value={gomboRefInput}
                  onChange={(e) => setGomboRefInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-4.5 bg-gray-50 border border-gray-100 rounded-2xl text-base font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>
              <button
                onClick={handleManualGomboCheck}
                disabled={isCheckingGombo || !gomboRefInput.trim()}
                className="w-full h-10 bg-indigo-600 text-white py-4.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {isCheckingGombo ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                {isCheckingGombo ? "Vérification en cours..." : "Vérifier le statut"}
              </button>
            </div>
          </div>

          {gomboCheckResult && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
                <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <Activity className="text-indigo-600" />
                  Détails de la Transaction
                </h3>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${['completed', 'success', 'successful'].includes(String(gomboCheckResult.status || '').toLowerCase())
                  ? 'bg-green-100 text-green-700'
                  : ['failed', 'rejected', 'error'].includes(String(gomboCheckResult.status || '').toLowerCase())
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {gomboCheckResult.status || 'Inconnu'}
                </span>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Référence</p>
                    <p className="text-lg font-bold text-gray-900 break-all">{gomboCheckResult.reference || gomboCheckResult.transaction_reference || gomboRefInput}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Montant</p>
                    <p className="text-2xl font-black text-gray-900">{gomboCheckResult.amount?.toLocaleString() || '—'} F</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Opérateur</p>
                    <p className="text-lg font-bold text-gray-900 uppercase">{gomboCheckResult.operator || '—'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Message API</p>
                    <p className="text-sm font-bold text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {gomboCheckResult.message || "Aucun message retourné par l'API."}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-lg font-bold text-gray-900">{gomboCheckResult.created_at ? new Date(gomboCheckResult.created_at).toLocaleString() : '—'}</p>
                  </div>
                  {gomboCheckResult.recipient_number && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Numéro Client</p>
                      <p className="text-lg font-bold text-gray-900">{gomboCheckResult.recipient_number}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Réponse JSON Brute</p>
                <pre className="bg-gray-900 text-green-400 p-6 rounded-2xl text-xs overflow-x-auto font-mono shadow-inner leading-relaxed">
                  {JSON.stringify(gomboCheckResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: VALIDATION
      ══════════════════════════════════════════ */}
      {view === 'validation' && (
        <div>
          {/* Filtres */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Statut de la preuve</label>
                <select
                  value={proofStatusFilter}
                  onChange={(e) => setProofStatusFilter(e.target.value as any)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="validated">Validées</option>
                  <option value="rejected">Rejetées</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Action suggérée par l'IA</label>
                <select
                  value={suggestedActionFilter}
                  onChange={(e) => setSuggestedActionFilter(e.target.value as any)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="all">Toutes les actions</option>
                  <option value="approve">À approuver</option>
                  <option value="reject">À rejeter</option>
                  <option value="manual_review">Révision manuelle</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setProofStatusFilter('pending'); setSuggestedActionFilter('manual_review'); }}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-600 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Preuves à examiner
                </button>
              </div>
            </div>
          </div>

          {/* Liste des preuves filtrées */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {allProofs
              .filter(p => proofStatusFilter === 'all' || p.status === proofStatusFilter)
              .filter(p => suggestedActionFilter === 'all' || p.aiAnalysis?.suggestedAction === suggestedActionFilter)
              .map(proof => (
                <div key={proof.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[280px]">
                  <div
                    className="w-full md:w-48 bg-gray-100 relative group shrink-0 cursor-pointer overflow-hidden"
                    onClick={() => setPreviewImage(proof.downloadURL)}
                  >
                    <img src={proof.downloadURL} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Proof" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                      <Eye size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 p-8 flex flex-col">
                    <div className="mb-4">
                      <h3 className="font-black text-lg text-gray-900 leading-none">{proof.userName}</h3>
                      <p className="text-xs text-indigo-600 font-black uppercase tracking-widest mt-2">{proof.campaignName}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">
                        {new Date(proof.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Analyse IA */}
                    {proof.aiAnalysis ? (
                      <div className={`rounded-2xl p-4 mb-4 border space-y-3 ${proof.aiAnalysis.fraudAlert ? 'bg-red-50 border-red-100' :
                        proof.aiAnalysis.isValid ? 'bg-emerald-50 border-emerald-100' :
                          'bg-amber-50 border-amber-100'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield size={13} className={proof.aiAnalysis.fraudAlert ? 'text-red-500' : proof.aiAnalysis.isValid ? 'text-emerald-600' : 'text-amber-500'} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${proof.aiAnalysis.fraudAlert ? 'text-red-600' : proof.aiAnalysis.isValid ? 'text-emerald-700' : 'text-amber-600'
                              }`}>
                              Analyse IA
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${proof.aiAnalysis.fraudAlert ? 'bg-red-100 text-red-700' :
                              proof.aiAnalysis.isValid ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {proof.aiAnalysis.fraudAlert ? '⚠ Fraude' : proof.aiAnalysis.isValid ? '✓ Valide' : '✗ Invalide'}
                            </span>
                            {proof.aiAnalysis.suggestedAction && (
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${proof.aiAnalysis.suggestedAction === 'approve' ? 'bg-green-100 text-green-700' :
                                proof.aiAnalysis.suggestedAction === 'reject' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                {proof.aiAnalysis.suggestedAction === 'approve' ? '✓ Auto-approuver' :
                                  proof.aiAnalysis.suggestedAction === 'reject' ? '✗ Auto-rejeter' :
                                    '👤 Révision manuelle'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scores de confiance */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Confiance globale</p>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${proof.aiAnalysis.confidence >= 70 ? 'bg-emerald-500' :
                                    proof.aiAnalysis.confidence >= 40 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                  style={{ width: `${proof.aiAnalysis.confidence}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-gray-700">{proof.aiAnalysis.confidence}%</span>
                            </div>
                          </div>
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vues détectées</p>
                            <p className="text-sm font-black text-gray-900">{proof.aiAnalysis.viewsCount.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Scores de confiance granulaires */}
                        {(proof.aiAnalysis.imageAuthenticityConfidence || proof.aiAnalysis.viewCountDetectionConfidence || proof.aiAnalysis.platformUICompliance) && (
                          <div className="bg-white/70 rounded-xl p-2.5 space-y-2">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Scores spécifiques</p>
                            {proof.aiAnalysis.imageAuthenticityConfidence && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-600 font-medium">Authenticité image</span>
                                <span className="font-black text-gray-900">{proof.aiAnalysis.imageAuthenticityConfidence}%</span>
                              </div>
                            )}
                            {proof.aiAnalysis.viewCountDetectionConfidence && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-600 font-medium">Détection vues</span>
                                <span className="font-black text-gray-900">{proof.aiAnalysis.viewCountDetectionConfidence}%</span>
                              </div>
                            )}
                            {proof.aiAnalysis.platformUICompliance && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-600 font-medium">Conformité interface</span>
                                <span className="font-black text-gray-900">{proof.aiAnalysis.platformUICompliance}%</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Type de fraude */}
                        {proof.aiAnalysis.fraudType && proof.aiAnalysis.fraudType !== 'none' && (
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Type de fraude</p>
                            <p className="text-[11px] font-bold text-red-600">{proof.aiAnalysis.fraudType.replace(/_/g, ' ')}</p>
                          </div>
                        )}

                        {/* Détails des éléments de fraude */}
                        {proof.aiAnalysis.fraudEvidenceDetails && proof.aiAnalysis.fraudEvidenceDetails.length > 0 && (
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Éléments suspects</p>
                            <ul className="space-y-1">
                              {proof.aiAnalysis.fraudEvidenceDetails.map((detail, idx) => (
                                <li key={idx} className="text-[10px] text-red-600 font-medium flex gap-2">
                                  <span className="shrink-0">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {proof.aiAnalysis.reason && (
                          <div className="bg-white/70 rounded-xl p-2.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Motif IA</p>
                            <p className="text-[11px] text-gray-600 font-medium leading-snug">{proof.aiAnalysis.reason}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-4 border border-gray-100">
                        <AlertTriangle size={13} className="text-gray-400 shrink-0" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aucune analyse IA disponible</p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => setRejectingProof(proof)} className="flex-1 bg-gray-50 hover:bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                        Refuser
                      </button>
                      <button
                        onClick={() => { setValidatingProof(proof); setViewsInput(proof.aiAnalysis?.viewsCount?.toString() || '0'); }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all"
                      >
                        Valider
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {allProofs.filter(p => p.status === 'pending').length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-100">
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Aucune preuve en attente</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS (tous au même niveau racine)
      ══════════════════════════════════════════ */}

      {/* Modal: Ajouter un membre */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
                <UserPlus size={24} />
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Ajouter un Modérateur</h3>
            <p className="text-gray-500 text-sm font-medium mb-6">Saisissez l'adresse email d'un utilisateur existant pour l'élever au rang de Staff.</p>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="email@utilisateur.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={handleAddStaffMember}
                disabled={isAddingMember || !newMemberEmail}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAddingMember ? <Loader2 className="animate-spin" size={20} /> : "Confirmer la promotion"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview image */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all" onClick={() => setPreviewImage(null)}>
            <X size={32} />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10" alt="Preview" />
          </div>
        </div>
      )}

      {/* Modal: Refus de preuve */}
      {rejectingProof && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <X size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Refuser la preuve</h3>
                <p className="text-xs text-gray-400 font-medium">{rejectingProof.userName} · {rejectingProof.campaignName}</p>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                Motif du refus <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: La capture ne correspond pas à la campagne demandée..."
                rows={3}
                className="w-full bg-gray-50 border-2 border-red-100 rounded-2xl p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                autoFocus
              />
            </div>
            <button
              onClick={handleRejectProof}
              disabled={isRejecting || !rejectionReason.trim()}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {isRejecting ? <Loader2 className="animate-spin" size={18} /> : <X size={16} />}
              {isRejecting ? 'Traitement...' : 'Confirmer le refus'}
            </button>
            <button onClick={() => { setRejectingProof(null); setRejectionReason(''); }} className="w-full text-gray-400 text-xs font-bold py-2">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal: Validation de preuve */}
      {validatingProof && (() => {
        const campaign = allCampaigns.find(c => c.id === validatingProof.campaignId);
        const cpv = campaign?.cpv ?? 20;
        const computedEarnings = Math.round((parseInt(viewsInput) || 0) * cpv);
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Check size={22} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Valider la preuve</h3>
                  <p className="text-xs text-gray-400 font-medium">{validatingProof.userName} · {validatingProof.campaignName}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nombre de vues confirmées</label>
                <input
                  type="number"
                  value={viewsInput}
                  onChange={(e) => setViewsInput(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-indigo-100 rounded-2xl p-4 text-center text-3xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  autoFocus
                />
              </div>
              <div className="bg-indigo-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Rémunération calculée</p>
                  <p className="text-2xl font-black text-indigo-700 mt-0.5">{computedEarnings.toLocaleString()} <span className="text-sm">FCFA</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Taux / vue</p>
                  <p className="text-sm font-black text-indigo-600">{cpv} FCFA</p>
                </div>
              </div>

              {wasBudgetLimited && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold leading-tight uppercase tracking-wider">
                    Budget limité : Le nombre de vues a dû être ajusté au budget restant de la campagne ({campaign?.remainingBudget?.toLocaleString()} FCFA).
                  </p>
                </div>
              )}
              <button
                onClick={handleConfirmValidation}
                disabled={isValidating || !viewsInput || parseInt(viewsInput) <= 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {isValidating ? <Loader2 className="animate-spin" size={18} /> : <Check size={16} />}
                {isValidating ? 'Traitement...' : `Valider · +${computedEarnings.toLocaleString()} FCFA`}
              </button>
              <button onClick={() => { setValidatingProof(null); setWasBudgetLimited(false); }} className="w-full text-gray-400 text-xs font-bold py-2">
                Annuler
              </button>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default AdminPanel;
