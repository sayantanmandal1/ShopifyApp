import useSWR from 'swr';

export interface TrendData {
  date: string;
  value: number;
}

interface TrendDataResponse {
  success: boolean;
  data: TrendData[];
}

const fetcher = async (url: string): Promise<TrendData[]> => {
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
    throw new Error(error.error || 'Failed to fetch average order value trend');
  }

  const data: TrendDataResponse = await response.json();
  return data.data;
};

export function useAverageOrderValueTrend(startDate?: string, endDate?: string) {
  // Build URL with query parameters
  const params = new URLSearchParams();
  if (startDate) {
    params.append('startDate', new Date(startDate).toISOString());
  }
  if (endDate) {
    params.append('endDate', new Date(endDate).toISOString());
  }
  
  const queryString = params.toString();
  const url = `http://localhost:3001/api/analytics/average-order-value-trend${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<TrendData[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    aovTrend: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
