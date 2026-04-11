export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6 animate-pulse">
        {/* Title */}
        <div className="h-6 w-1/2 rounded bg-bg-secondary/70" />

        {/* Card */}
        <div className="bg-bg-secondary border border-border rounded-xl p-6 space-y-4">
          <div className="h-10 rounded bg-bg-primary/70" />
          <div className="h-10 rounded bg-bg-primary/70" />
          <div className="h-10 rounded bg-bg-primary/70" />
        </div>
      </div>
    </main>
  )
}