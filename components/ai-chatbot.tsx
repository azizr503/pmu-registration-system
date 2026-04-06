"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChatBubble } from "@/components/ui/chat-bubble"
import { ChatHeader } from "@/components/ui/chat-header"
import { ChatInput } from "@/components/ui/chat-input"
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useRegistrationStore } from "@/lib/registration-store"
import coursesData from "@/lib/constants/courses.json"
import { sendChatMessageApi } from "@/lib/api/chat"

type ChatFlowType =
  | "NONE"
  | "PLAN_SCHEDULE"
  | "CONFIRM_REGISTRATION"
  | "DROP_COURSE"
  | "CONFIRM_DROP"

type ChatOption = {
  id: string
  label: string
  action:
    | "SEND_MESSAGE"
    | "GO_TO_COURSES"
    | "GO_TO_SCHEDULE"
    | "GO_TO_PROFILE"
    | "START_PLAN_SCHEDULE"
    | "CHOOSE_SCHEDULE_PLAN"
    | "CONFIRM_REGISTER_PLAN"
    | "CANCEL_PLAN"
    | "START_DROP_COURSE"
    | "CHOOSE_COURSE_TO_DROP"
    | "CONFIRM_DROP_COURSE"
    | "CANCEL_DROP"
    | "FAQ"
  payload?: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  options?: ChatOption[]
  meta?: {
    flow?: ChatFlowType
    planId?: string
    courseId?: string
  }
}

// Mock Data Types
interface SchedulePlan {
  id: string
  label: string
  totalCredits: number
  description: string
  courses: Array<{
    code: string
    title: string
    credits: number
    sectionId: string
    meetingTime: string
    instructor: string
  }>
}

interface DropImpactPreview {
  courseCode: string
  courseTitle: string
  credits: number
  beforeCredits: number
  afterCredits: number
  beforeProgress: number
  afterProgress: number
  affectedRequirements: string[]
}

// MessageOptions Component
interface MessageOptionsProps {
  options: ChatOption[]
  onClick: (option: ChatOption) => void
}

