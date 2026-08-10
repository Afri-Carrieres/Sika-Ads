import { useEffect, useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('sikaads_install_dismissed') === 'true'
  );

  useEffect(() => {
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`✅ Installation: ${outcome}`);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('sikaads_install_dismissed', 'true');
    setDismissed(true);
  };

  if (isInstalled || dismissed) return null;

  // Sur iOS
  if (isIOS) {
    return (
      <div className="floating-card-popup">
        <div className="floating-card-popup__header">
          <div className="floating-card-popup__logo">
            <img src="/Web-Icon.png" alt="SikaAds" className="floating-card-popup__logo-img" />
          </div>
          <div className="floating-card-popup__title-block">
            <span className="floating-card-popup__app-name">Installer SikaAds</span>
            <span className="floating-card-popup__app-sub">Application bureau disponible</span>
          </div>
          <button className="floating-card-popup__close" onClick={handleDismiss} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>

        <div className="floating-card-popup__body">
          <Monitor size={16} className="floating-card-popup__body-icon" />
          <p className="floating-card-popup__body-text">
            Appuyez sur <span className="floating-card-popup__body-accent">⬆ Partager</span>, puis
            sélectionnez <strong>"Sur l'écran d'accueil"</strong>
          </p>
        </div>

        <div className="floating-card-popup__actions flex flex-row ">
          <button className="floating-card-popup__btn-ghost" onClick={handleDismiss}>
            Plus tard
          </button>
          <button className="floating-card-popup__btn-primary" onClick={handleInstall}>
            <Download size={15} />
            Installer
          </button>
        </div>
      </div>
    );
  }

  // Sur Android / Desktop
  if (installPrompt) {
    return (
      <div className="floating-card-popup">
        <div className="floating-card-popup__header">
          <div className="floating-card-popup__logo bg-white">
            <img src="/Web-Icon.png" alt="SikaAds" className="floating-card-popup__logo-img" />
          </div>
          <div className="floating-card-popup__title-block">
            <span className="floating-card-popup__app-name">Installer SikaAds</span>
            <span className="floating-card-popup__app-sub">Application bureau disponible</span>
          </div>
          <button className="floating-card-popup__close" onClick={handleDismiss} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>

        <div className="floating-card-popup__body">
          <Monitor size={16} className="floating-card-popup__body-icon" />
          <p className="floating-card-popup__body-text">
            Accédez à SikaAds comme une vraie application,
            sans passer par le navigateur.
          </p>
        </div>

        <div className="floating-card-popup__actions flex flex-row justify-around">
          <button className="floating-card-popup__btn-ghost" onClick={handleDismiss}>
            Plus tard
          </button>
          <button className="floating-card-popup__btn-primary" onClick={handleInstall}>
            <Download size={15} />
            Installer
          </button>
        </div> 
      </div>
    );
  }

  return null;
}
