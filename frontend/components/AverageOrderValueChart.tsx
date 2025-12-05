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
import { useAverageOrderValueTrend } from '../hooks/useAverageOrderValueTrend';

export default function AverageOrderValueChart() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { aovTrend, isLoading, error } = useAverageOrderValueTrend(
    startDate || undefined,
    endDate || undefined
  );

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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
          <p className="text-sm text-purple-600">
            Avg Order Value: {formatCurrency(payload[0].value)}
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
          Average Order Value Trend
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

      {!isLoading && !error && aovTrend && aovTrend.length === 0 && (
        <div className="flex items-center justify-center h-64 sm:h-80">
          <div className="text-sm sm:text-base text-gray-500">No order data available</div>
        </div>
      )}

      {!isLoading && !error && aovTrend && aovTrend.length > 0 && (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[300px]">
            <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
              <LineChart
                data={aovTrend}
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
                <YAxis tickFormatter={(value) => `${value.toFixed(0)}`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#9333ea"
                  strokeWidth={2}
                  name="Avg Order Value"
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
