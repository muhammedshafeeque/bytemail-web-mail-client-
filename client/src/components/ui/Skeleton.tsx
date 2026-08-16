import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md bg-gray-200 dark:bg-gray-800', className)}
    />
  );
}

export function EmailListSkeleton() {
  return (
    <div className="flex flex-col px-2 py-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-0.5">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmailViewerSkeleton() {
  return (
    <div className="w-full h-full p-6 lg:p-8 space-y-6">
      <Skeleton className="h-7 w-3/4" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
