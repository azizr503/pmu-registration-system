"use client"

import { useMemo } from "react"
import { Calendar, Clock, User, MapPin, Trash2, BookOpen, GraduationCap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRegistrationStore } from "@/lib/registration-store"
import { DAYS, DAY_CODES, TIME_SLOTS } from "@/lib/constants/schedule"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function MySchedule() {
  const { registeredSections, dropSection, getTotalCredits } = useRegistrationStore()
  const { toast } = useToast()

  const handleDrop = (sectionId: string, courseTitle: string) => {
    dropSection(sectionId)
    toast({
      title: "Course Dropped",
      description: `Successfully dropped ${courseTitle}`,
    })
  }

  // Group sections by course
  const courseGroups = useMemo(() => {
    const groups = new Map<string, typeof registeredSections>()
    registeredSections.forEach((section) => {
      const existing = groups.get(section.courseCode) || []
      groups.set(section.courseCode, [...existing, section])
    })
    return groups
  }, [registeredSections])

  // Create timetable data
  const timetableData = useMemo(() => {
    const data: Record<string, Array<{ section: (typeof registeredSections)[0]; rowSpan: number }>> = {}

    registeredSections.forEach((section) => {
      const days = section.days.split("")
      const [startTime] = section.time.split("-")

      days.forEach((dayCode) => {
        const dayName = DAY_CODES[dayCode]
        if (dayName) {
          const key = `${dayName}-${startTime}`
          if (!data[key]) {
            data[key] = []
          }
          // Calculate row span based on duration
          const [start, end] = section.time.split("-")
          const startMinutes = timeToMinutes(start)
          const endMinutes = timeToMinutes(end)
          const durationHours = (endMinutes - startMinutes) / 60
          const rowSpan = Math.ceil(durationHours)

          data[key].push({ section, rowSpan })
        }
      })
    })

    return data
  }, [registeredSections])

  const totalCredits = getTotalCredits()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <GraduationCap className="h-4 w-4 mr-2" />
              {totalCredits} Credits
            </Badge>
          </div>
          <p className="text-muted-foreground">View and manage your registered courses</p>
        </div>

        {registeredSections.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Courses Registered</h3>
              <p className="text-muted-foreground mb-6">
                You haven't registered for any courses yet. Visit the Course Catalog to get started.
              </p>
              <Button asChild>
                <a href="/courses">Browse Courses</a>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Weekly Timetable */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Timetable
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-border bg-muted p-3 text-left text-sm font-semibold w-24">Time</th>
                      {DAYS.map((day) => (
                        <th key={day} className="border border-border bg-muted p-3 text-center text-sm font-semibold">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((time) => (
                      <tr key={time}>
                        <td className="border border-border p-3 text-sm font-medium text-muted-foreground bg-muted/50">
                          {time}
                        </td>
                        {DAYS.map((day) => {
                          const key = `${day}-${time}`
                          const cells = timetableData[key]

                          if (!cells || cells.length === 0) {
                            return <td key={day} className="border border-border p-2 bg-background"></td>
                          }

                          return (
                            <td key={day} className="border border-border p-0 bg-background">
                              {cells.map((cell, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 h-full ${
                                    cell.section.type === "lab"
                                      ? "bg-blue-100 border-l-4 border-blue-500"
                                      : "bg-green-100 border-l-4 border-green-500"
                                  }`}
                                >
                                  <div className="text-xs font-semibold text-foreground">{cell.section.courseCode}</div>
                                  <div className="text-xs text-muted-foreground">{cell.section.sectionId}</div>
                                  <div className="text-xs text-muted-foreground">{cell.section.room}</div>
                                </div>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Registered Courses List */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Registered Courses
              </h2>
              <div className="space-y-4">
                {Array.from(courseGroups.entries()).map(([courseCode, sections]) => {
                  const mainSection = sections[0]
                  return (
                    <Card key={courseCode} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{courseCode}</h3>
                            <Badge variant="secondary">{mainSection.credits} Credits</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{mainSection.courseTitle}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {sections.map((section) => (
                          <div
                            key={section.sectionId}
                            className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                          >
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <div className="text-sm font-medium text-foreground">{section.sectionId}</div>
                                <Badge variant="outline" className="mt-1">
                                  {section.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                {section.instructor}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {section.days} {section.time}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                {section.room}
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-4 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Drop Course Section?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to drop {section.sectionId}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDrop(section.sectionId, section.courseTitle)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Drop Section
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}
