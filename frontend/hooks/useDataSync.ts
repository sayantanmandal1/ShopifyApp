import { useState } from 'react';

interface SyncResponse {
  message: string;
  jobIds: string[];
  tenantId: string;
}

interface SyncError {
  error: string;
  details?: string;
}

export function useDataSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [jobIds, setJobIds] = useState<string[]>([]);

  const triggerSync = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:3001/api/ingestion/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: SyncError = await response.json();
        throw new Error(errorData.error || 'Failed to trigger sync');
      }

      const data: SyncResponse = await response.json();
      setJobIds(data.jobIds);
      setLastSyncTime(new Date());
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to trigger sync');
      setIsLoading(false);
      return false;
    }
  };

  return {
    triggerSync,
    isLoading,
    error,
    lastSyncTime,
    jobIds,
  };
}
