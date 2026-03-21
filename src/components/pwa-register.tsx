'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Registers /sw.js and listens for updates.
 * When a new service worker is waiting, a toast prompts the user to refresh.
 * Renders nothing — purely side-effectful.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Only register over HTTPS (or localhost for dev testing)
    const isSecure =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost';
    if (!isSecure) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;

        // If there's already a waiting worker when we load, offer the refresh
        if (reg.waiting) {
          notifyUpdate(reg.waiting);
        }

        // Listen for a new worker moving into the waiting state
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate(newWorker);
            }
          });
        });
      })
      .catch((err) => {
        // Fail silently in dev; log for debugging
        console.warn('[PWA] Service worker registration failed:', err);
      });

    // Reload the page once the new worker has taken control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      registration?.removeEventListener('updatefound', () => {});
    };
  }, []);

  return null;
}

function notifyUpdate(worker: ServiceWorker) {
  toast('App update available', {
    description: 'A new version is ready.',
    duration: Infinity,
    action: {
      label: 'Refresh',
      onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
    },
  });
}
