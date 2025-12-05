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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : (
            <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 shrink-0">
            <div className="text-gray-400">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
