import { useEffect, useRef } from 'react';

interface AutoBackupOptions {
  onBackup: () => Promise<void>;
  logCount: number;
  activityThreshold?: number;
}

export const useAutoBackup = ({ onBackup, logCount, activityThreshold = 50 }: AutoBackupOptions) => {
  const lastBackupCount = useRef(logCount);
  const lastBackupDate = useRef(new Date().toDateString());

  useEffect(() => {
    // 1. Check activity threshold
    if (logCount - lastBackupCount.current >= activityThreshold) {
      console.log('Triggering auto-backup due to activity threshold');
      onBackup();
      lastBackupCount.current = logCount;
    }

    // 2. Check daily trigger (interval check)
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastBackupDate.current) {
        console.log('Triggering auto-backup due to daily scheduled check');
        onBackup();
        lastBackupDate.current = today;
      }
    }, 1000 * 60 * 60); // Check every hour

    return () => clearInterval(interval);
  }, [logCount, activityThreshold, onBackup]);
};
