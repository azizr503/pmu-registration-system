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

type DeleteCandidate = {
  id: string
  role: 'student' | 'faculty' | 'admin'
  name: string
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const IMPORT_VALIDATION_MARKER = 'IMPORT_VALIDATION_REQUEST:'

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

const IMPORT_VALIDATION_PROMPT = `
You are a data validation assistant for PMU admin imports.
Your ONLY job is to validate the provided data rows and return
a JSON report.

You MUST respond with ONLY valid JSON in this exact format:
{
  "summary": {
    "total": number,
    "ready": number,
    "duplicates": number,
    "missing_fields": number
  },
  "issues": [
    { "row": number, "id": string, "problem": string }
  ],
  "ready_rows": [array of valid rows only]
}

Rules:
- Check if id exists in existingIds array -> mark as duplicate
- Check if email exists in existingEmails array -> mark as duplicate
- Check for missing required fields
- Return ONLY JSON, no explanation text
`

/** Role / staff words that may appear between delete and the actual search target (English). */
const DELETE_ROLE_PREFIX_EN =
  '(?:user|users|student|students|faculty|faculties|instructor|instructors|professor|professors|doctor|doctors|dr\\.?|staff|teacher|teachers|employee|employees|member|members|person|people|account|accounts|admin|admins)'

/** Role / staff words (Arabic) before the target. */
const DELETE_ROLE_PREFIX_AR =
  '(?:المستخدم|المستخدمين|الطالب|الطلبة|الطالبة|الطالبات|عضو\\s*هيئة\\s*التدريس|هيئة\\s*التدريس|المدرس|المدرسين|الدكتور|الدكتوره|الدكتورة|الأستاذ|الاستاذ|الأساتذة|الموظف|الموظفين|عضو\\s*الطاقم|الطاقم|الحساب|الحسابات)?'

function extractDeleteQuery(text: string): string | null {
  const s = text.trim()
  if (!s) return null
  if (s.includes(IMPORT_VALIDATION_MARKER)) return null

  const hasEnglishDelete = /\b(?:delete|remove|erase)\b/i.test(s)
  const hasArabicDelete = /(?:^|[\s،.!?])(?:احذف|حذف)(?:\s|$)/u.test(s)
  if (!hasEnglishDelete && !hasArabicDelete) return null

  // Do not treat unrelated "delete X" as user deletion
  if (/\b(?:delete|remove)\s+(?:the\s+)?(?:file|files|folder|folders|row|rows|record|records|import|course|courses|section|sections|class|classes|grade|grades)\b/i.test(s)) {
    return null
  }

  const norm = s.replace(/\s+/g, ' ').trim()

  // English: delete/remove + optional role phrase + remainder (e.g. "delete faculty f-101", "delete instructor")
  let m = norm.match(
    new RegExp(`\\b(?:delete|remove|erase)\\s+${DELETE_ROLE_PREFIX_EN}\\s*[\\s:\\-–—,]*\\s*(.+)$`, 'i')
  )
  if (m?.[1]?.trim()) return m[1].trim()

  // English: any "delete/remove …" tail (covers "delete f-101", "delete dr. Ahmed", etc.)
  m = norm.match(/\b(?:delete|remove|erase)\s+(.+)$/i)
  if (m?.[1]?.trim()) return m[1].trim()

  // Arabic: احذف/حذف + optional role + remainder
  m = norm.match(
    new RegExp(`(?:احذف|حذف)\\s+${DELETE_ROLE_PREFIX_AR}\\s*[\\s:\\-–—،,]*\\s*(.+)$`, 'u')
  )
  if (m?.[1]?.trim()) return m[1].trim()

  m = norm.match(/(?:احذف|حذف)\s+(.+)$/u)
  if (m?.[1]?.trim()) return m[1].trim()

  return null
}

function findDeleteCandidate(query: string): DeleteCandidate | null {
  const db = getDb()
  const raw = query.trim()
  if (!raw) return null

  const qLower = raw.toLowerCase()
  const qSafe = qLower.replace(/[%_]/g, '')
  const qLike = `%${qSafe}%`

  const row = db
    .prepare(
      `SELECT u.id, u.role, u.email,
              s.full_name AS student_name,
              s.student_id AS student_id,
              f.full_name AS faculty_name,
              f.faculty_id AS faculty_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN faculty f ON f.user_id = u.id
       WHERE lower(u.id) LIKE ?
          OR lower(u.email) LIKE ?
          OR lower(COALESCE(s.full_name, '')) LIKE ?
          OR lower(COALESCE(f.full_name, '')) LIKE ?
          OR lower(COALESCE(s.student_id, '')) LIKE ?
          OR lower(COALESCE(f.faculty_id, '')) LIKE ?
       ORDER BY
         CASE
           WHEN lower(COALESCE(s.student_id, '')) = ? THEN 0
           WHEN lower(COALESCE(f.faculty_id, '')) = ? THEN 0
           WHEN lower(u.id) = ? THEN 0
           WHEN lower(u.email) = ? THEN 0
           WHEN lower(COALESCE(s.full_name, '')) = ? THEN 0
           WHEN lower(COALESCE(f.full_name, '')) = ? THEN 0
           ELSE 1
         END,
         u.created_at DESC
       LIMIT 1`
    )
    .get(qLike, qLike, qLike, qLike, qLike, qLike, qLower, qLower, qLower, qLower, qLower, qLower) as
    | {
        id: string
        role: 'student' | 'faculty' | 'admin'
        email: string
        student_name: string | null
        student_id: string | null
        faculty_name: string | null
        faculty_id: string | null
      }
    | undefined

  if (!row) return null
  return {
    id: row.id,
    role: row.role,
    name: row.student_name || row.faculty_name || row.email,
  }
}

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

    const isImportValidationRequest = lastMessage.content.includes(IMPORT_VALIDATION_MARKER)

    const deleteQuery = extractDeleteQuery(lastMessage.content)
    if (!isImportValidationRequest && deleteQuery) {
      const candidate = findDeleteCandidate(deleteQuery)
      if (!candidate) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.end(`I could not find a matching user for "${deleteQuery}". Please provide the exact name, email, or user ID.`)
      }
      if (candidate.id === req.authUser!.id) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.end('You cannot delete your own account.')
      }
      const payload = {
        message: `Are you sure you want to delete ${candidate.name} (${candidate.id})? Type 'confirm' to proceed.`,
        action: {
          type: 'delete_user',
          description: `Delete ${candidate.name} (${candidate.id})`,
          endpoint: '/admin/ai-actions',
          payload: {
            target_user_id: candidate.id,
            target_user_name: candidate.name,
          },
        },
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res.end(JSON.stringify(payload))
    }

    const context = buildAdminChatContext()
    const systemContent = isImportValidationRequest
      ? IMPORT_VALIDATION_PROMPT
      : `${ADMIN_SYSTEM_BASE}

Admin data context (JSON):
${context}`

    const normalizedMessages = isImportValidationRequest
      ? messages.map(m =>
          m.role === 'user'
            ? {
                role: m.role as 'user' | 'assistant',
                content: m.content.replace(IMPORT_VALIDATION_MARKER, '').trim(),
              }
            : { role: m.role as 'user' | 'assistant', content: m.content }
        )
      : messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const client = new OpenAI({ apiKey, timeout: 30000, maxRetries: 1 })
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...normalizedMessages,
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
    const err = error as {
      message?: string
      status?: number
      code?: string
      type?: string
    }

    console.error('[admin-chat] OpenAI error:', {
      message: err.message,
      status: err.status,
      code: err.code,
      type: err.type,
    })

    if (!res.headersSent) {
      if (err.status === 401) {
        return res.status(502).json({ error: 'OpenAI authentication failed. Check OPENAI_API_KEY.' })
      }
      if (err.status === 404 || err.code === 'model_not_found') {
        return res.status(502).json({ error: `OpenAI model "${MODEL}" is unavailable. Use gpt-4o-mini.` })
      }
      if (err.status === 429) {
        return res.status(502).json({ error: 'OpenAI rate limit exceeded. Please retry shortly.' })
      }
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
        return res.status(502).json({ error: 'Network error reaching OpenAI from backend.' })
      }
      return res.status(502).json({ error: 'Unable to reach AI service, please try again' })
    }
    return res.end()
  }
})
