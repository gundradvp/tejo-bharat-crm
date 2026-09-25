import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface InstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<void>;
}

export function useInstallApp(): InstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    setIsInstalled(standalone || iosStandalone);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function InstallButton({ className = '', label = 'Install App' }: { className?: string; label?: string }) {
  const { canInstall, isInstalled, isIOS, install } = useInstallApp();
  const [showIOSHint, setShowIOSHint] = useState(false);

  if (isInstalled) return null;

  const handleClick = () => {
    if (canInstall) {
      install();
    } else if (isIOS) {
      setShowIOSHint(true);
      setTimeout(() => setShowIOSHint(false), 6000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          canInstall
            ? 'bg-green-600 text-white hover:bg-green-700'
            : isIOS
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'hidden'
        } ${className}`}
        title="Install this app on your device"
      >
        <Download className="w-4 h-4" />
        <span className="hidden xl:inline">{label}</span>
      </button>

      {showIOSHint && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 text-sm text-gray-600">
          <p className="font-semibold text-gray-900 mb-1">Install on iOS</p>
          <p>Tap the Share button at the bottom of Safari, then select "Add to Home Screen".</p>
        </div>
      )}
    </div>
  );
}
