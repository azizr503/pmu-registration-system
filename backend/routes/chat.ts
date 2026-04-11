import OpenAI from 'openai'
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDb } from '../db'
import { buildStudentChatContext, buildAdminChatContext } from '../lib/chat-context'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessage[]
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const STUDENT_SYSTEM_BASE = `You are the PMU Student Registration Assistant for Prince Mohammad Bin Fahd University.

You operate within a controlled academic domain and help students ONLY with registration-related tasks:

1. Course registration: Help students register for courses by checking:
   - Prerequisites: student must have completed required courses
   - Schedule conflicts: no overlapping class times
   - Credit limit: maximum 18 credits per semester
   - Seat availability: course must have open seats

2. Actions you can perform:
   - Register a student for a course (if all validations pass)
   - Drop a course from student's registration
   - Suggest alternative sections when conflicts exist
   - Show available courses without conflicts

3. Information you provide:
   - Current registered courses and schedule
   - GPA and academic standing
   - Prerequisites status for requested courses
   - Available sections and their timings

4. Boundaries:
   - You do NOT replace academic advisors
   - You do NOT make decisions about degree plans
   - You only handle registration-related queries
   - Respond in the same language the student uses (Arabic or English)

5. Always be concise, friendly and professional.
   Do not use markdown formatting. Write in plain conversational text.`

const ADMIN_SYSTEM_BASE = `You are a PMU admin assistant helping with registration management, enrollment statistics, and user management.
Be concise and data-driven.

Answer using ONLY the JSON context below as ground truth. Cite specific numbers from the context. If the user asks you to delete users, change the database, or perform actions you cannot do, tell them to use the admin portal UI.

Important: Do not use markdown formatting like **bold**, bullet points with -, or numbered lists. Write in plain conversational paragraphs instead.`

export const chatRouter = Router()

chatRouter.post('/chat', requireAuth, requireRole('student'), async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' })
  }

  try {
    const user = req.authUser!
    const body = req.body as ChatRequestBody
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' })
    }

    const db = getDb()
    const settings = db
      .prepare(`SELECT semester_label AS semester FROM registration_settings WHERE id = 1`)
      .get() as
      | { semester: string | null }
      | undefined
    const semester = settings?.semester || 'Spring 2026'

    const context = buildStudentChatContext(user.id, semester)
    const systemContent = `${STUDENT_SYSTEM_BASE}

Use ONLY the following JSON context as ground truth for this student. Do not invent courses, grades, seats, or registration data. Guide the student through the PMU registration portal when they need to apply register or drop actions in the system.

Student data context (JSON):
${context}`

    const client = new OpenAI({ apiKey })
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      temperature: 0.4,
      stream: true,
    })

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) res.write(text)
      }
    } catch (e) {
      console.error('Student chat stream error:', e)
      res.write('\n\nUnable to complete the response. Please try again.')
    }
    return res.end()
  } catch (error) {
    console.error('Chat API error:', error)
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Unable to reach AI service, please try again' })
    }
    return res.end()
  }
})

chatRouter.post('/admin-chat', requireAuth, requireRole('admin'), async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' })
  }

  try {
    const body = req.body as ChatRequestBody
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' })
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

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    try {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) res.write(text)
      }
    } catch (e) {
      console.error('Admin chat stream error:', e)
      res.write('\n\nUnable to complete the response. Please try again.')
    }
    return res.end()
  } catch (error) {
    console.error('Admin chat API error:', error)
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Unable to reach AI service, please try again' })
    }
    return res.end()
  }
})
