'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import MetricCard from '../../components/MetricCard';
import OrdersChart from '../../components/OrdersChart';
import TopCustomersTable from '../../components/TopCustomersTable';
import RevenueTrendChart from '../../components/RevenueTrendChart';
import CustomerTrendChart from '../../components/CustomerTrendChart';
import AverageOrderValueChart from '../../components/AverageOrderValueChart';
import OrdersByFulfillmentStatusChart from '../../components/OrdersByFulfillmentStatusChart';
import TopProductsTable from '../../components/TopProductsTable';
import SyncButton from '../../components/SyncButton';
import { useAuth } from '../../contexts/AuthContext';
import { useMetrics } from '../../hooks/useMetrics';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { metrics, isLoading, error, refresh } = useMetrics();

  // Handle sync completion - refresh all data
  const handleSyncComplete = () => {
    refresh();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format number with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex">
                <div className="flex shrink-0 items-center">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    Shopify Insights
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline truncate max-w-[150px] md:max-w-none">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="rounded-md bg-white px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Dashboard Overview
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Key metrics for your Shopify store
              </p>
            </div>
            <SyncButton onSyncComplete={handleSyncComplete} />
          </div>

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
            <MetricCard
              title="Total Customers"
              value={metrics ? formatNumber(metrics.totalCustomers) : '0'}
              loading={isLoading}
              error={error}
              icon={
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            />

            <MetricCard
              title="Total Orders"
              value={metrics ? formatNumber(metrics.totalOrders) : '0'}
              loading={isLoading}
              error={error}
              icon={
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              }
            />

            <MetricCard
              title="Total Revenue"
              value={metrics ? formatCurrency(metrics.totalRevenue) : '$0.00'}
              loading={isLoading}
              error={error}
              icon={
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* Orders by Date Chart */}
          <OrdersChart />

          {/* Trend Charts Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mt-6 sm:mt-8">
            <RevenueTrendChart />
            <CustomerTrendChart />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mt-6 sm:mt-8">
            <AverageOrderValueChart />
            <OrdersByFulfillmentStatusChart />
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mt-6 sm:mt-8">
            <TopCustomersTable />
            <TopProductsTable />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
