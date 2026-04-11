import { apiUrl } from '@/lib/api-base'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/** Reads the streaming text/plain body from POST /chat. */
export async function sendChatMessageApi(messages: ChatMessage[]): Promise<{ message: string }> {
  const response = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    credentials: 'include',
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Failed to get response from assistant')
  }

  if (!response.body) {
    throw new Error('Failed to get response from assistant')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let message = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    message += decoder.decode(value, { stream: true })
  }

  return { message }
}
