interface MetricCardProps {
  title: string;
  value: string | number;
  loading?: boolean;
  error?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({
  title,
  value,
  loading = false,
  error,
  icon,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          {loading ? (
            <div className="mt-2 h-6 sm:h-8 w-20 sm:w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : error ? (
            <p className="mt-2 text-xs sm:text-sm text-red-600">{error}</p>
          ) : (
            <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900 truncate">{value}</p>
          )}
        </div>
        {icon && (
          <div className="ml-3 sm:ml-4 shrink-0">
            <div className="text-gray-400 w-6 h-6 sm:w-8 sm:h-8">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
