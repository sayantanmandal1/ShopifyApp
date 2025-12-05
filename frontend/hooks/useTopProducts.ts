import useSWR from 'swr';

export interface TopProduct {
  productId: string;
  productTitle: string;
  revenue: number;
}

interface TopProductsResponse {
  success: boolean;
  data: TopProduct[];
}

const fetcher = async (url: string): Promise<TopProduct[]> => {
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
    throw new Error(error.error || 'Failed to fetch top products');
  }

  const data: TopProductsResponse = await response.json();
  return data.data;
};

export function useTopProducts() {
  const url = 'http://localhost:3001/api/analytics/top-products';

  const { data, error, isLoading, mutate } = useSWR<TopProduct[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    topProducts: data,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
