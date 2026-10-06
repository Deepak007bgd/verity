import { useEffect } from 'react';

export function useIntegrityMonitor(isActive, onIntegrityEvent) {
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onIntegrityEvent({
          type: 'tab_switch',
          time: new Date().toLocaleTimeString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, onIntegrityEvent]);
}
