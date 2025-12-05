'use client';

import { useTopProducts } from '../hooks/useTopProducts';

export default function TopProductsTable() {
  const { topProducts, isLoading, error } = useTopProducts();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Products by Revenue
      </h3>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading products...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}

      {!isLoading && !error && topProducts && topProducts.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">No product data available</div>
        </div>
      )}

      {!isLoading && !error && topProducts && topProducts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Rank
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {topProducts.map((product, index) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.productTitle}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
