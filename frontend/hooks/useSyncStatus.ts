import { useState, useEffect } from 'react';

interface JobStatus {
  jobId: string;
  state: string;
  progress: number;
  type: string;
  result?: {
    count: number;
    errors: string[];
    completedAt: string;
  };
  failedReason?: string;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
}

export function useSyncStatus(jobIds: string[], enabled: boolean = false) {
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || jobIds.length === 0) {
      return;
    }

    const fetchStatuses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        const statusPromises = jobIds.map(async (jobId) => {
          const response = await fetch(
            `http://localhost:3001/api/ingestion/status/${jobId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch status for job ${jobId}`);
          }

          return response.json();
        });

        const results = await Promise.all(statusPromises);
        setStatuses(results);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch job statuses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();

    // Poll for status updates every 3 seconds while jobs are active
    const interval = setInterval(fetchStatuses, 3000);

    return () => clearInterval(interval);
  }, [jobIds, enabled]);

  // Check if all jobs are completed
  const allCompleted = statuses.length > 0 && 
    statuses.every(status => status.state === 'completed' || status.state === 'failed');

  // Check if any jobs failed
  const anyFailed = statuses.some(status => status.state === 'failed');

  return {
    statuses,
    isLoading,
    error,
    allCompleted,
    anyFailed,
  };
}
