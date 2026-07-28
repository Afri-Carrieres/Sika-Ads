// ============================================================
// components/PushNotificationBanner.tsx
// Carte flottante en bas à droite pour activer les notif push
// ============================================================

import React, { useState } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface PushNotificationBannerProps {
  userId: string | null;
}

const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({ userId }) => {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('sikaads_push_dismissed') === 'true'
  );

  const { permission, isSubscribed, isLoading, requestPermission } = usePushNotifications({ userId });

  if (!userId) return null;
  if (permission === 'granted' && isSubscribed) return null;
  if (permission === 'denied') return null;
  if (permission === 'unsupported') return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('sikaads_push_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="floating-card-popup floating-card-popup--push">
      {/* Header */}
      <div className="floating-card-popup__header">
        <div className="floating-card-popup__logo floating-card-popup__logo--bell">
          <Bell size={20} className="floating-card-popup__logo-bell-icon" />
          <Sparkles size={10} className="floating-card-popup__logo-sparkle" />
        </div>
        <div className="floating-card-popup__title-block">
          <span className="floating-card-popup__app-name">Notifications SikaAds</span>
          <span className="floating-card-popup__app-sub">Restez informé en temps réel</span>
        </div>
        <button
          className="floating-card-popup__close"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="floating-card-popup__body">
        <Bell size={16} className="floating-card-popup__body-icon floating-card-popup__body-icon--green" />
        <p className="floating-card-popup__body-text">
          Recevez vos <span className="floating-card-popup__body-accent">gains validés</span>,
          nouvelles campagnes et mises à jour — même fenêtre fermée.
        </p>
      </div>

      {/* Actions */}
      <div className="floating-card-popup__actions">
        <button className="floating-card-popup__btn-ghost" onClick={handleDismiss}>
          Plus tard
        </button>
        <button
          className="floating-card-popup__btn-primary floating-card-popup__btn-primary--green"
          onClick={requestPermission}
          disabled={isLoading}
        >
          {isLoading ? <span className="floating-card-popup__spinner" /> : <Bell size={15} />}
          Activer
        </button>
      </div>
    </div>
  );
};

export default PushNotificationBanner;
