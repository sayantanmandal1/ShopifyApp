'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useOrdersByFulfillmentStatus } from '../hooks/useOrdersByFulfillmentStatus';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OrdersByFulfillmentStatusChart() {
  const { ordersByStatus, isLoading, error } = useOrdersByFulfillmentStatus();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">
            {payload[0].name}
          </p>
          <p className="text-sm text-gray-600">
            Orders: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format status for display
  const formatStatus = (status: string) => {
    if (!status || status === 'null') return 'Unfulfilled';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Prepare data for pie chart
  const chartData = ordersByStatus?.map((item) => ({
    name: formatStatus(item.status),
    value: item.count,
  })) || [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Orders by Fulfillment Status
        </h3>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-80">
          <div className="text-gray-500">Loading chart data...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-80">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <div className="flex items-center justify-center h-80">
          <div className="text-gray-500">No order data available</div>
        </div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
