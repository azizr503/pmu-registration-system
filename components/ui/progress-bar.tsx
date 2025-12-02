"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  label: string
  value: number
  max: number
  showPercentage?: boolean
  description?: string
  className?: string
}

export function ProgressBar({
  label,
  value,
  max,
  showPercentage = true,
  description,
  className
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {showPercentage && (
          <span className="text-sm font-medium text-foreground">{percentage}%</span>
        )}
      </div>
      <Progress value={percentage} className="h-3" />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

