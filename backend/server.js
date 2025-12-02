const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const fs = require('fs/promises')
const path = require('path')

const app = express()

const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

const DATA_DIR = path.join(__dirname, '..', 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const COURSES_FILE = path.join(DATA_DIR, 'courses.json')

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

function sanitizeUser(user) {
  const { password, ...safeUser } = user
  return safeUser
}

function isValidPMUEmail(email = '') {
  return email.toLowerCase().trim().endsWith('@pmu.edu.sa')
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (fallback !== undefined) {
        await writeJson(filePath, fallback)
        return fallback
      }
      throw error
    }
    throw error
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

async function getUsers() {
  return readJson(USERS_FILE, [])
}

async function saveUsers(users) {
  return writeJson(USERS_FILE, users)
}

async function getCourses() {
  return readJson(COURSES_FILE, [])
}

function createToken(user) {
  return jwt.sign(sanitizeUser(user), JWT_SECRET, { expiresIn: '7d' })
}

function attachTokenCookie(res, token) {
  res.cookie('auth-token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

function authenticateRequest(req, res, next) {
  const bearer = req.headers.authorization
  const tokenFromHeader = bearer?.startsWith('Bearer ')
    ? bearer.slice(7)
    : null
  const token = req.cookies['auth-token'] || tokenFromHeader

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {}

    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({ error: 'Email, password, firstName, and lastName are required' })
    }

    if (!isValidPMUEmail(email)) {
      return res
        .status(400)
        .json({ error: 'Please use your official @pmu.edu.sa email address' })
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters long' })
    }

    const users = await getUsers()
    const existingUser = users.find(
      user => user.email.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = {
      id: uuid(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      studentId: generateStudentId(),
      createdAt: new Date().toISOString()
    }

    users.push(newUser)
    await saveUsers(users)

    const token = createToken(newUser)
    attachTokenCookie(res, token)

    res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(newUser)
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required' })
    }

    if (!isValidPMUEmail(email)) {
      return res
        .status(400)
        .json({ error: 'Please use your official @pmu.edu.sa email address' })
    }

    const users = await getUsers()
    const user = users.find(
      record => record.email.toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = createToken(user)
    attachTokenCookie(res, token)

    res.json({
      message: 'Login successful',
      user: sanitizeUser(user)
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/auth/logout', (req, res) => {
  res.clearCookie('auth-token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  })
  res.json({ message: 'Logged out successfully' })
})

app.get('/auth/me', authenticateRequest, (req, res) => {
  res.json({ user: req.user })
})

app.get('/courses', async (req, res) => {
  try {
    const courses = await getCourses()
    res.json({ courses })
  } catch (error) {
    console.error('Courses error:', error)
    res.status(500).json({ error: 'Unable to fetch courses' })
  }
})

app.get('/admin/users', authenticateRequest, async (req, res) => {
  try {
    const users = await getUsers()
    res.json({ users: users.map(sanitizeUser) })
  } catch (error) {
    console.error('Admin users error:', error)
    res.status(500).json({ error: 'Unable to fetch users' })
  }
})

function generateStudentId() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `${year}${random}`
}

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`)
})



