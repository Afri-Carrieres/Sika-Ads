
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { UserRole, Notification, Proof, Campaign } from './types';
import { supabase } from './supabase';
import Layout from './components/Layout';
import Header from './components/Header';
import { InstallPrompt } from './components/InstallPrompt';
import PushNotificationBanner from './components/PushNotificationBanner';
import ToastContainer from './components/ToastContainer';
import { ToastMessage } from './components/Toast';
import AmbassadorDashboard from './views/AmbassadorDashboard';
import CampaignMarketplace from './views/CampaignMarketplace';
import CampaignShareOption from './views/CampaignShareOption';
import TaskHistory from './views/TaskHistory';
import StrategyNotes from './views/StrategyNotes';
import AdminPanel from './views/AdminPanel';
import AdminCreateCampaign from './views/AdminCreateCampaign';
import LandingPage from './views/LandingPage';
import CreateCampaign from './views/CreateCampaign';
import PaymentPage from './views/PaymentPage';
import SuccessCampaign from './views/SuccessCampaign';
import LoginView from './views/LoginView';
import RegistrationForm from './views/RegistrationForm';
import WalletView from './views/WalletView';
import VerificationPending from './views/VerificationPending';
import ProfilePage from './views/ProfilePage';
import ResetPasswordView from './views/ResetPasswordView';
import AboutView from './views/AboutView';
import LegalView from './views/LegalView';
import TermsView from './views/TermsView';
import ContactView from './views/ContactView';
import MyCampaigns from './views/MyCampaigns';
import ScrollToTop from './components/ScrollToTop';
import "./styles/index.css";
import { useAuthRedirect } from './hooks/useAuthRedirect';

import { MOCK_PROOFS } from './constants';
import { useUserData } from './hooks/useUserData';
import { deleteAllCampaigns } from './services/resetCampaigns';
import { initializeDatabase } from './services/initDb';
import { cleanupNonAdminUsers } from './services/cleanupUsers';
import { Clock, Loader2 } from 'lucide-react';

type AppView = 'landing' | 'app' | 'about' | 'legal' | 'terms' | 'contact' | 'advertise' | 'advertise-success' | 'login' | 'register' | 'verification-pending' | 'profile' | 'reset-password';

