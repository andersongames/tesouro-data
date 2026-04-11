import Skeleton from "@/app/components/ui/Skeleton";

/**
 * Loading skeleton for /search page
 *
 * Matches layout spacing (navbar + content)
 */
export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="max-w-xl space-y-6">
        {/* Title */}
        <Skeleton className="h-6 w-1/2" />

        {/* Card */}
        <div className="bg-bg-secondary border border-border rounded-xl p-6 space-y-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </main>
  )
}