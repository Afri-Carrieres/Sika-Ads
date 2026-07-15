import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturer l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`✅ Installation: ${outcome}`);
    setInstallPrompt(null);
  };

  // Si déjà installé, ne rien afficher
  if (isInstalled) return null;

  // Sur iOS, afficher les instructions manuelles
  if (isIOS) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
        <div className="text-blue-600 text-xl">
            
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">Installer SikaAds sur votre appareil</p>
          <p className="text-xs text-blue-800 mt-1">
            Appuyez sur le bouton de partage <span className="font-mono">⬆</span>, puis sélectionnez "Sur l'écran d'accueil"
          </p>
        </div>
      </div>
    );
  }

  // Sur Android/Desktop, afficher le bouton d'installation
  if (installPrompt) {
    return (
      <div className="mb-4">
        <button
          onClick={handleInstall}
          className="w-full bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span className="text-lg"></span>
          <span>Installer SikaAds</span>
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Accédez à SikaAds directement depuis votre écran d'accueil
        </p>
      </div>
    );
  }

  return null;
}
