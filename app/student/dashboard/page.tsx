'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getStudentOverview } from '@/lib/api/student'
import { Loader2 } from 'lucide-react'

export default function StudentDashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentOverview>> | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStudentOverview()
      .then(setData)
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a5fb4]" />
      </div>
    )
  }

  if (err || !data) {
    return <p className="text-destructive">{err || 'Unable to load dashboard.'}</p>
  }

  const sem = data.registration.semester

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e05a00]/40 bg-[#e05a00]/10 px-4 py-3 text-[#b34700] dark:text-[#ffb366]">
        <p className="font-semibold">
          Hello, {data.student.name} — {sem} Registration is {data.registration.isOpen ? 'OPEN' : 'CLOSED'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Credits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{data.student.registeredCredits}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPA</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{data.student.gpa.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Hours</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{data.student.creditsCompleted}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Hours</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#1a5fb4]">{data.student.remainingHours}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            ) : (
              data.announcements.map(a => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <p className="font-medium text-[#1a5fb4]">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="bg-[#1a5fb4] hover:bg-[#154a96]">
              <Link href="/student/register">Register Now</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/student/schedule">View Schedule</Link>
            </Button>
            <Button asChild variant="outline" className="border-[#e05a00] text-[#e05a00] hover:bg-[#e05a00]/10">
              <Link href="/student/chatbot">AI Assistant</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
