'use client';

import { useState, useEffect } from 'react';
import { useDataSync } from '../hooks/useDataSync';
import { useSyncStatus } from '../hooks/useSyncStatus';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const { triggerSync, isLoading, error, lastSyncTime, jobIds } = useDataSync();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [trackingJobIds, setTrackingJobIds] = useState<string[]>([]);
  
  // Track job status when jobs are created
  const { statuses, allCompleted, anyFailed } = useSyncStatus(
    trackingJobIds,
    trackingJobIds.length > 0
  );

  // Update tracking when new jobs are created
  useEffect(() => {
    if (jobIds.length > 0) {
      setTrackingJobIds(jobIds);
    }
  }, [jobIds]);

  // Clear tracking when all jobs complete
  useEffect(() => {
    if (allCompleted && trackingJobIds.length > 0) {
      // Wait a bit before clearing to show final status
      const timeout = setTimeout(() => {
        setTrackingJobIds([]);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [allCompleted, trackingJobIds.length]);

  const handleSync = async () => {
    setShowSuccess(false);
    setShowError(false);

    const success = await triggerSync();

    if (success) {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Call the callback if provided
      if (onSyncComplete) {
        onSyncComplete();
      }
    } else {
      setShowError(true);
      // Hide error message after 5 seconds
      setTimeout(() => setShowError(false), 5000);
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
        <button
          onClick={handleSync}
          disabled={isLoading || trackingJobIds.length > 0}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 w-full sm:w-auto ${
            isLoading || trackingJobIds.length > 0
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600'
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg
                className="h-3 w-3 sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Data
            </>
          )}
        </button>

        {/* Last Sync Timestamp */}
        {lastSyncTime && (
          <div className="text-xs text-gray-500 text-right">
            Last synced: {formatRelativeTime(lastSyncTime)}
          </div>
        )}
      </div>

      {/* Job Status Indicator */}
      {trackingJobIds.length > 0 && statuses.length > 0 && (
        <div className="rounded-md bg-blue-50 p-2 sm:p-3 border border-blue-200 w-full sm:min-w-[300px]">
          <div className="flex items-start">
            <div className="shrink-0">
              {allCompleted ? (
                anyFailed ? (
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )
              ) : (
                <svg
                  className="animate-spin h-5 w-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
            </div>
            <div className="ml-2 sm:ml-3 flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-blue-800">
                {allCompleted
                  ? anyFailed
                    ? 'Sync completed with errors'
                    : 'Sync completed successfully'
                  : 'Syncing in progress...'}
              </h3>
              <div className="mt-1 sm:mt-2 text-xs text-blue-700 space-y-1">
                {statuses.map((status) => (
                  <div key={status.jobId} className="flex items-center justify-between gap-2">
                    <span className="capitalize truncate">{status.type}:</span>
                    <span className="font-medium whitespace-nowrap">
                      {status.state === 'completed' && status.result ? (
                        <span className="text-green-700">
                          ✓ {status.result.count} records
                        </span>
                      ) : status.state === 'failed' ? (
                        <span className="text-red-700">✗ Failed</span>
                      ) : status.state === 'active' ? (
                        <span className="text-blue-700">Processing...</span>
                      ) : (
                        <span className="text-gray-600">{status.state}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="rounded-md bg-green-50 p-2 sm:p-3 border border-green-200 w-full sm:w-auto">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <p className="text-xs sm:text-sm font-medium text-green-800">
                Data sync started successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showError && error && (
        <div className="rounded-md bg-red-50 p-2 sm:p-3 border border-red-200 w-full sm:w-auto">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-800 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
