import useSWR from 'swr';

export interface OrdersByDate {
  date: string;
  orderCount: number;
  revenue: number;
}

interface OrdersByDateResponse {
  success: boolean;
  data: OrdersByDate[];
}

const fetcher = async (url: string): Promise<OrdersByDate[]> => {
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
    throw new Error(error.error || 'Failed to fetch orders by date');
  }

  const data: OrdersByDateResponse = await response.json();
  return data.data;
};

export function useOrdersByDate(startDate?: string, endDate?: string) {
  // Build URL with query parameters
  const params = new URLSearchParams();
  if (startDate) {
    params.append('startDate', new Date(startDate).toISOString());
  }
  if (endDate) {
    params.append('endDate', new Date(endDate).toISOString());
  }
  
  const queryString = params.toString();
  const url = `http://localhost:3001/api/analytics/orders-by-date${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<OrdersByDate[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    ordersByDate: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
