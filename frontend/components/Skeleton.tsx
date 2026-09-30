export function HeroSkeleton() {
  return (
    <div className="relative h-[85vh] lg:h-[80vh] w-full bg-background overflow-hidden">
      <div className="absolute inset-0 animate-pulse bg-surface/50" />
      <div className="relative z-10 flex h-full flex-col justify-end md:justify-center px-6 md:px-12 max-w-7xl mx-auto pb-24 md:pb-0 gap-6">
        <div className="h-6 w-32 bg-white/5 rounded-full animate-pulse" />
        <div className="h-16 md:h-20 w-3/4 bg-white/10 rounded-2xl animate-pulse" />
        <div className="h-5 w-1/3 bg-white/5 rounded animate-pulse" />
        <div className="space-y-3 mt-4">
          <div className="h-4 w-full max-w-2xl bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-5/6 max-w-xl bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-4/6 max-w-lg bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 mt-6">
          <div className="h-12 w-40 bg-white/10 rounded-full animate-pulse" />
          <div className="h-12 w-32 bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton({ label }: { label?: string }) {
  return (
    <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
      {label && <div className="h-7 w-48 bg-white/10 rounded-md mb-5 animate-pulse" />}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[160px] md:w-[220px] aspect-[2/3] rounded-xl bg-surface border border-white/5 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
