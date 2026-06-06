export default function LivestreamLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-zinc-200 rounded w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-20" />
            <div className="h-8 bg-zinc-200 rounded w-12" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 rounded" />
        ))}
      </div>
    </div>
  );
}
