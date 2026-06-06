export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-zinc-200 rounded w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-24" />
            <div className="h-8 bg-zinc-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
