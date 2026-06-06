export default function ProposalsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 bg-zinc-200 rounded w-32" />
          <div className="h-4 bg-zinc-100 rounded w-20" />
        </div>
        <div className="h-8 bg-zinc-200 rounded w-32" />
      </div>
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="h-10 bg-zinc-50 border-b border-zinc-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-zinc-100">
            <div className="h-4 bg-zinc-100 rounded flex-1" />
            <div className="h-4 bg-zinc-100 rounded w-28" />
            <div className="h-4 bg-zinc-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
