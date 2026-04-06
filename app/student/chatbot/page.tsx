'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Msg = { role: 'user' | 'assistant'; content: string }

const CHIPS = [
  'Register me for Operating Systems',
  'Do I have any conflicts?',
  'What courses can I take this semester?',
  'Check my prerequisites for CS401',
  'Show me sections with no time conflicts',
]

export default function StudentChatbotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am the PMU Registration Assistant. I can help using your real registration and grade data when available.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const t = text.trim()
    if (!t) return
    setInput('')
    const userMsg: Msg = { role: 'user', content: t }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Chat failed')
      }
      setMessages(m => [...m, { role: 'assistant', content: (data as { message: string }).message }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" style={{ minHeight: '70vh' }}>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map(c => (
          <Button
            key={c}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => void send(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <img src="/img/pmulogo.png" alt="PMU" className="h-10 w-10 rounded-full object-contain" />
          <div>
            <p className="font-semibold text-[#1a5fb4]">PMU AI Assistant</p>
            <p className="text-xs text-muted-foreground">Registration & academic help</p>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4" style={{ maxHeight: '55vh' }}>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-[#1a5fb4] text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={e => {
            e.preventDefault()
            void send(input)
          }}
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about registration, conflicts, prerequisites…"
            className="flex-1"
          />
          <Button type="submit" className="bg-[#1a5fb4]" disabled={loading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
