import React from 'react';
import { Navigate } from 'react-router-dom';
import LandingPage from './views/LandingPage';
import AboutView from './views/AboutView';
import LegalView from './views/LegalView';
import TermsView from './views/TermsView';
import LoginView from './views/LoginView';
import RegistrationForm from './views/RegistrationForm';
import VerificationPending from './views/VerificationPending';
import ResetPasswordView from './views/ResetPasswordView';
import ProfilePage from './views/ProfilePage';
import CreateCampaign from './views/CreateCampaign';
import SuccessCampaign from './views/SuccessCampaign';
import Layout from './components/Layout';
import AmbassadorDashboard from './views/AmbassadorDashboard';
import CampaignMarketplace from './views/CampaignMarketplace';
import TaskHistory from './views/TaskHistory';
import StrategyNotes from './views/StrategyNotes';
import AdminPanel from './views/AdminPanel';
import AdminCreateCampaign from './views/AdminCreateCampaign';
import MyCampaigns from './views/MyCampaigns';
import WalletView from './views/WalletView';
import CampaignShareOption from './views/CampaignShareOption';
import PaymentPage from './views/PaymentPage';

export type AppRouteParams = {
  view?: string;
  tab?: string;
  campaignId?: string;
};

// Helper to create route definitions
export const createRoutes = (
  user: any,
  userData: any,
  isAdmin: boolean,
  isStaff: boolean,
  proofs: any,
  onNavigateFunctions: {
    onStart: () => void;
    onAdvertise: () => void;
    onNavigateToProfile: () => void;
    onNavigateToWallet: () => void;
    onNavigateToCreate: () => void;
    onCampaignFormSuccess: (campaignDraft: any, amount: number) => void;
    onPaymentSuccess: (payment: any) => void;
    onPaymentCancel: () => void;
    onNavigateToTab: (tab: string) => void;
    onGoToLogin: () => void;
    onResendVerification: () => void;
    onRoleSwitch: () => void;
  },
  currentTab: string,
  setProofs: (proofs: any) => void,
  addNotification: (notif: any) => void,
  setTab: (tab: string) => void,
  onBack: () => void
) => {
  return [
    // Public routes
    {
      path: '/',
      element: (
        <LandingPage
          user={user}
          onStart={onNavigateFunctions.onStart}
          onAdvertise={onNavigateFunctions.onAdvertise}
          setView={(v: string) => {
            // Navigate to path instead of using old setView pattern
            window.history.pushState(null, '', `/${v}`);
          }}
        />
      ),
    },
    {
      path: '/about',
      element: (
        <AboutView
          onNavigate={(v: string) => {
            window.history.pushState(null, '', `/${v}`);
          }}
          onStart={onNavigateFunctions.onStart}
        />
      ),
    },
    {
      path: '/legal',
      element: (
        <LegalView
          onNavigate={(v: string) => {
            window.history.pushState(null, '', `/${v}`);
          }}
        />
      ),
    },
    {
      path: '/terms',
      element: (
        <TermsView
          onNavigate={(v: string) => {
            window.history.pushState(null, '', `/${v}`);
          }}
          onStart={onNavigateFunctions.onStart}
        />
      ),
    },
    {
      path: '/login',
      element: (
        <LoginView
          onSuccess={() => {
            window.location.href = '/app';
          }}
          onGoBack={() => {
            window.history.back();
          }}
          onGoToRegister={() => {
            window.history.pushState(null, '', '/register');
          }}
        />
      ),
    },
    {
      path: '/register',
      element: (
        <RegistrationForm
          onComplete={() => {
            window.history.pushState(null, '', '/verification-pending');
          }}
          onCancel={() => {
            window.history.back();
          }}
          onGoToLogin={() => {
            window.history.pushState(null, '', '/login');
          }}
        />
      ),
    },
    {
      path: '/verification-pending',
      element: (
        <VerificationPending
          email={user?.email}
          onGoToLogin={onNavigateFunctions.onGoToLogin}
          onResend={onNavigateFunctions.onResendVerification}
        />
      ),
    },
    {
      path: '/reset-password',
      element: (
        <ResetPasswordView
          onSuccess={() => {
            window.history.pushState(null, '', '/login');
          }}
          onBackToLogin={() => {
            window.history.pushState(null, '', '/login');
          }}
        />
      ),
    },
    {
      path: '/advertise',
      element: (
        <CreateCampaign
          onSuccess={onNavigateFunctions.onCampaignFormSuccess}
          onCancel={() => {
            window.history.back();
          }}
        />
      ),
    },
    {
      path: '/advertise-success',
      element: (
        <SuccessCampaign
          campaignId=""
          amount={0}
          onFinish={() => {
            window.history.pushState(null, '', '/');
          }}
        />
      ),
    },
    // Protected app routes
    {
      path: '/app',
      element: user ? (
        <Layout
          role={userData?.role || 'ambassador'}
          currentTab={currentTab}
          setTab={setTab}
          onRoleSwitch={onNavigateFunctions.onRoleSwitch}
          onNavigateToProfile={onNavigateFunctions.onNavigateToProfile}
        >
          <AmbassadorDashboard
            userData={userData}
            onNavigateToWallet={onNavigateFunctions.onNavigateToWallet}
          />
        </Layout>
      ) : (
        <Navigate to="/" replace />
      ),
    },
    {
      path: '/profile',
      element: user ? (
        <ProfilePage onBack={onBack} />
      ) : (
        <Navigate to="/" replace />
      ),
    },
    // Catch-all
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ];
};
