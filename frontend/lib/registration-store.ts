"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
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

interface RegisteredSection {
  courseCode: string
  courseTitle: string
  sectionId: string
  type: string
  instructor: string
  room: string
  days: string
  time: string
  credits: number
}

interface RegistrationStore {
  registeredSections: RegisteredSection[]
  completedCourses: string[]
  registerSection: (courseCode: string, sectionId: string) => { success: boolean; message: string }
  dropSection: (sectionId: string) => void
  getTotalCredits: () => number
  isRegistered: (sectionId: string) => boolean
  hasTimeConflict: (days: string, time: string) => boolean
  markCourseComplete: (courseCode: string) => void
}

export const useRegistrationStore = create<RegistrationStore>()(
  persist(
    (set, get) => ({
      registeredSections: [],
      completedCourses: ["MATH1101", "ENG1101"], // Default completed courses for demo

      registerSection: (courseCode: string, sectionId: string) => {
        const course = coursesData.courses.find((c) => c.code === courseCode)
        if (!course) {
          return { success: false, message: "Course not found" }
        }

        const section = course.sections.find((s) => s.sectionId === sectionId)
        if (!section) {
          return { success: false, message: "Section not found" }
        }

        const state = get()

        // Check if already registered
        if (state.isRegistered(sectionId)) {
          return { success: false, message: "You are already registered in this section" }
        }

        // Check prerequisites
        const missingPrereqs = course.prereq.filter((prereq) => !state.completedCourses.includes(prereq))
        if (missingPrereqs.length > 0) {
          return {
            success: false,
            message: `Missing prerequisites: ${missingPrereqs.join(", ")}. Please complete these courses first.`,
          }
        }

        // Check if already registered in another section of the same course
        const alreadyRegisteredInCourse = state.registeredSections.some((rs) => rs.courseCode === courseCode)
        if (alreadyRegisteredInCourse) {
          return {
            success: false,
            message: `You are already registered in another section of ${courseCode}`,
          }
        }

        // Check for lab requirements
        if (section.type === "lab") {
          const hasLectureSection = state.registeredSections.some(
            (rs) => rs.courseCode === courseCode && rs.type === "lecture",
          )
          if (!hasLectureSection) {
            return {
              success: false,
              message: "You must register for a lecture section before registering for a lab",
            }
          }
        }

        // Check time conflicts
        if (state.hasTimeConflict(section.days, section.time)) {
          return {
            success: false,
            message: "This section conflicts with your current schedule",
          }
        }

        // Check credit limit (max 18 credits)
        const newTotalCredits = state.getTotalCredits() + course.credits
        if (newTotalCredits > 18) {
          return {
            success: false,
            message: `Registering for this course would exceed the 18 credit limit (current: ${state.getTotalCredits()}, new: ${newTotalCredits})`,
          }
        }

        // Register the section
        const registeredSection: RegisteredSection = {
          courseCode: course.code,
          courseTitle: course.title,
          sectionId: section.sectionId,
          type: section.type,
          instructor: section.instructor,
          room: section.room,
          days: section.days,
          time: section.time,
          credits: course.credits,
        }

        set((state) => ({
          registeredSections: [...state.registeredSections, registeredSection],
        }))

        return { success: true, message: `Successfully registered for ${courseCode} - ${section.sectionId}` }
      },

      dropSection: (sectionId: string) => {
        set((state) => ({
          registeredSections: state.registeredSections.filter((rs) => rs.sectionId !== sectionId),
        }))
      },

      getTotalCredits: () => {
        const state = get()
        // Count credits only once per course (not per section)
        const uniqueCourses = new Map<string, number>()
        state.registeredSections.forEach((section) => {
          if (!uniqueCourses.has(section.courseCode)) {
            uniqueCourses.set(section.courseCode, section.credits)
          }
        })
        return Array.from(uniqueCourses.values()).reduce((sum, credits) => sum + credits, 0)
      },

      isRegistered: (sectionId: string) => {
        return get().registeredSections.some((rs) => rs.sectionId === sectionId)
      },

      hasTimeConflict: (days: string, time: string) => {
        const state = get()
        const [startTime, endTime] = time.split("-")

        return state.registeredSections.some((section) => {
          // Check if days overlap
          const daysOverlap = days.split("").some((day) => section.days.includes(day))
          if (!daysOverlap) return false

          // Check if times overlap
          const [sectionStart, sectionEnd] = section.time.split("-")
          return timeOverlaps(startTime, endTime, sectionStart, sectionEnd)
        })
      },

      markCourseComplete: (courseCode: string) => {
        set((state) => ({
          completedCourses: [...state.completedCourses, courseCode],
        }))
      },
    }),
    {
      name: "pmu-registration-storage",
    },
  ),
)

// Helper function to check if two time ranges overlap
function timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const s1 = toMinutes(start1)
  const e1 = toMinutes(end1)
  const s2 = toMinutes(start2)
  const e2 = toMinutes(end2)

  return s1 < e2 && s2 < e1
}
