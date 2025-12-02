import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body: ChatRequest = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      )
    }

    // TODO: Replace this with actual LLM integration (OpenAI, Anthropic, etc.)
    // For now, return a mock response based on the user's message
    const userMessage = lastMessage.content.toLowerCase()
    let assistantResponse = ''

    // Simple rule-based responses (replace with LLM in production)
    if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
      assistantResponse = `Hello ${user.firstName}! I'm the PMU Assistant. I can help you with:\n\n• Course registration and scheduling\n• Academic information and requirements\n• Profile and account questions\n• General university inquiries\n\nWhat would you like to know?`
    } else if (userMessage.includes('registration') || userMessage.includes('register')) {
      assistantResponse = `I can help you with course registration! You can:\n\n• Browse available courses\n• Check course prerequisites\n• Register for specific sections\n• View your current schedule\n\nWould you like me to show you available courses or help you register for something specific?`
    } else if (userMessage.includes('schedule') || userMessage.includes('classes')) {
      assistantResponse = `To view your schedule, you can:\n\n• Go to "My Schedule" in the sidebar\n• Ask me to show your registered courses\n• Check for time conflicts\n\nWould you like me to show your current registrations?`
    } else if (userMessage.includes('profile') || userMessage.includes('account')) {
      assistantResponse = `You can manage your profile by:\n\n• Going to "My Profile" in the sidebar\n• Viewing your academic progress\n• Checking your GPA and credits\n• Updating your information\n\nIs there something specific about your profile you'd like to know?`
    } else if (userMessage.includes('gpa') || userMessage.includes('grade')) {
      assistantResponse = `To check your GPA and academic performance:\n\n• Visit your "My Profile" page\n• View your cumulative GPA\n• See your completed credits\n• Track your degree progress\n\nWould you like me to help you navigate to your profile?`
    } else if (userMessage.includes('help')) {
      assistantResponse = `I'm here to help! I can assist with:\n\n📚 **Course Registration**\n• Browse courses\n• Register for sections\n• Check prerequisites\n\n📅 **Scheduling**\n• View your schedule\n• Check for conflicts\n• Plan your semester\n\n👤 **Profile & Account**\n• View academic progress\n• Check GPA and credits\n• Account information\n\nWhat would you like help with?`
    } else {
      // Default response - in production, this would be an LLM call
      assistantResponse = `I understand you're asking about "${lastMessage.content}". I'm here to help with PMU student portal questions including:\n\n• Course registration and scheduling\n• Academic information\n• Profile and account management\n• General inquiries\n\nCould you provide more details about what you need?`
    }

    // Simulate API delay (remove in production)
    await new Promise(resolve => setTimeout(resolve, 800))

    return NextResponse.json({
      message: assistantResponse,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message. Please try again.' },
      { status: 500 }
    )
  }
}

