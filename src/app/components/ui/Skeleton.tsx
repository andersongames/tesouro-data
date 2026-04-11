export default function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      {/* base */}
      <div className="absolute inset-0 bg-bg-secondary" />

      {/* shimmer layer */}
      <div className="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}