function MessageOptions({ options, onClick }: MessageOptionsProps) {
  if (!options || options.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onClick(option)}
          className={cn(
            "inline-flex items-center rounded-full border border-border",
            "px-3 py-1.5 text-xs sm:text-sm font-medium",
            "bg-card hover:bg-accent hover:text-accent-foreground",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
            "active:scale-95"
          )}
          type="button"
          aria-label={option.label}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Mock Helper Functions
async function fetchSchedulePlansForCurrentStudent(): Promise<SchedulePlan[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const availableCourses = coursesData.courses.slice(0, 6) // Get first 6 courses for demo

  return [
    {
      id: "plan-a",
      label: "Plan A",
      totalCredits: 12,
      description: "Balanced schedule with morning and afternoon classes",
      courses: [
        {
          code: availableCourses[0]?.code || "SOEN2351",
          title: availableCourses[0]?.title || "Data Structures and Algorithms I",
          credits: availableCourses[0]?.credits || 3,
          sectionId: availableCourses[0]?.sections[0]?.sectionId || "SOEN2351-01",
          meetingTime: `${availableCourses[0]?.sections[0]?.days || "MW"} ${availableCourses[0]?.sections[0]?.time || "10:00-11:30"}`,
          instructor: availableCourses[0]?.sections[0]?.instructor || "Dr. Ahmed Al-Mansour",
        },
        {
          code: availableCourses[1]?.code || "SOEN3351",
          title: availableCourses[1]?.title || "Algorithms",
          credits: availableCourses[1]?.credits || 3,
          sectionId: availableCourses[1]?.sections[0]?.sectionId || "SOEN3351-01",
          meetingTime: `${availableCourses[1]?.sections[0]?.days || "TR"} ${availableCourses[1]?.sections[0]?.time || "13:00-14:30"}`,
          instructor: availableCourses[1]?.sections[0]?.instructor || "Dr. Sarah Johnson",
        },
        {
          code: availableCourses[2]?.code || "SOEN3451",
          title: availableCourses[2]?.title || "Database Systems",
          credits: availableCourses[2]?.credits || 3,
          sectionId: availableCourses[2]?.sections[0]?.sectionId || "SOEN3451-01",
          meetingTime: `${availableCourses[2]?.sections[0]?.days || "MW"} ${availableCourses[2]?.sections[0]?.time || "14:00-15:30"}`,
          instructor: availableCourses[2]?.sections[0]?.instructor || "Dr. Mohammed Hassan",
        },
        {
          code: availableCourses[3]?.code || "SOEN3551",
          title: availableCourses[3]?.title || "Software Engineering I",
          credits: availableCourses[3]?.credits || 3,
          sectionId: availableCourses[3]?.sections[0]?.sectionId || "SOEN3551-01",
          meetingTime: `${availableCourses[3]?.sections[0]?.days || "TR"} ${availableCourses[3]?.sections[0]?.time || "10:00-11:30"}`,
          instructor: availableCourses[3]?.sections[0]?.instructor || "Dr. Emily Chen",
        },
      ],
    },
    {
      id: "plan-b",
      label: "Plan B",
      totalCredits: 15,
      description: "Full schedule with afternoon focus",
      courses: [
        {
          code: availableCourses[0]?.code || "SOEN2351",
          title: availableCourses[0]?.title || "Data Structures and Algorithms I",
          credits: availableCourses[0]?.credits || 3,
          sectionId: availableCourses[0]?.sections[1]?.sectionId || "SOEN2351-02",
          meetingTime: `${availableCourses[0]?.sections[1]?.days || "TR"} ${availableCourses[0]?.sections[1]?.time || "13:00-14:30"}`,
          instructor: availableCourses[0]?.sections[1]?.instructor || "Dr. Sarah Johnson",
        },
        {
          code: availableCourses[2]?.code || "SOEN3451",
          title: availableCourses[2]?.title || "Database Systems",
          credits: availableCourses[2]?.credits || 3,
          sectionId: availableCourses[2]?.sections[1]?.sectionId || "SOEN3451-02",
          meetingTime: `${availableCourses[2]?.sections[1]?.days || "TR"} ${availableCourses[2]?.sections[1]?.time || "14:00-15:30"}`,
          instructor: availableCourses[2]?.sections[1]?.instructor || "Dr. Mohammed Hassan",
        },
        {
          code: availableCourses[4]?.code || "SOEN3651",
          title: availableCourses[4]?.title || "Web Technologies",
          credits: availableCourses[4]?.credits || 3,
          sectionId: availableCourses[4]?.sections[0]?.sectionId || "SOEN3651-01",
          meetingTime: `${availableCourses[4]?.sections[0]?.days || "MW"} ${availableCourses[4]?.sections[0]?.time || "10:00-11:30"}`,
          instructor: availableCourses[4]?.sections[0]?.instructor || "Dr. Ahmed Al-Mansour",
        },
        {
          code: availableCourses[5]?.code || "SOEN3751",
          title: availableCourses[5]?.title || "Mobile Application Development",
          credits: availableCourses[5]?.credits || 3,
          sectionId: availableCourses[5]?.sections[0]?.sectionId || "SOEN3751-01",
          meetingTime: `${availableCourses[5]?.sections[0]?.days || "TR"} ${availableCourses[5]?.sections[0]?.time || "13:00-14:30"}`,
          instructor: availableCourses[5]?.sections[0]?.instructor || "Dr. Sarah Johnson",
        },
        {
          code: availableCourses[1]?.code || "SOEN3351",
          title: availableCourses[1]?.title || "Algorithms",
          credits: availableCourses[1]?.credits || 3,
          sectionId: availableCourses[1]?.sections[1]?.sectionId || "SOEN3351-02",
          meetingTime: `${availableCourses[1]?.sections[1]?.days || "MW"} ${availableCourses[1]?.sections[1]?.time || "14:00-15:30"}`,
          instructor: availableCourses[1]?.sections[1]?.instructor || "Dr. Emily Chen",
        },
      ],
    },
    {
      id: "plan-c",
      label: "Plan C",
      totalCredits: 9,
      description: "Light schedule with morning classes only",
      courses: [
        {
          code: availableCourses[0]?.code || "SOEN2351",
          title: availableCourses[0]?.title || "Data Structures and Algorithms I",
          credits: availableCourses[0]?.credits || 3,
          sectionId: availableCourses[0]?.sections[0]?.sectionId || "SOEN2351-01",
          meetingTime: `${availableCourses[0]?.sections[0]?.days || "MW"} ${availableCourses[0]?.sections[0]?.time || "10:00-11:30"}`,
          instructor: availableCourses[0]?.sections[0]?.instructor || "Dr. Ahmed Al-Mansour",
        },
        {
          code: availableCourses[2]?.code || "SOEN3451",
          title: availableCourses[2]?.title || "Database Systems",
          credits: availableCourses[2]?.credits || 3,
          sectionId: availableCourses[2]?.sections[0]?.sectionId || "SOEN3451-01",
          meetingTime: `${availableCourses[2]?.sections[0]?.days || "MW"} ${availableCourses[2]?.sections[0]?.time || "14:00-15:30"}`,
          instructor: availableCourses[2]?.sections[0]?.instructor || "Dr. Mohammed Hassan",
        },
        {
          code: availableCourses[3]?.code || "SOEN3551",
          title: availableCourses[3]?.title || "Software Engineering I",
          credits: availableCourses[3]?.credits || 3,
          sectionId: availableCourses[3]?.sections[0]?.sectionId || "SOEN3551-01",
          meetingTime: `${availableCourses[3]?.sections[0]?.days || "TR"} ${availableCourses[3]?.sections[0]?.time || "10:00-11:30"}`,
          instructor: availableCourses[3]?.sections[0]?.instructor || "Dr. Emily Chen",
        },
      ],
    },
  ]
}

async function fetchCurrentRegisteredCourses() {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const { registeredSections } = useRegistrationStore.getState()
  return registeredSections.map((section) => ({
    courseCode: section.courseCode,
    courseTitle: section.courseTitle,
    sectionId: section.sectionId,
    credits: section.credits,
    meetingTime: `${section.days} ${section.time}`,
  }))
}

async function fetchCurrentDegreeProgress() {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const { getTotalCredits } = useRegistrationStore.getState()
  const currentCredits = getTotalCredits()
  const requiredCredits = 120
  const progress = (currentCredits / requiredCredits) * 100
  return {
    currentCredits,
    requiredCredits,
    progress: Math.round(progress),
  }
}

async function fetchDropImpactPreview(courseId: string): Promise<DropImpactPreview> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const { registeredSections, getTotalCredits } = useRegistrationStore.getState()
  const course = registeredSections.find((rs) => rs.sectionId === courseId)
  
  if (!course) {
    throw new Error("Course not found")
  }

  const beforeCredits = getTotalCredits()
  const afterCredits = beforeCredits - course.credits
  const requiredCredits = 120
  const beforeProgress = Math.round((beforeCredits / requiredCredits) * 100)
  const afterProgress = Math.round((afterCredits / requiredCredits) * 100)

  return {
    courseCode: course.courseCode,
    courseTitle: course.courseTitle,
    credits: course.credits,
    beforeCredits,
    afterCredits,
    beforeProgress,
    afterProgress,
    affectedRequirements: ["Core Requirements", "Major Requirements"],
  }
}

