import { Skeleton } from "@/components/ui/skeleton";

/** Generic route-level placeholder shown while a page is still loading. */
export function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-background md:flex" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r border-border bg-surface px-4 py-6 md:flex">
        <Skeleton className="mb-6 h-9 w-32 rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
        <Skeleton className="mt-6 h-11 w-full rounded-xl" />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border/70 px-4 py-3.5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-40 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </main>
      </div>
    </div>
  );
}
