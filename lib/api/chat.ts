type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessageApi(messages: ChatMessage[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || 'Failed to get response from assistant')
  }
  return data as { message: string }
}

