'use client'

type Variant = 'user' | 'assistant'

/** Plain conversational text only (no markdown). Preserves line breaks and paragraphs. */
export function ChatMessageBody({ content, variant }: { content: string; variant: Variant }) {
  if (variant === 'user') {
    return <p className="break-words whitespace-pre-wrap">{content}</p>
  }
  if (!content) return null

  return (
    <div className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
      {content}
    </div>
  )
}
