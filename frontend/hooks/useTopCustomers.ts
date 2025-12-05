import { useState, useEffect } from 'react';

interface CustomerSpend {
  customerId: string;
  customerName: string;
  email: string | null;
  totalSpend: number;
}

interface UseTopCustomersReturn {
  customers: CustomerSpend[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTopCustomers(): UseTopCustomersReturn {
  const [customers, setCustomers] = useState<CustomerSpend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopCustomers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        'http://localhost:3001/api/analytics/top-customers',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch top customers');
      }

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopCustomers();
  }, []);

  return {
    customers,
    isLoading,
    error,
    refetch: fetchTopCustomers,
  };
}