async function registerPlan(planId: string, courses: SchedulePlan["courses"]) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const { registerSection } = useRegistrationStore.getState()
  
  const results = courses.map((course) => {
    return registerSection(course.code, course.sectionId)
  })

  const successCount = results.filter((r) => r.success).length
  return {
    success: successCount > 0,
    registered: successCount,
    total: courses.length,
    results,
  }
}

async function dropCourse(courseId: string) {
  await new Promise((resolve) => setTimeout(resolve, 800))
  const { dropSection } = useRegistrationStore.getState()
  dropSection(courseId)
  return { success: true }
}

export function AIChatbot() {
  // All hooks must be called at the top level, before any conditional returns
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [currentFlow, setCurrentFlow] = useState<ChatFlowType>("NONE")
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>()
  const [selectedCourseIdToDrop, setSelectedCourseIdToDrop] = useState<string | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your PMU Assistant. I can help you with:\n\n• Course registration and scheduling\n• Academic information and requirements\n• Profile and account questions\n• General university inquiries\n\nWhat would you like to do?",
      timestamp: new Date(),
      options: [
        {
          id: "opt-1",
          label: "Plan and register my courses",
          action: "START_PLAN_SCHEDULE",
        },
        {
          id: "opt-2",
          label: "Drop a course and see impact",
          action: "START_DROP_COURSE",
        },
        {
          id: "opt-3",
          label: "Browse available courses",
          action: "GO_TO_COURSES",
        },
        {
          id: "opt-4",
          label: "Show my schedule",
          action: "GO_TO_SCHEDULE",
        },
        {
          id: "opt-5",
          label: "View my academic progress",
          action: "GO_TO_PROFILE",
        },
        {
          id: "opt-6",
          label: "I have another question",
          action: "SEND_MESSAGE",
          payload: "I have another question",
        },
      ],
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isTyping, isOpen])

  // Conditional return AFTER all hooks have been called
  if (isLoading || !user) {
    return null
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setError(null)
    setIsTyping(true)

    try {
      // Prepare conversation history for API
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call the chat API
      const data = await sendChatMessageApi(conversationHistory)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        // Add quick actions after assistant responses (optional)
        options: getQuickActions(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
  }

  const handleOptionClick = async (option: ChatOption) => {
    switch (option.action) {
      case "SEND_MESSAGE": {
        const messageContent = option.payload || option.label
        await handleSendMessage(messageContent)
        break
      }

      case "GO_TO_COURSES": {
        const navigationMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Opening the course catalog for you...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, navigationMessage])
        setTimeout(() => {
          router.push("/courses")
        }, 500)
        break
      }

      case "GO_TO_SCHEDULE": {
        const navigationMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Opening your schedule...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, navigationMessage])
        setTimeout(() => {
          router.push("/schedule")
        }, 500)
        break
      }

      case "GO_TO_PROFILE": {
        const navigationMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Taking you to your profile page...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, navigationMessage])
        setTimeout(() => {
          router.push("/profile")
        }, 500)
        break
      }

      case "START_PLAN_SCHEDULE": {
        setCurrentFlow("PLAN_SCHEDULE")
        setIsTyping(true)

        try {
          const plans = await fetchSchedulePlansForCurrentStudent()

          const planSummary = plans
            .map(
              (plan) =>
                `**${plan.label}** (${plan.totalCredits} credits)\n${plan.description}\n\nCourses:\n${plan.courses
                  .map((c) => `• ${c.code} - ${c.title} (${c.credits} credits)\n  ${c.sectionId} | ${c.meetingTime} | ${c.instructor}`)
                  .join("\n")}`
            )
            .join("\n\n---\n\n")

          const planMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `I've prepared ${plans.length} schedule options for you:\n\n${planSummary}\n\nWhich plan would you like to choose?`,
            timestamp: new Date(),
            meta: { flow: "PLAN_SCHEDULE" },
            options: plans.map((plan) => ({
              id: `plan-${plan.id}`,
              label: `Choose ${plan.label}`,
              action: "CHOOSE_SCHEDULE_PLAN",
              payload: plan.id,
            })),
          }

          setMessages((prev) => [...prev, planMessage])
        } catch (err) {
          console.error("Error fetching plans:", err)
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: "I'm having trouble generating schedule plans right now. Please try again later.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "CHOOSE_SCHEDULE_PLAN": {
        if (!option.payload) break

        const planId = option.payload
        setSelectedPlanId(planId)
        setCurrentFlow("CONFIRM_REGISTRATION")

        try {
          const plans = await fetchSchedulePlansForCurrentStudent()
          const selectedPlan = plans.find((p) => p.id === planId)

          if (!selectedPlan) {
            throw new Error("Plan not found")
          }

          const courseList = selectedPlan.courses
            .map((c) => `• ${c.code} - ${c.title} (${c.sectionId})`)
            .join("\n")

          const confirmMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `You chose **${selectedPlan.label}**. This includes:\n\n${courseList}\n\n**Total Credits:** ${selectedPlan.totalCredits}\n\nDo you want me to register these courses for you?`,
            timestamp: new Date(),
            meta: { flow: "CONFIRM_REGISTRATION", planId },
            options: [
              {
                id: "confirm-register",
                label: "Yes, register this plan",
                action: "CONFIRM_REGISTER_PLAN",
                payload: planId,
              },
              {
                id: "cancel-plan",
                label: "No, show other options",
                action: "CANCEL_PLAN",
              },
            ],
          }

          setMessages((prev) => [...prev, confirmMessage])
        } catch (err) {
          console.error("Error selecting plan:", err)
        }
        break
      }

      case "CONFIRM_REGISTER_PLAN": {
        if (!option.payload) break

        const planId = option.payload
        setIsTyping(true)

        const loadingMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Registering your courses...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, loadingMessage])

        try {
          const plans = await fetchSchedulePlansForCurrentStudent()
          const selectedPlan = plans.find((p) => p.id === planId)

          if (!selectedPlan) {
            throw new Error("Plan not found")
          }

          const result = await registerPlan(planId, selectedPlan.courses)

          const successMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Done! Successfully registered ${result.registered} out of ${result.total} courses.\n\nYour courses are now registered. Want me to open your schedule?`,
            timestamp: new Date(),
            options: [
              {
                id: "open-schedule",
                label: "Open my schedule",
                action: "GO_TO_SCHEDULE",
              },
              {
                id: "done",
                label: "No, I'm done",
                action: "SEND_MESSAGE",
                payload: "Thank you",
              },
            ],
          }

          setMessages((prev) => [...prev, successMessage])
          setCurrentFlow("NONE")
          setSelectedPlanId(undefined)
        } catch (err) {
          console.error("Error registering plan:", err)
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I encountered an error while registering your courses. Please try again or register manually.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "CANCEL_PLAN": {
        const cancelMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "No problem! Would you like to see the plans again or go back to the main menu?",
          timestamp: new Date(),
          options: [
            {
              id: "show-plans-again",
              label: "Show plans again",
              action: "START_PLAN_SCHEDULE",
            },
            {
              id: "back-to-menu",
              label: "Back to main menu",
              action: "SEND_MESSAGE",
              payload: "Back to main menu",
            },
          ],
        }
        setMessages((prev) => [...prev, cancelMessage])
        setCurrentFlow("NONE")
        setSelectedPlanId(undefined)
        break
      }

      case "START_DROP_COURSE": {
        setCurrentFlow("DROP_COURSE")
        setIsTyping(true)

        try {
          const [registeredCourses, progress] = await Promise.all([
            fetchCurrentRegisteredCourses(),
            fetchCurrentDegreeProgress(),
          ])

          if (registeredCourses.length === 0) {
            const noCoursesMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: "You don't have any registered courses to drop. Would you like to register for courses instead?",
              timestamp: new Date(),
              options: [
                {
                  id: "start-plan",
                  label: "Plan and register courses",
                  action: "START_PLAN_SCHEDULE",
                },
                {
                  id: "browse-courses",
                  label: "Browse courses",
                  action: "GO_TO_COURSES",
                },
              ],
            }
            setMessages((prev) => [...prev, noCoursesMessage])
            setCurrentFlow("NONE")
            setIsTyping(false)
            break
          }

          const courseList = registeredCourses
            .map((c) => `• ${c.courseCode} - ${c.courseTitle} (${c.sectionId}) - ${c.credits} credits`)
            .join("\n")

          const dropMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `Here are your current courses (${progress.currentCredits}/${progress.requiredCredits} credits, ${progress.progress}% complete):\n\n${courseList}\n\nTap a course to preview the impact of dropping it.`,
            timestamp: new Date(),
            meta: { flow: "DROP_COURSE" },
            options: registeredCourses.map((course) => ({
              id: `drop-${course.sectionId}`,
              label: `${course.courseCode} - ${course.sectionId}`,
              action: "CHOOSE_COURSE_TO_DROP",
              payload: course.sectionId,
            })),
          }

          setMessages((prev) => [...prev, dropMessage])
        } catch (err) {
          console.error("Error fetching courses:", err)
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: "I'm having trouble loading your courses right now. Please try again later.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "CHOOSE_COURSE_TO_DROP": {
        if (!option.payload) break

        const courseId = option.payload
        setSelectedCourseIdToDrop(courseId)
        setCurrentFlow("CONFIRM_DROP")
        setIsTyping(true)

        try {
          const [impact, progress] = await Promise.all([
            fetchDropImpactPreview(courseId),
            fetchCurrentDegreeProgress(),
          ])

          const impactMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `**Impact of dropping ${impact.courseCode} - ${impact.courseTitle}:**\n\n**Before:**\n• Credits: ${impact.beforeCredits}/${progress.requiredCredits}\n• Progress: ${impact.beforeProgress}%\n\n**After:**\n• Credits: ${impact.afterCredits}/${progress.requiredCredits}\n• Progress: ${impact.afterProgress}%\n\n**Change:** -${impact.credits} credits, -${impact.beforeProgress - impact.afterProgress}% progress\n\n**Affected Requirements:** ${impact.affectedRequirements.join(", ")}\n\nDo you want to proceed with dropping this course?`,
            timestamp: new Date(),
            meta: { flow: "CONFIRM_DROP", courseId },
            options: [
              {
                id: "confirm-drop",
                label: "Yes, drop this course",
                action: "CONFIRM_DROP_COURSE",
                payload: courseId,
              },
              {
                id: "cancel-drop",
                label: "No, choose another course",
                action: "CANCEL_DROP",
              },
            ],
          }

          setMessages((prev) => [...prev, impactMessage])
        } catch (err) {
          console.error("Error fetching drop impact:", err)
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: "I'm having trouble calculating the impact. Please try again.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "CONFIRM_DROP_COURSE": {
        if (!option.payload) break

        const courseId = option.payload
        setIsTyping(true)

        const loadingMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Dropping course...",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, loadingMessage])

        try {
          await dropCourse(courseId)

          const successMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Course dropped successfully! Want to view your updated schedule?",
            timestamp: new Date(),
            options: [
              {
                id: "show-schedule",
                label: "Show updated schedule",
                action: "GO_TO_SCHEDULE",
              },
              {
                id: "drop-another",
                label: "Drop another course",
                action: "START_DROP_COURSE",
              },
              {
                id: "back-to-menu",
                label: "Back to main menu",
                action: "SEND_MESSAGE",
                payload: "Back to main menu",
              },
            ],
          }

          setMessages((prev) => [...prev, successMessage])
          setCurrentFlow("NONE")
          setSelectedCourseIdToDrop(undefined)
        } catch (err) {
          console.error("Error dropping course:", err)
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I encountered an error while dropping the course. Please try again.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "CANCEL_DROP": {
        setSelectedCourseIdToDrop(undefined)
        setCurrentFlow("DROP_COURSE")
        
        // Re-fetch and show course list
        setIsTyping(true)
        try {
          const [registeredCourses, progress] = await Promise.all([
            fetchCurrentRegisteredCourses(),
            fetchCurrentDegreeProgress(),
          ])

          if (registeredCourses.length === 0) {
            const noCoursesMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: "You don't have any registered courses to drop.",
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, noCoursesMessage])
            setCurrentFlow("NONE")
            setIsTyping(false)
            break
          }

          const courseList = registeredCourses
            .map((c) => `• ${c.courseCode} - ${c.courseTitle} (${c.sectionId}) - ${c.credits} credits`)
            .join("\n")

          const cancelMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `No problem! Here are your courses again:\n\n${courseList}\n\nTap a course to preview the impact of dropping it.`,
            timestamp: new Date(),
            meta: { flow: "DROP_COURSE" },
            options: registeredCourses.map((course) => ({
              id: `drop-${course.sectionId}`,
              label: `${course.courseCode} - ${course.sectionId}`,
              action: "CHOOSE_COURSE_TO_DROP",
              payload: course.sectionId,
            })),
          }
          setMessages((prev) => [...prev, cancelMessage])
        } catch (err) {
          console.error("Error fetching courses:", err)
        } finally {
          setIsTyping(false)
        }
        break
      }

      case "FAQ": {
        const faqMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Here are some common questions I can help with:\n\n• How do I register for courses?\n• When is the registration deadline?\n• How do I check my GPA?\n• How do I update my profile?\n\nWhat would you like to know more about?",
          timestamp: new Date(),
          options: [
            {
              id: "faq-1",
              label: "Browse courses",
              action: "GO_TO_COURSES",
            },
            {
              id: "faq-2",
              label: "Check my schedule",
              action: "GO_TO_SCHEDULE",
            },
            {
              id: "faq-3",
              label: "Ask another question",
              action: "SEND_MESSAGE",
              payload: "I have another question",
            },
          ],
        }
        setMessages((prev) => [...prev, faqMessage])
        break
      }

      default:
        console.warn("Unknown action:", option.action)
    }
  }

  // Helper function to add quick actions after assistant responses
  const getQuickActions = (): ChatOption[] => {
    return [
      {
        id: `quick-${Date.now()}-1`,
        label: "Browse courses",
        action: "GO_TO_COURSES",
      },
      {
        id: `quick-${Date.now()}-2`,
        label: "Check my schedule",
        action: "GO_TO_SCHEDULE",
      },
      {
        id: `quick-${Date.now()}-3`,
        label: "Ask another question",
        action: "SEND_MESSAGE",
        payload: "I have another question",
      },
    ]
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            "bg-pmu-blue hover:bg-pmu-blue/90 text-pmu-white",
            "h-14 w-14 sm:h-16 sm:w-16",
            "focus:ring-2 focus:ring-pmu-blue focus:ring-offset-2"
          )}
          size="icon"
          aria-label="Open chat assistant"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col",
            // Mobile: full-width bottom sheet
            "inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6",
            "w-full sm:w-[420px]",
            "h-[85vh] sm:h-[70vh] max-h-[calc(100vh-3rem)]",
            "sm:rounded-2xl sm:shadow-2xl",
            "bg-card border border-border",
            "animate-in slide-in-from-bottom sm:slide-in-from-right",
            "duration-300"
          )}
          ref={chatContainerRef}
        >
          <Card className="flex flex-col h-full overflow-hidden border-0 shadow-none">
            {/* Header */}
            <ChatHeader
              title="PMU Assistant"
              subtitle="Ask me about registration, schedule, and more"
              onClose={handleClose}
              className="shrink-0"
            />

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="m-4 shrink-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Messages Area */}
            <div
              className={cn(
                "flex-1 overflow-y-auto p-4 space-y-4",
                "min-h-0 bg-pmu-gray/30 dark:bg-background/50",
                "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
              )}
            >
              {messages.map((message) => (
                <div key={message.id} className={cn(
                  "space-y-1",
                  message.role === "assistant" ? "flex flex-col items-start" : "flex flex-col items-end"
                )}>
                  <ChatBubble
                    message={message.content}
                    isUser={message.role === "user"}
                    timestamp={message.timestamp}
                  />
                  {message.role === "assistant" && message.options && (
                    <div className="w-full max-w-[85%] sm:max-w-[75%]">
                      <MessageOptions
                        options={message.options}
                        onClick={handleOptionClick}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && <TypingIndicator />}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card shrink-0">
              <ChatInput
                onSend={handleSendMessage}
                disabled={isTyping}
                placeholder="Type your message..."
              />
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
