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

function mockAdminReply(lastUser: string, contextJson: string): string {
  const t = lastUser.toLowerCase()
  let ctx: Record<string, unknown>
  try {
    ctx = JSON.parse(contextJson) as Record<string, unknown>
  } catch {
    ctx = {}
  }
  const counts = (ctx.counts as Record<string, number>) || {}
  const sem = (ctx.currentSemester as string) || 'Spring 2026'

  if (t.includes('how many') && t.includes('registered')) {
    return `This semester (**${sem}**), **${counts.registeredStudentsThisSemester ?? '—'}** distinct students have at least one **registered** enrollment. Total student accounts: **${counts.totalStudents ?? '—'}**.`
  }
  if (t.includes("haven't") || t.includes('not registered') || t.includes('no registration')) {
    return `Students with **no** \`registered\` enrollment for **${sem}**: **${counts.studentsNotRegisteredThisSemester ?? '—'}**.`
  }
  if (t.includes('low enrollment') || t.includes('empty')) {
    const low = ctx.lowEnrollmentSections as { code: string; enrolled_count: number; capacity: number }[] | undefined
    if (low?.length) {
      return `Low enrollment sections (<20% full) this semester include: ${low.map(x => `${x.code} (${x.enrolled_count}/${x.capacity})`).join('; ')}.`
    }
    return 'No sections are below 20% enrollment in the current data snapshot.'
  }
  if (t.includes('report') || t.includes('export') || t.includes('summary')) {
    return `**Registration summary (${sem})**\n- Registered students (distinct): ${counts.registeredStudentsThisSemester}\n- Not registered yet: ${counts.studentsNotRegisteredThisSemester}\n- Inactive accounts: ${counts.inactiveUsers}\n- Users with login today: ${counts.usersLoggedInToday}\nUse **Users** or **Export** in the admin portal for full CSV-style exports.`
  }
  if (t.includes('logged in today') || t.includes('login today')) {
    return `Users with a **last_login** date of **today**: **${counts.usersLoggedInToday ?? 0}** (based on server date).`
  }
  if (t.includes('inactive')) {
    return `There are **${counts.inactiveUsers ?? 0}** user accounts marked **inactive**.`
  }
  if (t.includes('export') && t.includes('student')) {
    return `To export a student list, open **Users → Students** and use **Export Data** on the admin dashboard (JSON export), or copy from the portal. I can summarize counts here: **${counts.totalStudents ?? '—'}** student accounts in the system.`
  }

  return `I'm the **PMU Admin Assistant**. I can answer questions about registration volume, enrollment, inactive users, and low-enrollment sections using live database context for **${sem}**. Ask about registration summary, students who haven't registered, or low enrollment courses.`
}

export async function POST(request: NextRequest) {
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
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({
        message: mockAdminReply(lastMessage.content, context),
      })
    }

    const client = new OpenAI({ apiKey })
    const system = `You are the PMU **Admin Portal** assistant. Answer using ONLY the JSON context below as ground truth. 
Be concise, professional, and cite numbers from the context. If the user asks for actions you cannot perform (delete users, change DB directly), explain they must use the admin UI.
Context:
${context}`

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.35,
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ message: mockAdminReply(lastMessage.content, context) })
    }

    return NextResponse.json({ message: text })
  } catch (error) {
    console.error('Admin chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message. Please try again.' },
      { status: 500 }
    )
  }
}
