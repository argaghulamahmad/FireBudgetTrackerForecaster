import { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getLogger } from '../utils/logger';

const logger = getLogger('PWA');

interface UsePWAReturn {
  needRefresh: boolean;
  offlineReady: boolean;
  updateSW: (reload?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  dismissOffline: () => void;
}

export function usePWA(): UsePWAReturn {
  const [dismissedOffline, setDismissedOffline] = useState(false);
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      logger.info('SW registered', { scope: r?.scope });
    },
    onRegisterError(error) {
      logger.error('SW registration failed', error);
    },
  });

  const updateSW = useCallback(
    async (reload = true) => {
      try {
        logger.info('Triggering SW update');
        await updateServiceWorker(reload);
      } catch (error) {
        logger.error('Failed to update SW', error);
      }
    },
    [updateServiceWorker]
  );

  const dismissUpdate = useCallback(() => {
    logger.info('Update dismissed by user');
    // Clear the needRefresh state by triggering a skip-wait without reload
    // This is handled by the parent component managing the banner visibility
  }, []);

  const dismissOffline = useCallback(() => {
    setDismissedOffline(true);
  }, []);

  return {
    needRefresh,
    offlineReady: offlineReady && !dismissedOffline,
    updateSW,
    dismissUpdate,
    dismissOffline,
  };
}
