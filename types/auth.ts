export type UserRole = 'student' | 'faculty' | 'admin'
export type UserStatus = 'active' | 'inactive'

/** Database row shape (password_hash never sent to client) */
export interface DbUser {
  id: string
  email: string
  password_hash: string
  role: UserRole
  status: UserStatus
  created_at: string
  last_login: string | null
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: UserStatus
  studentId?: string
  facultyId?: string
  /** Students only: false until profile setup is saved */
  profileCompleted: boolean
}
