'use client'
interface ProgressProps {
  current: number
  total: number
}
export default function Progress({ current, total }: ProgressProps) {
  const percent = ((current + 1) / total) * 100
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
      <div
        className="h-2 bg-orange-500 rounded-full transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
