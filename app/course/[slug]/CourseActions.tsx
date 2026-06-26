'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  RotateCcw,
  Share2,
  Settings,
  BrainCircuit,
  Loader2,
  Star,
  Tags,
  FolderPlus,
  PencilLine,
  Trash2,
  Bomb,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CourseActionsProps = {
  course: {
    id: string
    slug: string
    name: string
    path: string
    favorited?: boolean
  }
  modules: any[]
}

export function CourseActions({ course, modules }: CourseActionsProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [quickAction, setQuickAction] = React.useState<'tag' | 'category' | null>(null)
  const [quickActionValue, setQuickActionValue] = React.useState('')
  const [quickActionError, setQuickActionError] = React.useState<string | null>(null)
  const [quizStatus, setQuizStatus] = React.useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [quizMessage, setQuizMessage] = React.useState<string | null>(null)
  const [quizResults, setQuizResults] = React.useState<{ ok: number; skipped: number } | null>(null)

  const refreshLibrary = async () => {
    router.refresh()
  }

  const patchCourse = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/courses/${course.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data?.error || 'Failed to update course')
    }

    await refreshLibrary()
  }

  const handleToggleFavorite = async () => {
    try {
      await patchCourse({ favorited: !course.favorited })
    } catch (error) {
      console.error('Toggle favorite failed:', error)
      setStatus({ kind: 'error', text: 'Sorry, the pin did not stick. The favorite goblin dropped it.' })
    }
  }

  const startQuickAction = (mode: 'tag' | 'category') => {
    setQuickAction(mode)
    setQuickActionValue('')
    setQuickActionError(null)
  }

  const submitQuickAction = async () => {
    if (!quickAction) return
    const trimmed = quickActionValue.trim().replace(/\s+/g, ' ')
    if (!trimmed) {
      setQuickActionError(quickAction === 'tag' ? 'Type a tag first.' : 'Type a category first.')
      return
    }

    try {
      await patchCourse({ tagId: quickAction === 'category' ? `category:${trimmed}` : trimmed })
      setQuickAction(null)
      setQuickActionValue('')
      setQuickActionError(null)
    } catch (error) {
      console.error(`${quickAction} add failed:`, error)
      setQuickActionError(quickAction === 'tag' ? 'Tag did not stick. Try again.' : 'Category did not stick. Try again.')
    }
  }

  const [clearQuizModule, setClearQuizModule] = React.useState<string>('')

  const [clearQuizMode, setClearQuizMode] = React.useState(false)

  const clearQuiz = async () => {
    if (!clearQuizModule) {
      setStatus({ kind: 'error', text: 'Pick a module to clear first.' })
      return
    }

    const confirmed = window.confirm(`Remove quiz cache and quiz lesson for module "${clearQuizModule}"? This cannot be undone.`)
    if (!confirmed) return

    setQuizStatus('running')
    setQuizMessage('Clearing quiz...')
    setClearQuizMode(false)
    setClearQuizModule('')
    try {
      const response = await fetch(`/api/courses/${course.slug}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', module: clearQuizModule }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to clear quiz')
      }

      await refreshLibrary()
      router.refresh()
      setQuizStatus('success')
      setQuizMessage(`✅ Cleared quiz for ${clearQuizModule}`)
      setQuizResults(null)
    } catch (error) {
      console.error('Clear quiz failed:', error)
      setQuizStatus('error')
      setQuizMessage(error instanceof Error ? error.message : 'Failed to clear quiz.')
    }
  }

  const handleRegenerateQuiz = async () => {
    setQuizStatus('running')
    setQuizMessage('Regenerating quizzes with QuizAPI...')
    try {
      const response = await fetch(`/api/courses/${course.slug}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', source: 'quizapi', difficulty: 'medium' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to regenerate quizzes')
      }

      const okCount = data.results?.filter((item: { status: string }) => item.status === 'ok').length ?? 0
      const skippedCount = data.results?.filter((item: { status: string }) => item.status === 'skipped').length ?? 0
      setQuizResults({ ok: okCount, skipped: skippedCount })
      await refreshLibrary()
      router.refresh()
      setQuizStatus('success')
      setQuizMessage(`✅ Regenerated ${okCount} module quiz${okCount !== 1 ? 's' : ''}${skippedCount ? ` (${skippedCount} skipped)` : ''}`)
    } catch (error) {
      console.error('Regenerate quiz failed:', error)
      setQuizStatus('error')
      setQuizMessage(error instanceof Error ? error.message : 'Quiz regeneration failed.')
    }
  }

  const handleRename = async () => {
    const nextName = window.prompt('Rename course', course.name)
    if (nextName === null) return

    const trimmed = nextName.trim()
    if (!trimmed || trimmed === course.name) return

    try {
      const response = await fetch(`/api/courses/${course.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename course')
      }

      await refreshLibrary()
    } catch (error) {
      console.error('Rename course failed:', error)
      setStatus({ kind: 'error', text: 'Sorry, the rename did not stick. The little gremlin in the API tripped.' })
    }
  }

  const handleDelete = async (scope: 'library' | 'disk') => {
    const isDiskDelete = scope === 'disk'
    const confirmationMessage = isDiskDelete
      ? `Delete "${course.name}" from disk?\n\nThis permanently removes the course folder and all library records. This cannot be undone.`
      : `Delete "${course.name}" from the library?\n\nThis hides the course from the app but keeps its files on disk.`

    const confirmed = window.confirm(confirmationMessage)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/courses/${course.slug}?scope=${scope}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete course (${scope})`)
      }

      await refreshLibrary()
      // Navigate back to library after deletion
      router.push('/')
    } catch (error) {
      console.error('Delete course failed:', error)
      setStatus({ kind: 'error', text: isDiskDelete
        ? 'Sorry, the disk delete did not stick. The server bumped into the filesystem goblin.'
        : 'Sorry, the library delete did not stick. The server sneezed on the request.' })
    }
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline ml-1">Back to Library</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <RotateCcw className="h-4 w-4" />
            Rescan
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-1" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="https://ko-fi.com/nicetry247" target="_blank" rel="noreferrer noopener" className="header-control p-1.5" aria-label="Support on Ko-fi">
            <img src="/ko-fi-icon.gif" alt="Support on Ko-fi" className="h-8 w-8 object-contain" />
          </Link>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`${course.name} course actions`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={handleToggleFavorite} className="gap-2">
                <Star className={course.favorited ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4'} />
                {course.favorited ? 'Unpin favorite' : 'Pin favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); startQuickAction('tag') }} className="gap-2">
                <Tags className="h-4 w-4" />
                Add tag
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); startQuickAction('category') }} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Add category
              </DropdownMenuItem>
              {quickAction && (
                <div className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {quickAction === 'tag' ? 'New tag' : 'New category'}
                  </label>
                  <input
                    value={quickActionValue}
                    onChange={(event) => setQuickActionValue(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                      if (event.key === 'Enter') submitQuickAction()
                      if (event.key === 'Escape') setQuickAction(null)
                    }}
                    placeholder={quickAction === 'tag' ? 'e.g. linux' : 'e.g. Cloud'}
                    className="mb-2 h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  />
                  {quickActionError && <p className="mb-2 text-xs text-destructive">{quickActionError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuickAction(null)}>Cancel</Button>
                    <Button type="button" size="sm" onClick={submitQuickAction}>Save</Button>
                  </div>
                </div>
              )}
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setClearQuizMode(value => !value) }} disabled={quizStatus === 'running'} className="gap-2">
                {quizStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {clearQuizMode ? 'Cancel' : 'Clear Quiz'}
              </DropdownMenuItem>
              {clearQuizMode && (
                <div className="px-2 py-2" onClick={(event) => event.stopPropagation()}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Module to clear</label>
                  <select
                    value={clearQuizModule}
                    onChange={(event) => setClearQuizModule(event.target.value)}
                    className="mb-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  >
                    <option value="">Select module...</option>
                    {modules.map((module: any) => (
                      <option key={module.path || module.name} value={module.name}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setClearQuizMode(false); setClearQuizModule('') }}>Cancel</Button>
                    <Button type="button" size="sm" onClick={clearQuiz} disabled={!clearQuizModule}>Clear</Button>
                  </div>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleRegenerateQuiz} disabled={quizStatus === 'running'} className="gap-2">
                {quizStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                {quizStatus === 'running' ? 'Regenerating...' : 'Regenerate Quiz'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleRename} className="gap-2">
                <PencilLine className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleDelete('library')} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete from library
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleDelete('disk')} className="gap-2 text-destructive focus:text-destructive">
                <Bomb className="h-4 w-4" />
                Delete from disk
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {status ? <span className={`text-xs ${status.kind === 'success' ? 'text-primary' : 'text-destructive'}`}>{status.text}</span> : null}
        </div>
      </div>

      {(quizStatus === 'success' || quizStatus === 'error') && quizMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 animate-slide-in flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-md ${
            quizStatus === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
          role="alert"
        >
          <span className="flex-1 text-sm">{quizMessage}</span>
          {quizResults && (
            <Badge variant="outline" className="gap-1 text-xs">
              {quizResults.ok} generated
              {quizResults.skipped > 0 && <span>·</span>}
              {quizResults.skipped > 0 && <span>{quizResults.skipped} skipped</span>}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0"
            onClick={() => { setQuizStatus('idle'); setQuizMessage(null); setQuizResults(null); }}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading || quizStatus === 'running' ? <Progress value={70} className="h-1 rounded-none gradient-progress" /> : null}
    </header>
  )
}
