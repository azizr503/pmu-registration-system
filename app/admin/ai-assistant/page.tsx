'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Msg = { role: 'user' | 'assistant'; content: string }

const CHIPS = [
  'Registration summary',
  'Low enrollment courses',
  'Inactive users',
  'Export student list',
]

export default function AdminAiAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hello — I am the PMU Admin Assistant. I can answer questions using live registration and enrollment data for the current semester.',
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
      const res = await fetch('/api/admin/chat', {
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
    <div className="page-fade-in mx-auto flex max-w-4xl flex-col gap-4" style={{ minHeight: '78vh' }}>
      <h1 className="text-xl font-semibold text-[#1a5fb4]">Admin AI Assistant</h1>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map(c => (
          <Button
            key={c}
            type="button"
            size="sm"
            className="bg-[#1a5fb4] text-xs text-white hover:bg-[#154a96]"
            onClick={() => void send(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border bg-[#0f2a52] px-4 py-3">
          <img src="/img/pmulogo.png" alt="PMU" className="h-9 w-9 rounded-full border border-white/20 object-contain" />
          <div>
            <p className="font-semibold text-white">PMU Admin AI</p>
            <p className="text-xs text-white/70">Registration analytics & reports</p>
          </div>
        </div>
        <ScrollArea
          className="flex-1 p-4"
          style={{
            maxHeight: '64vh',
            backgroundImage:
              'radial-gradient(circle at 10% 10%, rgba(26,95,180,0.08) 0, transparent 30%), radial-gradient(circle at 90% 90%, rgba(224,90,0,0.07) 0, transparent 35%)',
          }}
        >
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user' ? 'bg-[#1a5fb4] text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#1a5fb4]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#1a5fb4] [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#1a5fb4] [animation-delay:240ms]" />
                  <span className="ml-1">Thinking...</span>
                </div>
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
            placeholder="Ask about registration stats, low enrollment, inactive users…"
            className="flex-1"
          />
          <Button type="submit" className="bg-[#e05a00] text-white hover:bg-[#c94f00]" disabled={loading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
