import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { buildAdminChatContext } from '@/lib/admin-chat-context'

export const runtime = 'nodejs'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessage[]
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const ADMIN_SYSTEM_BASE = `You are a PMU admin assistant helping with registration management, enrollment statistics, and user management.
Be concise and data-driven.

Answer using ONLY the JSON context below as ground truth. Cite specific numbers from the context. If the user asks you to delete users, change the database, or perform actions you cannot do, tell them to use the admin portal UI.

Important: Do not use markdown formatting like **bold**, bullet points with -, or numbered lists. Write in plain conversational paragraphs instead.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access only' }, { status: 403 })
    }

    const body = (await request.json()) as ChatRequestBody
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    const context = buildAdminChatContext()
    const systemContent = `${ADMIN_SYSTEM_BASE}

Admin data context (JSON):
${context}`

    const client = new OpenAI({ apiKey })
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      temperature: 0.35,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (e) {
          console.error('Admin chat stream error:', e)
          controller.enqueue(encoder.encode('\n\nUnable to complete the response. Please try again.'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Admin chat API error:', error)
    return NextResponse.json(
      { error: 'Unable to reach AI service, please try again' },
      { status: 502 }
    )
  }
}
