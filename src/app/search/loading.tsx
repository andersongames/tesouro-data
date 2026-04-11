import Skeleton from "../components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
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