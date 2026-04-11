"use client"

import ErrorState from "@/app/components/feedback/ErrorState"

export default function ErrorPage({
  reset,
}: {
  reset: () => void
}) {
  return (
    <ErrorState onRetry={reset} />
  )
}