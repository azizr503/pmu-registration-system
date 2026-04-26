'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { PmuLogo } from '@/components/pmu-logo'
import { chatApiErrorMessage } from '@/lib/chat-stream-client'
import { ChatMessageBody } from '@/components/chat-message-body'
import { apiUrl } from '@/lib/api-base'

type ActionBlock = {
  type: string
  description: string
  endpoint: '/admin/ai-actions' | '/admin/import/execute'
  payload: Record<string, unknown>
}

type Msg = { role: 'user' | 'assistant'; content: string; action?: ActionBlock }
type ParsedActionResponse = { message: string; action?: ActionBlock }
type ValidationSummary = { total: number; ready: number; duplicates: number; missing_fields: number }
type ValidationIssue = { row: number; id: string; problem: string }
type ValidationReport = {
  summary: ValidationSummary
  issues: ValidationIssue[]
  ready_rows: Record<string, unknown>[]
}
type ImportKnownType = 'students' | 'faculty'

const CHIPS = [
  'Registration summary',
  'Low enrollment courses',
  'Inactive users',
  'Export student list',
]

export default function AdminAiAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hello — I am the PMU Admin Assistant. I can answer questions using live registration and enrollment data for the current semester.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionBlock | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [executing, setExecuting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [pendingImportRowsCount, setPendingImportRowsCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  function detectTypeFromFilename(filename: string): 'students' | 'faculty' | 'unknown' {
    const f = filename.toLowerCase()
    if (
      f.includes('faculty') ||
      f.includes('instructor') ||
      f.includes('teacher') ||
      f.includes('staff') ||
      f.includes('professor') ||
      f.includes('doctor') ||
      f.includes('مدرس') ||
      f.includes('دكتور') ||
      f.includes('استاذ') ||
      f.includes('هيئة')
    )
      return 'faculty'
    if (f.includes('student') || f.includes('طالب') || f.includes('طلاب') || f.includes('students')) return 'students'
    return 'unknown'
  }

  const chatViewportRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = chatViewportRef.current
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      })
      return
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const parseAssistantText = (text: string): ParsedActionResponse => {
    const raw = String(text || '').trim()
    if (!raw) return { message: '' }

    const maybeJson = raw.startsWith('{') || raw.includes('```json')
    if (!maybeJson) return { message: raw }

    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { message: raw }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as { message?: string; action?: ActionBlock }
      if (
        parsed &&
        typeof parsed.message === 'string' &&
        parsed.action &&
        typeof parsed.action === 'object' &&
        typeof parsed.action.description === 'string'
      ) {
        return { message: parsed.message, action: parsed.action }
      }
      return { message: raw }
    } catch {
      return { message: raw }
    }
  }

  const parseValidationReport = (text: string): ValidationReport | null => {
    const cleaned = String(text || '').trim().replace(/```json/gi, '').replace(/```/g, '')
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const parsed = JSON.parse(match[0]) as Partial<ValidationReport>
      if (!parsed.summary || !Array.isArray(parsed.issues) || !Array.isArray(parsed.ready_rows)) return null
      const summary = parsed.summary as Partial<ValidationSummary>
      if (
        typeof summary.total !== 'number' ||
        typeof summary.ready !== 'number' ||
        typeof summary.duplicates !== 'number' ||
        typeof summary.missing_fields !== 'number'
      ) {
        return null
      }
      return {
        summary: {
          total: summary.total,
          ready: summary.ready,
          duplicates: summary.duplicates,
          missing_fields: summary.missing_fields,
        },
        issues: parsed.issues as ValidationIssue[],
        ready_rows: parsed.ready_rows as Record<string, unknown>[],
      }
    } catch {
      return null
    }
  }

  const buildValidationPrompt = (
    fileType: ImportKnownType,
    rows: Record<string, unknown>[],
    existing: Record<string, unknown>
  ) => {
    return `IMPORT_VALIDATION_REQUEST:
You are validating imported ${fileType} records for PMU admin. Analyze the payload and return ONLY strict JSON (no markdown, no extra text) with this schema:
{
  "summary": {
    "total": number,
    "ready": number,
    "duplicates": number,
    "missing_fields": number
  },
  "issues": [
    { "row": number, "id": string, "problem": string }
  ],
  "ready_rows": [array]
}

Validation rules:
1) Detect duplicate IDs against existing DB data and within uploaded rows.
2) Detect duplicate emails against existing DB data and within uploaded rows.
3) Detect missing required fields.
4) Email must be valid format.
6) Include only fully valid records in ready_rows.

File type: ${fileType}
Uploaded rows JSON:
${JSON.stringify(rows)}

Existing DB snapshot JSON:
${JSON.stringify(existing)}`
  }

  const handleFileUpload = async (file: File) => {
    const ext = file.name.toLowerCase()
    if (!(ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv'))) {
      toast.error('Only .xlsx, .xls, and .csv files are supported')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large (max 5MB)')
      return
    }

    setMessages(m => [...m, { role: 'user', content: `📎 Uploaded: ${file.name}` }])
    setMessages(m => [...m, { role: 'assistant', content: 'Analyzing your file, please wait...' }])
    const runAnalyze = async (forcedType?: ImportKnownType) => {
      const fd = new FormData()
      fd.append('file', file)
      if (forcedType) fd.append('forced_type', forcedType)
      const analyzeRes = await fetch(apiUrl('/admin/import/analyze'), {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const analyzeJson = (await analyzeRes.json().catch(() => ({}))) as {
        error?: string
        type?: ImportKnownType
        rows?: Record<string, unknown>[]
        existing?: Record<string, unknown>
      }
      if (!analyzeRes.ok || !analyzeJson.type || !Array.isArray(analyzeJson.rows)) {
        throw new Error(analyzeJson.error || 'Failed to analyze file')
      }
      return analyzeJson
    }

    setUploading(true)
    setLoading(true)

    try {
      const filenameType = detectTypeFromFilename(file.name)
      if (filenameType === 'unknown') {
        const analyzed = await runAnalyze()
        setPendingImportFile(file)
        setPendingImportRowsCount(analyzed.rows?.length || 0)
        setMessages(m => [
          ...m,
          {
            role: 'assistant',
            content: `I found ${analyzed.rows?.length || 0} records in this file. Are these students or faculty members?`,
            action: {
              type: 'select_import_type',
              description: 'Choose import type',
              endpoint: '/admin/import/execute',
              payload: {},
            },
          },
        ])
        return
      }

      const analyzeJson = await runAnalyze(filenameType)
      const prompt = buildValidationPrompt(filenameType, analyzeJson.rows, analyzeJson.existing || {})
      const aiRes = await fetch(apiUrl('/admin-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      if (!aiRes.ok) {
        const data = (await aiRes.json().catch(() => ({}))) as { error?: string }
        toast.error(chatApiErrorMessage(aiRes, data))
        return
      }

      const aiText = (await aiRes.text()).trim()
      const report = parseValidationReport(aiText)
      if (!report) {
        toast.error('Validation report format was invalid')
        return
      }

      const assistantMsg = `Validation complete. ${report.summary.ready} out of ${report.summary.total} records are ready to import.`
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: assistantMsg,
          action: {
            type: 'import_valid_records',
            description: `Import ${report.summary.ready} valid ${filenameType} records`,
            endpoint: '/admin/import/execute',
            payload: {
              type: filenameType,
              data: report.ready_rows,
              report,
            },
          },
        },
      ])
    } catch {
      toast.error('Unable to analyze uploaded file')
    } finally {
      setUploading(false)
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImportTypeSelection = async (forcedType: ImportKnownType) => {
    if (!pendingImportFile) return
    setUploading(true)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingImportFile)
      fd.append('forced_type', forcedType)
      const analyzeRes = await fetch(apiUrl('/admin/import/analyze'), {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const analyzeJson = (await analyzeRes.json().catch(() => ({}))) as {
        error?: string
        rows?: Record<string, unknown>[]
        existing?: Record<string, unknown>
      }
      if (!analyzeRes.ok || !Array.isArray(analyzeJson.rows)) {
        toast.error(analyzeJson.error || 'Failed to analyze file')
        return
      }

      const prompt = buildValidationPrompt(forcedType, analyzeJson.rows, analyzeJson.existing || {})
      const aiRes = await fetch(apiUrl('/admin-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      if (!aiRes.ok) {
        const data = (await aiRes.json().catch(() => ({}))) as { error?: string }
        toast.error(chatApiErrorMessage(aiRes, data))
        return
      }
      const aiText = (await aiRes.text()).trim()
      const report = parseValidationReport(aiText)
      if (!report) {
        toast.error('Validation report format was invalid')
        return
      }
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: `Validation complete. ${report.summary.ready} out of ${report.summary.total} records are ready to import.`,
          action: {
            type: 'import_valid_records',
            description: `Import ${report.summary.ready} valid ${forcedType} records`,
            endpoint: '/admin/import/execute',
            payload: { type: forcedType, data: report.ready_rows, report },
          },
        },
      ])
      setPendingImportFile(null)
      setPendingImportRowsCount(0)
    } catch {
      toast.error('Unable to analyze uploaded file')
    } finally {
      setUploading(false)
      setLoading(false)
    }
  }

  const send = async (text: string) => {
    const t = text.trim()
    if (!t) return
    if (pendingAction && /^(confirm|تأكيد)$/i.test(t)) {
      setInput('')
      setMessages(m => [
        ...m,
        { role: 'user', content: t },
        { role: 'assistant', content: 'Please enter your admin password to authorize this action.' },
      ])
      requestConfirmAction(pendingAction)
      return
    }
    setInput('')
    const userMsg: Msg = { role: 'user', content: t }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/admin-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(chatApiErrorMessage(res, data))
        return
      }
      const text = (await res.text()).trim()
      if (!text) {
        toast.error('Invalid AI response')
        return
      }
      const parsed = parseAssistantText(text)
      setMessages(m => [...m, { role: 'assistant', content: parsed.message || text, action: parsed.action }])
    } catch {
      toast.error('Unable to reach AI service, please try again')
    } finally {
      setLoading(false)
    }
  }

  const cancelAction = () => {
    setMessages(m => [...m, { role: 'assistant', content: 'Action cancelled by admin.' }])
    setPendingAction(null)
    setAdminPassword('')
    setPasswordOpen(false)
    setPendingImportFile(null)
    setPendingImportRowsCount(0)
  }

  const requestConfirmAction = (action: ActionBlock) => {
    setPendingAction(action)
    setAdminPassword('')
    setPasswordOpen(true)
  }

  const executeAction = async () => {
    if (!pendingAction) return
    setExecuting(true)
    try {
      const isImport = pendingAction.type === 'import_valid_records'
      const r = await fetch(
        isImport ? '/__pmu_backend/admin/import/execute' : '/__pmu_backend/admin/ai-actions',
        {
          method: isImport ? 'POST' : 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isImport
              ? {
                  type: pendingAction.payload.type,
                  data: pendingAction.payload.data,
                  adminPassword,
                }
              : {
                  ...pendingAction.payload,
                  action_type: pendingAction.type,
                  admin_password: adminPassword,
                }
          ),
        }
      )
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string; temporaryPassword?: string }
      if (!r.ok) {
        if (r.status === 403) {
          setMessages(m => [...m, { role: 'assistant', content: '❌ Incorrect password. Action cancelled.' }])
          setPendingAction(null)
          setAdminPassword('')
          setPasswordOpen(false)
          return
        }
        toast.error(d.error || 'Failed to execute action')
        return
      }
      setMessages(m => [
        ...m,
        {
          role: 'assistant',
          content: isImport
            ? `✅ Successfully imported ${Number((d as { imported?: number }).imported || 0)} ${String(
                pendingAction.payload.type || 'records'
              )}. ${Number((d as { skipped?: number }).skipped || 0)} records skipped.`
            : d.message || `User has been deleted successfully`,
        },
      ])
      setPasswordOpen(false)
      setPendingAction(null)
      setAdminPassword('')
    } catch {
      toast.error('Failed to execute action')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="page-fade-in mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-[#00205B]">Admin AI Assistant</h1>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map(c => (
          <Button
            key={c}
            type="button"
            size="sm"
            className="bg-[#00205B] text-xs text-white hover:bg-[#001742]"
            onClick={() => void send(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#d7deea] bg-white shadow-[0_14px_40px_rgba(0,32,91,0.08)]">
        <div className="flex items-center gap-3 border-b border-[#d7deea] bg-[#00205B] px-4 py-3">
          <PmuLogo size="compact" />
          <div>
            <p className="font-semibold text-white">PMU Admin AI</p>
            <p className="text-xs text-[#d9e4ff]">Registration analytics & reports</p>
          </div>
        </div>
        <div
          ref={chatViewportRef}
          className="flex-1 overflow-y-auto bg-linear-to-b from-white to-[#f8faff] px-4 py-4"
        >
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message-fade-in flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-[#C69214] text-[#1d1603] shadow-sm'
                      : 'rounded-bl-md border border-[#e4e9f2] bg-white text-[#16233d] shadow-[0_4px_18px_rgba(0,32,91,0.08)]'
                  }`}
                >
                  <ChatMessageBody content={m.content} variant={m.role === 'user' ? 'user' : 'assistant'} />
                  {m.role === 'assistant' && m.action ? (
                    <div className="mt-3 space-y-2">
                      {m.action.type === 'import_valid_records' &&
                      m.action.payload.report &&
                      typeof m.action.payload.report === 'object' ? (
                        <div className="space-y-2 rounded-xl border border-[#d7deea] bg-white p-3 shadow-sm">
                          <p className="text-xs font-semibold text-[#00205B]">Validation Report</p>
                          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            <div className="rounded-md bg-green-50 px-2 py-1 text-green-700">
                              ✅ {(m.action.payload.report as { summary: ValidationSummary }).summary.ready} ready
                            </div>
                            <div className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                              🔴 {(m.action.payload.report as { summary: ValidationSummary }).summary.duplicates}{' '}
                              duplicates
                            </div>
                            <div className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                              🟠 {(m.action.payload.report as { summary: ValidationSummary }).summary.missing_fields}{' '}
                              missing fields
                            </div>
                          </div>
                          {(m.action.payload.report as { issues: ValidationIssue[] }).issues.length > 0 ? (
                            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[#eceff5] bg-[#fafcff] p-2 text-xs">
                              {(m.action.payload.report as { issues: ValidationIssue[] }).issues.map((it, idx) => (
                                <p key={`${it.row}-${idx}`} className="text-[#3c4d6b]">
                                  Row {it.row} ({it.id}): {it.problem}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#e5c979] bg-[#fff8e7] px-3 py-2 text-xs text-[#4f3a03] shadow-sm">
                          <span className="font-semibold">Proposed Action:</span>{' '}
                          {m.action.type === 'select_import_type'
                            ? `Classify ${pendingImportRowsCount} rows as students or faculty before validation`
                            : m.action.description}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {m.action.type === 'select_import_type' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#00205B] text-white hover:bg-[#001742]"
                              onClick={() => void handleImportTypeSelection('students')}
                            >
                              Students
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#C69214] text-[#1d1603] hover:bg-[#af7f11]"
                              onClick={() => void handleImportTypeSelection('faculty')}
                            >
                              Faculty
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => requestConfirmAction(m.action!)}
                          >
                            {m.action.type === 'import_valid_records' ? 'Import Valid Records ✅' : 'Confirm ✓'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={cancelAction}
                        >
                          Cancel ✗
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deea] bg-white px-3 py-1.5 text-xs text-[#4b5f84] shadow-sm">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#00205B]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00205B]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00205B] [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#00205B] [animation-delay:240ms]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        <form
          className="sticky bottom-0 flex gap-2 border-t border-[#d7deea] bg-white p-3"
          onSubmit={e => {
            e.preventDefault()
            void send(input)
          }}
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about registration stats, low enrollment, inactive users…"
            className="flex-1 border-[#d7deea] focus-visible:ring-[#00205B]"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) void handleFileUpload(f)
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="border-[#d7deea] text-[#00205B] hover:bg-[#eef3ff]"
            disabled={loading || uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="submit" className="bg-[#00205B] text-white hover:bg-[#001742]" disabled={loading}>
            Send
          </Button>
        </form>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Admin Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter your admin password to confirm this action</p>
            <p className="text-xs text-muted-foreground">{pendingAction?.description || 'Confirm this action.'}</p>
            <Input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Enter your admin password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#e05a00] text-white hover:bg-[#c94f00]"
              disabled={!adminPassword || executing}
              onClick={() => void executeAction()}
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Execute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style jsx>{`
        .message-fade-in {
          animation: messageFadeIn 0.22s ease-out;
        }
        @keyframes messageFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
