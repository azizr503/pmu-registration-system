"use client"

import { cn } from "@/lib/utils"

interface ChatBubbleProps {
  message: string
  isUser: boolean
  timestamp?: Date
  className?: string
}

export function ChatBubble({ message, isUser, timestamp, className }: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
          "shadow-sm transition-all",
          isUser
            ? "bg-pmu-blue text-pmu-white rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        )}
      >
        <p className="break-words">{message}</p>
        {timestamp && (
          <p
            className={cn(
              "text-xs mt-1.5",
              isUser ? "text-pmu-white/70" : "text-muted-foreground"
            )}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

