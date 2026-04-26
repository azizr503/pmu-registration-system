"use client"

import { useState, FormEvent } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function ChatInput({ onSend, disabled = false, placeholder = "Type your message...", className }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim())
      setInputValue("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        aria-label="Chat input"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!inputValue.trim() || disabled}
        className="shrink-0"
        aria-label="Send message"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}

