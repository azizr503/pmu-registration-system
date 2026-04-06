import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { buildStudentChatContext } from '@/lib/student-chat-context'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessage[]
}

function mockReply(userName: string, lastUser: string, context: string): string {
  const t = lastUser.toLowerCase()
  if (t.includes('conflict')) {
    return `Hi ${userName}, I checked your ${context.includes('Spring') ? 'Spring 2026' : 'current'} schedule in the system. If two courses share overlapping days and times, they appear as conflicts on the Schedule page. Open **My Schedule** to see conflict pairs marked in red.`
  }
  if (t.includes('prerequisite') || t.includes('prereq')) {
    return `Prerequisites are stored per course in the catalog. Your completed courses (final grades) are: ${context.slice(0, 400)}… If a required prerequisite course isn’t in your completed list with a passing grade, registration will block that course with an orange prerequisite warning.`
  }
  if (t.includes('register') || t.includes('operating')) {
    return `To add courses, go to **Register Classes**, pick your semester, search for the course (e.g. CS301 Operating Systems), and click **Add**. I’ll validate time conflicts, prerequisites, and the 18-credit limit before it lands in your cart.`
  }
  if (t.includes('sections') || t.includes('no time')) {
    return `Use **Register Classes** and try the **Courses without conflict** suggestion (or filter the list). I can only register sections that don’t overlap your cart or current schedule for the same semester.`
  }
  return `Hi ${userName}! I’m the PMU registration assistant. I can explain registration rules, conflicts, prerequisites, and how to use your cart. Your live context (courses, grades) is loaded in this session.`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Student access only' }, { status: 403 })
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

    const db = getDb()
    const settings = db.prepare(`SELECT semester FROM registration_settings WHERE id = 1`).get() as
      | { semester: string | null }
      | undefined
    const semester = settings?.semester || 'Spring 2026'

    const context = buildStudentChatContext(user.id, semester)
    const name = user.firstName

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({
        message: mockReply(name, lastMessage.content, context),
      })
    }

    const client = new OpenAI({ apiKey })
    const system = `You are the PMU Student Registration Assistant. Help with registration, conflicts, prerequisites, and schedule planning.
Use ONLY the following JSON context as ground truth for this student (do not invent data). If an action is requested (register/drop), explain the exact UI steps; you cannot call APIs directly unless the user uses the portal buttons.
${context}`

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ message: mockReply(name, lastMessage.content, context) })
    }

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message. Please try again.' },
      { status: 500 }
    )
  }
}
