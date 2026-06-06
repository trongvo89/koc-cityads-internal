export default function ScriptDetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-zinc-100 rounded" />
        <div className="h-6 bg-zinc-200 rounded w-48" />
        <div className="h-5 bg-zinc-100 rounded w-16" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 bg-zinc-100 rounded w-24" />
              <div className="h-9 bg-zinc-100 rounded" />
            </div>
          ))}
          <div className="h-9 bg-zinc-200 rounded" />
        </div>
        <div className="lg:col-span-3 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-2">
              <div className="h-5 bg-zinc-100 rounded w-20" />
              <div className="h-20 bg-zinc-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
