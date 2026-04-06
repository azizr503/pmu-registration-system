export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  studentId: string
  createdAt: string
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

export interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  studentId: string
  createdAt: string
  role?: 'admin' | 'student'
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
  role?: 'admin' | 'student'
}

