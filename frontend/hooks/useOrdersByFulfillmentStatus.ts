import useSWR from 'swr';

export interface OrdersByStatus {
  status: string;
  count: number;
}

interface OrdersByStatusResponse {
  success: boolean;
  data: OrdersByStatus[];
}

const fetcher = async (url: string): Promise<OrdersByStatus[]> => {
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
    throw new Error(error.error || 'Failed to fetch orders by fulfillment status');
  }

  const data: OrdersByStatusResponse = await response.json();
  return data.data;
};

export function useOrdersByFulfillmentStatus() {
  const url = 'http://localhost:3001/api/analytics/orders-by-fulfillment-status';

  const { data, error, isLoading, mutate } = useSWR<OrdersByStatus[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    ordersByStatus: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
