"use client"

import { X, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
  title: string
  subtitle?: string
  onClose: () => void
  onMinimize?: () => void
  className?: string
}

export function ChatHeader({ title, subtitle, onClose, onMinimize, className }: ChatHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b border-border bg-card",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2">
        {onMinimize && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Minimize chat"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

