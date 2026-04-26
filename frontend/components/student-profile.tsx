"use client"

import { useState, useEffect } from "react"
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen, Award, TrendingUp, Loader2, AlertCircle, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRegistrationStore } from "@/lib/registration-store"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { getProfileApi } from "@/lib/api/profile"

interface StudentProfileData {
  id: string
  email: string
  firstName: string
  lastName: string
  studentId: string
  name: string
  phone?: string
  address?: string
  major?: string
  minor?: string
  enrollmentDate?: string
  expectedGraduation?: string
  gpa?: number
  completedCredits?: number
  requiredCredits: number
  academicStanding: string
  completedCourses?: string[]
}

export function StudentProfile() {
  const { completedCourses, getTotalCredits } = useRegistrationStore()
  const { user: authUser, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<StudentProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (authLoading) return
      
      if (!authUser) {
        setError("Please log in to view your profile")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        const data = await getProfileApi()
        setProfile(data.profile)
      } catch (err) {
        console.error('Error fetching profile:', err)
        const status = (err as Error & { status?: number }).status
        if (status === 401) {
          setError("Please log in to view your profile")
        } else if (status === 404) {
          setError("Profile not found for this account")
        } else {
          setError(err instanceof Error ? err.message : "Failed to load profile. Please try again later.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [authUser, authLoading])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-pmu-gray flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pmu-gray">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
              {error === "Profile not found for this account" && (
                <div className="mt-4">
                  <p className="mb-2">Your profile information is incomplete. Please complete your profile to continue.</p>
                  <Button asChild className="bg-pmu-blue hover:bg-pmu-blue/90 text-pmu-white">
                    <Link href="/profile/complete">
                      <Edit className="mr-2 h-4 w-4" />
                      Complete Profile
                    </Link>
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-pmu-gray">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Profile Not Found</AlertTitle>
            <AlertDescription className="mt-2">
              Profile not found for this account. Please contact support if you believe this is an error.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const currentCredits = getTotalCredits()
  const completedCredits = profile.completedCredits || 0
  const totalCredits = completedCredits + currentCredits
  const requiredCredits = profile.requiredCredits || 120
  const progressPercentage = Math.min((totalCredits / requiredCredits) * 100, 100)

  // Check if profile is incomplete
  const isProfileIncomplete = !profile.phone || !profile.address || !profile.major || !profile.gpa

  return (
    <div className="min-h-screen bg-pmu-gray">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Student Profile</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View your academic information and progress
          </p>
        </div>

        {/* Incomplete Profile Warning */}
        {isProfileIncomplete && (
          <Alert className="mb-6 bg-pmu-gold/10 border-pmu-gold/30">
            <AlertCircle className="h-4 w-4 text-pmu-gold-dark" />
            <AlertTitle className="text-pmu-gold-dark">Profile Incomplete</AlertTitle>
            <AlertDescription className="text-pmu-gold-dark mt-2">
              Some profile information is missing. Please complete your profile to access all features.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Personal Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20">
                    <User className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">Student ID: {profile.studentId}</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    {profile.academicStanding}
                  </Badge>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm text-foreground break-words">{profile.email}</p>
                    </div>
                  </div>
                  {profile.phone ? (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        <p className="text-sm text-foreground">{profile.phone}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        <p className="text-sm text-muted-foreground italic">Not provided</p>
                      </div>
                    </div>
                  )}
                  {profile.address ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Address</p>
                        <p className="text-sm text-foreground">{profile.address}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Address</p>
                        <p className="text-sm text-muted-foreground italic">Not provided</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Academic Info Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Major</p>
                  <p className="text-sm font-medium text-foreground">
                    {profile.major || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                </div>
                {profile.minor && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Minor</p>
                    <p className="text-sm font-medium text-foreground">{profile.minor}</p>
                  </div>
                )}
                {profile.enrollmentDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Enrollment Date</p>
                    <p className="text-sm font-medium text-foreground">{profile.enrollmentDate}</p>
                  </div>
                )}
                {profile.expectedGraduation && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected Graduation</p>
                    <p className="text-sm font-medium text-foreground">{profile.expectedGraduation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Academic Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Academic Performance Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Academic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    title="Cumulative GPA"
                    value={profile.gpa?.toFixed(2) || "N/A"}
                    subtitle={profile.gpa ? "Out of 4.00" : "Not available"}
                  />
                  <StatCard
                    title="Total Credits"
                    value={totalCredits}
                    subtitle={`Out of ${requiredCredits} required`}
                  />
                  <StatCard
                    title="Credits Remaining"
                    value={Math.max(0, requiredCredits - totalCredits)}
                    subtitle="To complete degree"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Degree Progress Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Degree Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProgressBar
                  label="Overall Progress"
                  value={totalCredits}
                  max={requiredCredits}
                  description={`${totalCredits} of ${requiredCredits} credits completed`}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-700">{completedCredits}</p>
                    <p className="text-xs text-green-600">credits</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-blue-700">{currentCredits}</p>
                    <p className="text-xs text-blue-600">credits</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed Courses Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Completed Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.completedCourses && profile.completedCourses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.completedCourses.map((courseCode) => (
                      <Badge
                        key={courseCode}
                        variant="secondary"
                        className="bg-green-100 text-green-800 border-green-200 px-3 py-1"
                      >
                        {courseCode}
                      </Badge>
                    ))}
                  </div>
                ) : completedCourses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {completedCourses.map((courseCode) => (
                      <Badge
                        key={courseCode}
                        variant="secondary"
                        className="bg-green-100 text-green-800 border-green-200 px-3 py-1"
                      >
                        {courseCode}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No completed courses yet</p>
                )}
              </CardContent>
            </Card>

            {/* Academic Timeline Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Academic Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">Fall 2023</p>
                      <p className="text-xs text-muted-foreground">Started Software Engineering Program</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">Spring 2024</p>
                      <p className="text-xs text-muted-foreground">Completed Foundation Courses</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-foreground">Fall 2024</p>
                      <p className="text-xs text-muted-foreground">Declared Data Science Minor</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Spring 2027</p>
                      <p className="text-xs text-muted-foreground">Expected Graduation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
