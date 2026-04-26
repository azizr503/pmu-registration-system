import path from 'path'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { getDb } from './db'
import { authRouter } from './routes/auth'
import { studentRouter } from './routes/students'
import { facultyRouter } from './routes/faculty'
import { adminRouter } from './routes/admin'
import { coursesRouter } from './routes/courses'
import { profileRouter } from './routes/profile'
import { settingsRouter } from './routes/settings'
import { chatRouter } from './routes/chat'

const backendRoot = path.resolve(process.cwd())
const workspaceRoot = path.resolve(
  process.cwd(),
  process.cwd().endsWith('backend') ? '..' : '.'
)

// Load env files deterministically for both run modes:
// - npm --prefix backend run dev (cwd can be workspace root)
// - running from backend directory directly
dotenv.config({ path: path.join(workspaceRoot, '.env.local'), override: true })
dotenv.config({ path: path.join(workspaceRoot, '.env'), override: true })
dotenv.config({ path: path.join(backendRoot, '.env.local'), override: true })
dotenv.config({ path: path.join(backendRoot, '.env'), override: true })
dotenv.config({ override: true })

getDb()

const app = express()

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 5001)

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001']
const corsOriginOption =
  process.env.CLIENT_ORIGIN ||
  process.env.CORS_ORIGINS ||
  process.env.NEXT_PUBLIC_APP_URL ||
  DEFAULT_DEV_ORIGINS

const corsOrigins: string[] =
  typeof corsOriginOption === 'string'
    ? corsOriginOption.split(',').map(s => s.trim()).filter(Boolean)
    : corsOriginOption

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.use('/auth', authRouter)
app.use('/student', studentRouter)
app.use('/faculty', facultyRouter)
app.use('/admin', adminRouter)
app.use('/courses', coursesRouter)
app.use('/profile', profileRouter)
app.use(chatRouter)
app.use(settingsRouter)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on http://0.0.0.0:${PORT} (also http://127.0.0.1:${PORT})`)
  console.log(`CORS allowed origins: ${corsOrigins.join(', ')}`)
  console.log(`SQLite: ${path.join(process.cwd(), 'data', 'pmu.db')}`)
})
