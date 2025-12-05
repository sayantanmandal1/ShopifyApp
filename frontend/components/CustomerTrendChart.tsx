'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import DateRangePicker from './DateRangePicker';
import { useCustomerTrend } from '../hooks/useCustomerTrend';

export default function CustomerTrendChart() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { customerTrend, isLoading, error } = useCustomerTrend(
    startDate || undefined,
    endDate || undefined
  );

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">
            {formatDate(payload[0].payload.date)}
          </p>
          <p className="text-sm text-blue-600">
            New Customers: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6 shadow">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Customer Acquisition Trend
        </h3>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClear={handleClearFilters}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64 sm:h-80">
          <div className="text-sm sm:text-base text-gray-500">Loading chart data...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 sm:h-80">
          <div className="text-sm sm:text-base text-red-500">Error: {error}</div>
        </div>
      )}

      {!isLoading && !error && customerTrend && customerTrend.length === 0 && (
        <div className="flex items-center justify-center h-64 sm:h-80">
          <div className="text-sm sm:text-base text-gray-500">No customer data available</div>
        </div>
      )}

      {!isLoading && !error && customerTrend && customerTrend.length > 0 && (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[300px]">
            <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
              <LineChart
                data={customerTrend}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="New Customers"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
