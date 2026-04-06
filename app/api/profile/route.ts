import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getUserById, getUsersFromFile, saveUsers, sanitizeUser, User } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

export interface StudentProfile extends Omit<User, 'password'> {
  name: string
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from token
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch full user data from storage
    const user = await getUserById(authUser.id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create profile object with computed fields
    const profile: StudentProfile = {
      ...sanitizeUser(user),
      name: `${user.firstName} ${user.lastName}`,
      // Set defaults for missing academic fields
      phone: user.phone || undefined,
      address: user.address || undefined,
      major: user.major || undefined,
      minor: user.minor || undefined,
      enrollmentDate: user.enrollmentDate || undefined,
      expectedGraduation: user.expectedGraduation || undefined,
      gpa: user.gpa ?? undefined,
      completedCredits: user.completedCredits ?? undefined,
      requiredCredits: user.requiredCredits ?? 120, // Default to 120 if not set
      academicStanding: user.academicStanding || 'Good Standing',
      completedCourses: user.completedCourses || [],
    }

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from token
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      address,
      major,
      minor,
      enrollmentTerm,
      expectedGraduation,
      dateOfBirth,
      nationality,
      userId,
      email,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !phone || !address || !major || !enrollmentTerm || !expectedGraduation) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Verify the userId matches the authenticated user
    if (userId && userId !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot update another user\'s profile' },
        { status: 403 }
      )
    }

    // Read users from file
    const users = await getUsersFromFile()
    const userIndex = users.findIndex((u) => u.id === authUser.id)

    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user profile
    const updatedUser: User = {
      ...users[userIndex],
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      major: major,
      minor: minor || undefined,
      enrollmentDate: enrollmentTerm,
      expectedGraduation: expectedGraduation,
      // Keep existing academic data if not provided
      gpa: users[userIndex].gpa,
      completedCredits: users[userIndex].completedCredits,
      requiredCredits: users[userIndex].requiredCredits || 120,
      academicStanding: users[userIndex].academicStanding || 'Good Standing',
      completedCourses: users[userIndex].completedCourses || [],
    }

    // Update users array
    users[userIndex] = updatedUser

    // Save to file
    try {
      const filePath = path.join(process.cwd(), 'lib', 'constants', 'users.json')
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf-8')
    } catch (fileError) {
      console.error('Error writing users file:', fileError)
      throw new Error('Failed to save profile to storage')
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: sanitizeUser(updatedUser),
    })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

