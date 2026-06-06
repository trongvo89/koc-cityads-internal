export default function KocsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-zinc-200 rounded w-16" />
        <div className="h-8 bg-zinc-200 rounded w-28" />
      </div>
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="h-10 bg-zinc-50 border-b border-zinc-200" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-zinc-100">
            <div className="h-8 w-8 bg-zinc-100 rounded-full" />
            <div className="h-4 bg-zinc-100 rounded flex-1 mt-2" />
            <div className="h-4 bg-zinc-100 rounded w-20 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
