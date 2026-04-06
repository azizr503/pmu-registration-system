"use client"

import { useState, useMemo } from "react"
import { Search, Filter, BookOpen, Clock, User, MapPin, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRegistrationStore } from "@/lib/registration-store"
import coursesData from "@/lib/constants/courses.json"

interface Section {
  sectionId: string
  type: string
  instructor: string
  room: string
  days: string
  time: string
}

interface Course {
  code: string
  title: string
  credits: number
  hasLab: boolean
  prereq: string[]
  sections: Section[]
}

export function CourseCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const { toast } = useToast()
  const { registerSection, isRegistered } = useRegistrationStore()

  const courses: Course[] = coursesData.courses

  const departments = useMemo(() => {
    const depts = new Set(courses.map((course) => course.code.match(/^[A-Z]+/)?.[0] || ""))
    return ["all", ...Array.from(depts)]
  }, [courses])

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDepartment = selectedDepartment === "all" || course.code.startsWith(selectedDepartment)
      return matchesSearch && matchesDepartment
    })
  }, [courses, searchQuery, selectedDepartment])

  const toggleCourse = (courseCode: string) => {
    setExpandedCourse(expandedCourse === courseCode ? null : courseCode)
  }

  const handleRegister = (courseCode: string, sectionId: string) => {
    const result = registerSection(courseCode, sectionId)
    toast({
      title: result.success ? "Success" : "Registration Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Course Catalog</h1>
          <p className="text-muted-foreground">Browse and search available courses for registration</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by course code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedDepartment === "all" ? "default" : "outline"}
              onClick={() => setSelectedDepartment("all")}
              size="sm"
            >
              All
            </Button>
            {departments.slice(1).map((dept) => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? "default" : "outline"}
                onClick={() => setSelectedDepartment(dept)}
                size="sm"
              >
                {dept}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
        </div>

        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const isExpanded = expandedCourse === course.code
            const lectureSections = course.sections.filter((s) => s.type === "lecture")
            const labSections = course.sections.filter((s) => s.type === "lab")

            return (
              <Card key={course.code} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{course.code}</h3>
                        <Badge variant="secondary">{course.credits} Credits</Badge>
                        {course.hasLab && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Has Lab
                          </Badge>
                        )}
                      </div>
                      <p className="text-base text-foreground mb-2">{course.title}</p>
                      {course.prereq.length > 0 && (
                        <p className="text-sm text-muted-foreground">Prerequisites: {course.prereq.join(", ")}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleCourse(course.code)} className="ml-4">
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Sections
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          View Sections ({course.sections.length})
                        </>
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 space-y-6">
                      {lectureSections.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Lecture Sections
                          </h4>
                          <div className="grid gap-3">
                            {lectureSections.map((section) => {
                              const registered = isRegistered(section.sectionId)
                              return (
                                <div
                                  key={section.sectionId}
                                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                      <div className="font-medium text-foreground flex items-center gap-2">
                                        {section.sectionId}
                                        {registered && (
                                          <Badge variant="default" className="bg-green-600">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Registered
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <User className="h-3.5 w-3.5" />
                                          {section.instructor}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5" />
                                          {section.days} {section.time}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3.5 w-3.5" />
                                          {section.room}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="ml-4"
                                      onClick={() => handleRegister(course.code, section.sectionId)}
                                      disabled={registered}
                                    >
                                      {registered ? "Registered" : "Register"}
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {labSections.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Lab Sections
                          </h4>
                          <div className="grid gap-3">
                            {labSections.map((section) => {
                              const registered = isRegistered(section.sectionId)
                              return (
                                <div
                                  key={section.sectionId}
                                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors bg-blue-50/50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                      <div className="font-medium text-foreground flex items-center gap-2">
                                        {section.sectionId}
                                        {registered && (
                                          <Badge variant="default" className="bg-green-600">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Registered
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <User className="h-3.5 w-3.5" />
                                          {section.instructor}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5" />
                                          {section.days} {section.time}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3.5 w-3.5" />
                                          {section.room}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="ml-4"
                                      onClick={() => handleRegister(course.code, section.sectionId)}
                                      disabled={registered}
                                    >
                                      {registered ? "Registered" : "Register"}
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
