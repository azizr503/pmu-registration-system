import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  studentId: string
  createdAt: string
  // Optional academic profile fields
  phone?: string
  address?: string
  major?: string
  minor?: string
  enrollmentDate?: string
  expectedGraduation?: string
  gpa?: number
  completedCredits?: number
  requiredCredits?: number
  academicStanding?: string
  completedCourses?: string[]
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  studentId: string
}

// In-memory storage for development/demo (resets on server restart)
// Note: Profile API reads from JSON file, but login uses in-memory storage
let usersStorage: User[] = [
  // Add your existing user data here if you want to preserve it
  {
    "id": "e1304350-f916-45a1-a1e2-372f8bdd9772",
    "email": "aziz.saleh@pmu.edu.sa",
    "password": "$2b$12$6YBwKVjUv7xjqLlrW36LH.fEBtAN4FQKGhDO9iE6kbW2mYDATQqti",
    "firstName": "aziz",
    "lastName": "sale",
    "studentId": "20256341",
    "createdAt": "2025-10-14T21:31:51.224Z"
  }
]

// Read users from JSON file (for API routes)
export async function getUsersFromFile(): Promise<User[]> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'data', 'users.json')
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent) as User[]
  } catch (error) {
    console.error('Error reading users file:', error)
    // Fallback to in-memory storage
    return usersStorage
  }
}

// Read users from storage
export async function getUsers(): Promise<User[]> {
  // For production, you can integrate with a database
  // For now, using in-memory storage that works on Vercel
  return usersStorage
}

// Get user by ID or email
export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsersFromFile()
  return users.find(u => u.id === id) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsersFromFile()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function getUserByStudentId(studentId: string): Promise<User | null> {
  const users = await getUsersFromFile()
  return users.find(u => u.studentId === studentId) || null
}

// Write users to storage
export async function saveUsers(users: User[]): Promise<void> {
  // For production, you can integrate with a database
  // For now, using in-memory storage that works on Vercel
  usersStorage = users
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

// Get user from request
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

// Validate PMU email
export function isValidPMUEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@pmu.edu.sa')
}

// Generate student ID
export function generateStudentId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${random}`
}

// Sanitize user data (remove password)
export function sanitizeUser(user: User): AuthUser {
  const { password, ...sanitizedUser } = user
  return sanitizedUser
}
