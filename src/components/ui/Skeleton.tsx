export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-800 rounded-lg ${className}`}
      aria-label="Loading..."
    />
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Work Comparison Skeleton */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-6 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>

      {/* P4P Scores Skeleton */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <Skeleton className="h-4 w-20 mb-2 mx-auto" />
            <Skeleton className="h-8 w-16 mx-auto" />
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <Skeleton className="h-4 w-20 mb-2 mx-auto" />
            <Skeleton className="h-8 w-16 mx-auto" />
          </div>
        </div>
      </div>

      {/* Equivalent Load Skeleton */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Advantage Skeleton */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-12 w-32 mx-auto" />
      </div>
    </div>
  );
}

export function StickFigureSkeleton() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg shadow-sm border border-slate-700 p-4">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  );
}