// Helper to parse current path and return view + tab
const parsePathname = (pathname: string): { view: AppView; tab: string } => {
  const pathWithoutLeadingSlash = pathname.replace(/^\//, '');
  
  if (!pathWithoutLeadingSlash || pathWithoutLeadingSlash === '') {
    return { view: 'landing', tab: 'dashboard' };
  }

  const parts = pathWithoutLeadingSlash.split('/').filter(Boolean);
  const firstPart = parts[0] as AppView;

  if (firstPart === 'app') {
    return { view: 'app', tab: parts.slice(1).join('/') || 'dashboard' };
  }

  if (['about', 'legal', 'terms', 'contact', 'advertise', 'advertise-success', 'login', 'register', 'verification-pending', 'profile', 'reset-password'].includes(firstPart)) {
    return { view: firstPart, tab: 'dashboard' };
  }

  return { view: 'landing', tab: 'dashboard' };
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [view, setViewInternal] = useState<AppView>(parsePathname(location.pathname).view);
  const [currentTab, setCurrentTabInternal] = useState<string>(parsePathname(location.pathname).tab);

  const [proofs, setProofs] = useState<(Proof & { campaignTitle: string; userName: string })[]>(MOCK_PROOFS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [showPayment, setShowPayment] = useState(false);
  const [successData, setSuccessData] = useState({ campaignId: '', amount: 0 });
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<typeof view | null>(null);

  const { user, userData, loading, isAdmin, isStaff } = useUserData();

  // Sync pathname changes to view/tab state
  useEffect(() => {
    const { view: newView, tab: newTab } = parsePathname(location.pathname);
    setViewInternal(newView);
    setCurrentTabInternal(newTab);
  }, [location.pathname]);

  // Auth state change handler
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
      // Quand l'utilisateur clique sur le lien de vérification dans l'email,
      // Supabase émet USER_UPDATED avec email_confirmed_at renseigné.
      // On redirige alors automatiquement vers le dashboard.
      if ((event === 'USER_UPDATED' || event === 'SIGNED_IN') && session?.user?.email_confirmed_at) {
        navigate('/app');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

    useEffect(() => {
      // Special handling: tracking redirect URLs like /ref/:ref/:campaignId or /ref?ref=:ref&campaignId=:campaignId
      try {
        const path = window.location.pathname || '';
        if (path === '/ref' || path.startsWith('/ref/')) {
          const urlParamsTrack = new URLSearchParams(window.location.search);
          const platform = urlParamsTrack.get('platform') || null;
          let ref = urlParamsTrack.get('ref') || null;
          let campaignId = urlParamsTrack.get('campaignId') || null;

          if (!ref || !campaignId) {
            const parts = path.split('/').filter(Boolean); // ['ref', 'u123', '<campaignId>']
            ref = ref || parts[1] || null;
            campaignId = campaignId || parts[2] || null;
          }

          if (campaignId) {
            // Non-blocking insert to record click
            (async () => {
              try {
                await supabase.from('campaign_clicks').insert([{ campaign_id: campaignId, referrer: ref, platform, user_agent: navigator.userAgent }]);
              } catch (err) {
                console.warn('Erreur enregistrement click:', err);
              }
            })();
          }

          // Redirect to homepage (spa) after logging
          navigate('/');
          return; // stop further init
        }

      } catch (err) {
        console.warn('Error handling /ref redirect:', err);
      }

      // Handle ?mode=resetPassword (fallback pour les liens sans hash fragment)
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      if (mode === 'resetPassword') {
        // Ne pas naviguer ici : onAuthStateChange (PASSWORD_RECOVERY) le fera de façon fiable
        // On laisse Supabase traiter le token dans la query string
        return;
      }
    }, [navigate]);

    // Wrapper for setView to navigate using React Router
    const setView = (v: AppView) => {
      if (v === 'landing') {
        navigate('/');
      } else if (v === 'app') {
        navigate(`/app/${currentTab}`);
      } else {
        navigate(`/${v}`);
      }
    };

    // Wrapper for setTab to update app path
    const setTab = (t: string) => {
      navigate(`/app/${t}`);
    };

    useEffect(() => {
      if (loading) return;
      // initializeDatabase();
      // deleteAllCampaigns();
      // cleanupNonAdminUsers();

      if (user && !user.email_confirmed_at && view !== 'verification-pending') {
        if (view === 'app' || view === 'profile' || view === 'advertise') {
          setView('verification-pending');
        }
        return;
      }

      if (user) { // Autoriser même si email_confirmed_at est false pour les tests
        if (['login', 'register', 'verification-pending'].includes(view)) {
          if (redirectAfterLogin) {
            setView(redirectAfterLogin);
            setRedirectAfterLogin(null);
          } else {
            setView('app');
          }
        }
      }

      if (!user && (view === 'app' || view === 'profile' || view === 'verification-pending' || view === 'advertise')) {
        if (view === 'advertise') {
          setRedirectAfterLogin('advertise');
        }
        setView('landing');
        // On redirige vers login pour forcer l'auth après avoir cliqué sur "Je veux faire de la pub"
        if (view === 'advertise') {
          setView('login');
        }
      }

      if (user && userData && view === 'app') {
        // Autoriser STAFF (Admin + Mod) sur les onglets admin
        if (isStaff && currentTab === 'dashboard' && !currentTab.startsWith('admin')) {
          setTab('admin-dashboard');
        }

        // Bloquer strictement les AMBASSADORS des onglets Admin
        if (!isStaff && currentTab.startsWith('admin')) {
          setTab('dashboard');
        }
      }

    }, [user, userData, loading, isStaff, view, currentTab]);


    const handleRoleSwitch = () => {
      if (isStaff) {
        setTab(currentTab.startsWith('admin') ? 'dashboard' : 'admin-dashboard');
      }
    };

    const addNotification = (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      console.log("Notification trigger:", notif);

      // Déterminer le type de toast basé sur le type de notification
      let toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
      if (notif.type === 'status') {
        if (notif.title.includes('✅') || notif.title.includes('validé') || notif.title.includes('envoyée')) {
          toastType = 'success';
        } else if (notif.title.includes('❌') || notif.title.includes('rejet') || notif.title.includes('erreur')) {
          toastType = 'error';
        } else if (notif.title.includes('⏳') || notif.title.includes('révision')) {
          toastType = 'info';
        }
      } else if (notif.type === 'payout') {
        toastType = 'success';
      }

      // Créer le toast
      const toastId = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = {
        id: toastId,
        title: notif.title.replace(/[✅❌⏳]/g, '').trim(),
        message: notif.message,
        type: toastType,
        duration: toastType === 'error' ? 7000 : 5000
      };

      // Ajouter le toast
      setToasts(prev => [...prev, toast]);
    };

    const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    };

    const renderContent = () => {
      // Si Staff et sur un onglet admin -> Panneau Admin
      if (isStaff && currentTab.startsWith('admin')) {
        // Cas spécifique pour la page de création VIP
        if (currentTab === 'admin-create-vip' && isAdmin) {
          return <AdminCreateCampaign onSuccess={() => { setTab('admin-campaigns'); }} onCancel={() => { setTab('admin-dashboard'); }} />;
        }
        return <AdminPanel proofs={proofs} setProofs={setProofs} addNotification={addNotification} activeTab={currentTab} />;
      }

      if (currentTab.startsWith('campaign-share/')) {
        const campaignId = currentTab.split('/')[1] || '';
        return (
          <CampaignShareOption
            campaignId={campaignId}
            onBack={() => setTab('marketplace')}
          />
        );
      }

      switch (currentTab) {
        case 'dashboard': return <AmbassadorDashboard userData={userData} onNavigateToWallet={() => setTab('wallet')} />;
        case 'marketplace': return <CampaignMarketplace onShareCampaign={(campaignId) => setTab(`campaign-share/${campaignId}`)} />;
        case 'tasks': return <TaskHistory proofs={proofs} setProofs={setProofs} addNotification={addNotification} />;
        case 'notes': return <StrategyNotes />;
        case 'wallet': return <WalletView onWithdrawalRequested={(a, p) => console.log('Withdrawal requested', a, p)} />;
        case 'create-campaign': return <CreateCampaign onSuccess={handleCampaignFormSuccess} onCancel={() => setTab('dashboard')} />;
        case 'my-campaigns': return <MyCampaigns onRetryPayment={(id, amount) => { setPendingCampaignId(id); setPendingAmount(amount); setShowPayment(true); }} onNavigateToCreate={() => setTab('create-campaign')} />;
        default: return <AmbassadorDashboard userData={userData} onNavigateToWallet={() => setTab('wallet')} />;
      }
    };

    const handleGoToLogin = async () => {
      await supabase.auth.signOut();
      setView('login');
    };

    const handleResendVerification = async () => {
      if (!user?.email) throw new Error('Email introuvable.');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/app` }
      });
      if (error) throw error;
    };

    // if (loading) {
    //   return (
    //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
    //       <Loader2 className="animate-spin text-indigo-600" size={32} />
    //     </div>
    //   );
    // }

    // if (loadingUser) {
    //   return (
    //     <div className="flex items-center justify-center h-96">
    //       <Clock className="animate-spin text-indigo-600" size={40} />
    //     </div>
    //   );
    // }


    // ⚠️ Ne PAS retourner tôt ici : ça démonterait tous les composants enfants
    // et ferait perdre les données des formulaires en cours de saisie.
    // À la place, on affiche un overlay par-dessus le contenu existant.
    const showLoadingOverlay = loading && view !== 'landing' && view !== 'reset-password';

    if (view === 'login') return <LoginView onSuccess={() => setView(redirectAfterLogin || 'app')} onGoBack={() => setView('landing')} onGoToRegister={() => setView('register')} />
    if (view === 'register') return <RegistrationForm onComplete={() => setView('verification-pending')} onCancel={() => setView('landing')} onGoToLogin={() => setView('login')} />;
    if (view === 'verification-pending') return <VerificationPending email={user?.email} onGoToLogin={handleGoToLogin} onResend={handleResendVerification} />;
    if (view === 'reset-password') return <ResetPasswordView onSuccess={() => setView('login')} onBackToLogin={() => setView('login')} />;
    // Handler appelé après validation du formulaire campagne (avant paiement)
    const handleCampaignFormSuccess = async (campaignDraft: Omit<Campaign, 'id'>, amount: number) => {
      try {
        // Vérifier que l'utilisateur est connecté
        if (!user) {
          // console.error("❌ User not authenticated");
          alert("Erreur: Vous devez être connecté pour créer une campagne.");
          return;
        }

        // console.log("📝 Campaign Draft:", campaignDraft);
        // console.log("💰 Amount:", amount);
        // console.log("👤 User ID:", user.id);

        // Vérifier les champs requis
        const requiredFields = ['title', 'description', 'platform'];
        const missingFields = requiredFields.filter(field => !campaignDraft[field as keyof typeof campaignDraft]);

        if (missingFields.length > 0) {
          // console.error("❌ Missing fields:", missingFields);
          alert(`Erreur: Champs manquants: ${missingFields.join(', ')}`);
          return;
        }

        if (!amount || amount <= 0) {
          // console.error("❌ Invalid amount:", amount);
          alert("Erreur: Le montant doit être supérieur à 0.");
          return;
        }

        const campaignData = {
          ...campaignDraft,
          advertiserId: user.id,        // ✅ Requis par les règles
          advertiserEmail: user.email,    // ✅ Pour contact
          advertiserName: userData?.name || user.user_metadata?.full_name || 'Advertiser',  // ✅ NOUVEAU
          advertiserPhone: userData?.momoNumber || '',  // ✅ NOUVEAU (depuis profil user)
          createdBy: 'user',              // ✅ Doit être 'user'
          paymentStatus: 'pending_payment',
          paymentConfirmed: false,
          campaignPaymentStatus: 'pending_payment',
          paymentAmount: amount,
          paymentMethod: 'gomboplus',
          status: 'pending',              // ✅ Requis par les règles
          priority: false,                 // ✅ Ne pas oublier (ou ça échoue)
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // console.log("📦 Campaign Data to save:", campaignData);
        const { data, error } = await supabase.from('campaigns').insert(campaignData).select('id').single();
        if (error) throw error;
        if (!data) throw new Error("Erreur lors de la création de la campagne sur Supabase.");

        // console.log("✅ Campaign created with ID:", data.id);

        setPendingCampaignId(data.id);
        setPendingAmount(amount);

        // Send email notification for campaign creation
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              type: 'campaign_created',
              data: {
                advertiserName: campaignData.advertiserName,
                campaignTitle: campaignDraft.title,
                budget: amount,
                amount: amount,
                campaignId: data.id,
              }
            }
          });
          console.log("Email de création de campagne envoyé ✅");
        } catch (emailErr) {
          console.warn("Échec envoi email création campagne:", emailErr);
        }

        setShowPayment(true);
      } catch (error: unknown) {
        // console.error("❌ Campaign creation error:", error);

        let errorMessage = "Erreur inconnue";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        alert(`Erreur lors de la préparation du paiement:\n${errorMessage}`);
      }
    };

    // Handler appelé après paiement réussi
    const handlePaymentSuccess = async (payment: { reference: string; operator: string; recipientNumber: string }) => {
      if (!pendingCampaignId) return;
      try {
        const { error } = await supabase.from('campaigns').update({
          paymentStatus: 'paid',
          paymentConfirmed: true, // ✅ CORRECTED: Should be TRUE when payment succeeds
          campaignPaymentStatus: 'payment_received',
          paymentReference: payment.reference,
          paymentOperator: payment.operator,
          status: 'active', // ✅ Activate campaign immediately
          paymentConfirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).eq('id', pendingCampaignId);
        if (error) throw error;

        setSuccessData({ campaignId: pendingCampaignId, amount: pendingAmount });

        // Send email notification for payment success
        if (user?.email) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: user.email,
                type: 'campaign_confirmed',
                data: {
                  advertiserName: userData?.name || user.user_metadata?.full_name || 'Annonceur',
                  campaignTitle: successData.campaignId || 'Votre campagne',
                  amount: pendingAmount,
                  campaignId: pendingCampaignId,
                }
              }
            });
            console.log("Email de confirmation de paiement envoyé ✅");
          } catch (emailErr) {
            console.warn("Échec envoi email confirmation paiement:", emailErr);
          }
        }
      } catch (error) {
        console.error(error);
        alert("Erreur lors de l'enregistrement de la campagne après paiement.");
        return;
      }
      setShowPayment(false);
      setPendingCampaignId(null);
      setPendingAmount(0);
      if (user) {
        setView('app');
        setTab('my-campaigns');
      } else {
        setView('advertise-success');
      }
    };

    // Handler annulation paiement
    const handlePaymentCancel = async () => {
      if (user?.email && pendingCampaignId) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              type: 'payment_failed',
              data: {
                advertiserName: userData?.name || user.user_metadata?.full_name || 'Annonceur',
                campaignTitle: 'Campagne non payée',
                error: 'Paiement annulé par l\'utilisateur',
              }
            }
          });
        } catch (emailErr) {
          console.warn("Échec envoi email annulation paiement:", emailErr);
        }
      }
      setShowPayment(false);
      setPendingCampaignId(null);
      setPendingAmount(0);
      if (user) {
        setView('app');
        setTab('my-campaigns');
      } else {
        setView('landing');
      }
    };

    if (showPayment && pendingCampaignId) {
      return (
        <PaymentPage
          amount={pendingAmount}
          campaignId={pendingCampaignId}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      );
    }

    if (view === 'advertise') return <CreateCampaign onSuccess={handleCampaignFormSuccess} onCancel={() => setView('landing')} />;
    if (view === 'advertise-success') return <SuccessCampaign {...successData} onFinish={() => setView('landing')} />;

    return (
      <div className="min-h-screen bg-gray-50 relative">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        {/* Header uniquement pour les utilisateurs non connectes (landing page) */}
        {/* {!user && (
          <Header
            view={view === 'app' || view === 'profile' ? 'app' : 'landing'}
            role={userData?.role || UserRole.AMBASSADOR}
            setView={(v) => setView(v as any)}
            setRole={() => { }}
            user={user}
          />
        )} */}
        {view === 'landing' ? (
          <LandingPage
            user={user}
            onStart={() => user ? setView('app') : setView('register')}
            onAdvertise={() => setView('advertise')}
            setView={(v) => setView(v as any)}
          />
        ) : view === 'about' ? (
          <AboutView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
        ) : view === 'legal' ? (
          <LegalView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
        ) : view === 'terms' ? (
          <TermsView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
        ) : view === 'contact' ? (
          <ContactView
            onNavigate={(v) => setView(v as any)}
            onStart={() => user ? setView('app') : setView('register')}
          />
        ) : view === 'profile' ? (
          <ProfilePage onBack={() => setView('app')} />
        ) : (
          <Layout
            role={currentTab.startsWith('admin') ? (isAdmin ? UserRole.ADMIN : UserRole.MODERATOR) : UserRole.AMBASSADOR}
            currentTab={currentTab}
            setTab={setTab}
            onRoleSwitch={handleRoleSwitch}
            onNavigateToProfile={() => setView('profile')}
          >
            {renderContent()}
          </Layout>
        )}

        {/* ── Cartes flottantes (position: fixed → toujours en bas à droite) ── */}
        <InstallPrompt />
        <PushNotificationBanner userId={user?.id ?? null} />
        <ScrollToTop />

        {/* ────── Overlay de chargement ──────
          Superposé par-dessus le contenu existant (fixed) pour ne PAS démonter
          les composants enfants et conserver l'état des formulaires en cours. */}
        {showLoadingOverlay && (
          <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 text-indigo-600"
            style={{ background: 'rgba(249,250,251,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="font-bold text-sm uppercase tracking-widest">Chargement de votre profil...</p>
          </div>
        )}

      </div>
    );

  };

  export default App;
