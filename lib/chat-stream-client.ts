export type ChatStreamMessage = { role: 'user' | 'assistant'; content: string }

/** Parse error body from a failed chat API response and return a user-facing message. */
export function chatApiErrorMessage(res: Response, data: { error?: string }): string {
  const err = data.error
  if (res.status === 503 && err === 'AI service not configured') return 'AI service not configured'
  if (err === 'Unable to reach AI service, please try again') return err
  return err || 'Unable to reach AI service, please try again'
}

/** Read a text/plain streaming body from the chat API. */
export async function readChatStream(
  res: Response,
  onChunk: (chunk: string) => void,
  onFirstChunk: () => void
): Promise<void> {
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sawChunk = false
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const textChunk = decoder.decode(value, { stream: true })
    if (textChunk) {
      if (!sawChunk) {
        sawChunk = true
        onFirstChunk()
      }
      onChunk(textChunk)
    }
  }
}
