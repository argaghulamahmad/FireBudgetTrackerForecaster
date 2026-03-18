import { useEffect } from 'react';
import { RotateCw, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { usePWA } from '../hooks/usePWA';
import { cn } from '../utils/cn';
import { TranslationKeys } from '../utils/i18n';

interface PWAUpdateBannerProps {
  t: Record<TranslationKeys, string>;
}

export function PWAUpdateBanner({ t }: PWAUpdateBannerProps) {
  const { offlineReady, needRefresh, updateSW, dismissOffline } = usePWA();
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  // Show offline ready notification once
  useEffect(() => {
    if (offlineReady) {
      showToast(t.pwaOfflineReady, 'info', 3000);
      dismissOffline();
    }
  }, [offlineReady, t, showToast, dismissOffline]);

  // Reset dismissed state when new update is available
  useEffect(() => {
    if (needRefresh) {
      setDismissed(false);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    // updateSW handles the SW skip-waiting and page reload internally
    updateSW(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Show banner only if update is available AND not dismissed
  if (!needRefresh || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-[72px] left-0 right-0 z-50 mx-4 my-2 rounded-lg',
        'bg-health-surface border border-health-separator shadow-md',
        'flex items-center gap-3 px-4 py-3'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <RotateCw className="w-5 h-5 text-indigo-600 flex-shrink-0" />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-semibold text-health-text">
            {t.pwaUpdateAvailable}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-semibold',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'transition-colors'
          )}
        >
          {t.pwaUpdateNow}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t.pwaDismiss}
          className={cn(
            'p-1 text-health-secondary hover:text-health-text',
            'transition-colors'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
