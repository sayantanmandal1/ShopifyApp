import useSWR from 'swr';

interface Metrics {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

interface MetricsResponse {
  success: boolean;
  data: Metrics;
}

const fetcher = async (url: string): Promise<Metrics> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch metrics');
  }

  const data: MetricsResponse = await response.json();
  return data.data;
};

export function useMetrics() {
  const { data, error, isLoading, mutate } = useSWR<Metrics>(
    'http://localhost:3001/api/analytics/metrics',
    fetcher,
    {
      refreshInterval: 300000, // 5 minutes in milliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    metrics: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
