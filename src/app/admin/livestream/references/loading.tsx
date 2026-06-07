export default function ReferencesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-50">
            <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
            <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
