'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Play,
  Clock,
  CheckCircle,
  EllipsisVertical,
  PencilLine,
  Trash2,
  Bomb,
  Star,
  Tags,
  FolderPlus,
  BrainCircuit,
  Loader2,
} from 'lucide-react'
import {
  VideoCamera,
  ViewGrid,
  BookStack,
  Database,
  Folder,
  Code,
  Computer,
  Shield,
  Network,
} from 'iconoir-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCourseThumbnailClient } from '@/lib/thumbnail-index'
import { getCourseDisplayName } from '@/lib/course-display'
import { getDeterministicGradient } from '@/lib/cover-gradient'

interface CourseCardProps {
  course: {
    id: string
    name: string
    slug: string
    thumbnail: string | null
    description: string | null
    favorited?: boolean
    tags?: Array<{ id: string; name: string; color?: string | null }>
    _count?: { modules: number; lessons: number }
    progress?: {
      completedLessons: number
      totalLessons: number
      percentage: number
      lastWatched: Date | string | null
    }
  }
  onChanged?: () => void | Promise<void>
}

function coverGradient(title: string): string {
  return getDeterministicGradient(title)
}

function getCourseIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('hashicorp') || n.includes('terraform') || n.includes('vault') || n.includes('consul')) return <Shield className="h-5 w-5" />
  if (n.includes('linux') || n.includes('shell') || n.includes('bash') || n.includes('terminal')) return <Computer className="h-5 w-5" />
  if (n.includes('code') || n.includes('program') || n.includes('develop') || n.includes('python') || n.includes('javascript')) return <Code className="h-5 w-5" />
  if (n.includes('automat') || n.includes('n8n') || n.includes('workflow') || n.includes('zapier')) return <Network className="h-5 w-5" />
  if (n.includes('database') || n.includes('sql') || n.includes('db')) return <Database className="h-5 w-5" />
  if (n.includes('folder') || n.includes('file') || n.includes('system')) return <Folder className="h-5 w-5" />
  return <BookStack className="h-5 w-5" />
}

function getCourseIconColor(name: string) {
  const n = name.toLowerCase()
  if (n.includes('hashicorp') || n.includes('terraform') || n.includes('vault') || n.includes('consul')) return 'text-primary'
  if (n.includes('linux') || n.includes('shell') || n.includes('bash') || n.includes('terminal')) return 'text-emerald-400'
  if (n.includes('code') || n.includes('program') || n.includes('develop') || n.includes('python') || n.includes('javascript')) return 'text-amber-400'
  if (n.includes('automat') || n.includes('n8n') || n.includes('workflow') || n.includes('zapier')) return 'text-cyan-400'
  if (n.includes('database') || n.includes('sql') || n.includes('db')) return 'text-blue-400'
  return 'text-primary'
}

function getCoverClass(name: string) {
  const n = name.toLowerCase()
  if (n.includes('hashicorp') || n.includes('terraform') || n.includes('vault') || n.includes('consul')) return 'course-cover-hashicorp'
  if (n.includes('linux') || n.includes('shell') || n.includes('bash') || n.includes('terminal')) return 'course-cover-linux'
  if (n.includes('code') || n.includes('program') || n.includes('develop') || n.includes('python') || n.includes('javascript')) return 'course-cover-code'
  if (n.includes('automat') || n.includes('n8n') || n.includes('workflow') || n.includes('zapier')) return 'course-cover-automation'
  return 'course-cover-generic'
}

export function CourseCard({ course, onChanged }: CourseCardProps) {
  const router = useRouter()
  const [quickAction, setQuickAction] = React.useState<'tag' | 'category' | null>(null)
  const [quickActionValue, setQuickActionValue] = React.useState('')
  const [quickActionError, setQuickActionError] = React.useState<string | null>(null)
  const [quizStatus, setQuizStatus] = React.useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [quizMessage, setQuizMessage] = React.useState<string | null>(null)
  const { progress, _count } = course
  const courseTitle = getCourseDisplayName(course)
  const percentage = progress?.percentage || 0
  const completed = progress?.completedLessons || 0
  const total = progress?.totalLessons || _count?.lessons || 0
  const lastWatched = progress?.lastWatched
  const visibleTags = course.tags || []
  const categoryTags = visibleTags.filter((tag) => tag.name.startsWith('category:'))
  const plainTags = visibleTags.filter((tag) => !tag.name.startsWith('category:'))

  const CourseIcon = getCourseIcon(course.name)
  const iconColor = getCourseIconColor(course.name)
  const coverClass = getCoverClass(course.name)
  const thumbnailUrl = getCourseThumbnailClient(course)

  const refreshLibrary = async () => {
    await onChanged?.()
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
      window.alert('Sorry, the pin did not stick. The favorite goblin dropped it.')
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

  const handleRename = async () => {
    const nextName = window.prompt('Rename course', courseTitle)
    if (nextName === null) return

    const trimmed = nextName.trim()
    if (!trimmed || trimmed === courseTitle) return

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
      window.alert('Sorry, the rename did not stick. The little gremlin in the API tripped.')
    }
  }

  const handleDelete = async (scope: 'library' | 'disk') => {
    const isDiskDelete = scope === 'disk'
    const confirmationMessage = isDiskDelete
      ? `Delete "${courseTitle}" from disk?\n\nThis permanently removes the course folder and all library records. This cannot be undone.`
      : `Delete "${courseTitle}" from the library?\n\nThis hides the course from the app but keeps its files on disk.`

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
    } catch (error) {
      console.error('Delete course failed:', error)
      window.alert(
        isDiskDelete
          ? 'Sorry, the disk delete did not stick. The server bumped into the filesystem goblin.'
          : 'Sorry, the library delete did not stick. The server sneezed on the request.'
      )
    }
  }

  const clearQuiz = async () => {
    const confirmed = window.confirm(`Clear all quizzes for "${courseTitle}"? This cannot be undone.`)
    if (!confirmed) return

    setQuizStatus('running')
    setQuizMessage('Clearing quizzes...')
    try {
      const response = await fetch(`/api/courses/${course.slug}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', module: '__all__' }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to clear quizzes')
      }

      await onChanged?.()
      router.refresh()
      setQuizStatus('success')
      setQuizMessage(`Cleared all quizzes for ${courseTitle}`)
    } catch (error) {
      console.error('Clear quiz failed:', error)
      setQuizStatus('error')
      setQuizMessage(error instanceof Error ? error.message : 'Failed to clear quizzes.')
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

      const regenerated = data.results?.filter((item: { status: string }) => item.status === 'ok').length
      await onChanged?.()
      router.refresh()
      setQuizStatus('success')
      setQuizMessage(`QuizAPI regenerated ${regenerated ?? 'the'} module quiz set.`)
    } catch (error) {
      console.error('Regenerate quiz failed:', error)
      setQuizStatus('error')
      setQuizMessage(error instanceof Error ? error.message : 'Quiz regeneration failed.')
    }
  }

  return (
    <article className="block">
      <Card className="glass-card-elevated group relative h-full flex flex-col overflow-hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-30 h-9 w-9 rounded-full bg-black/40 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all hover:bg-black/60 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Course actions for ${courseTitle}`}
            >
              <EllipsisVertical className="h-4 w-4" />
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
            <DropdownMenuItem onSelect={clearQuiz} disabled={quizStatus === 'running'} className="gap-2">
              {quizStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {quizStatus === 'running' ? 'Clearing...' : 'Clear Quiz'}
            </DropdownMenuItem>
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

      <Link href={'/course/' + course.slug} className="absolute inset-0 z-10" aria-label={`Open ${courseTitle}`}>
        <span className="sr-only">Open {courseTitle}</span>
      </Link>

      {/* Cover: local image -> deterministic gradient -> legacy CSS cover */}
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={courseTitle}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onError={(event) => {
              const target = event.currentTarget
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${coverGradient(courseTitle)}`}>
            <p className="px-4 text-center text-lg font-semibold text-white drop-shadow-md">{courseTitle}</p>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-110 hover:bg-primary"
            aria-label="Play"
          >
            <Play className="ml-1 h-7 w-7" />
          </button>
        </div>

        {/* Quiz regeneration overlay */}
        {quizStatus === 'running' && (
          <div className="absolute inset-x-3 bottom-3 z-30 rounded-xl border border-primary/30 bg-background/90 p-3 shadow-lg backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Regenerating quiz with QuizAPI...
            </div>
            <Progress value={70} className="h-1.5 gradient-progress" />
          </div>
        )}

          {/* Progress overlay */}
          {percentage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
              <Progress value={percentage} className="h-full gradient-progress bg-transparent" />
            </div>
          )}

          {/* Completion / favorite badges */}
          <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
            {course.favorited && (
              <Badge variant="secondary" className="bg-amber-500/20 px-2.5 py-1 text-amber-300 border-amber-500/30 gap-1">
                <Star className="h-3 w-3 fill-amber-300" />
                Pinned
              </Badge>
            )}
            {percentage === 100 && total > 0 && (
              <Badge variant="success" className="px-2.5 py-1 gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </Badge>
            )}
          </div>

          {/* Course Type Icon */}
          <div className="absolute left-3 top-3 z-20">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/60 backdrop-blur-sm">
              <span className={iconColor}>{CourseIcon}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="relative z-0 flex flex-1 flex-col p-5">
          <h3 className="mb-2 line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary">{courseTitle}</h3>

          {course.description && (
            <p className="mb-4 flex-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
          )}

          {visibleTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {categoryTags.slice(0, 2).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {tag.name.replace(/^category:/, '')}
                </Badge>
              ))}
              {plainTags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="bg-white/5">
                  {tag.name}
                </Badge>
              ))}
              {visibleTags.length > 5 && (
                <Badge variant="outline" className="bg-white/5">+{visibleTags.length - 5}</Badge>
              )}
            </div>
          )}

          {/* Stats with Iconoir icons */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
            {_count?.modules && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                <ViewGrid className="h-3 w-3" />
                {_count.modules} modules
              </span>
            )}
            {total > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                <VideoCamera className="h-3 w-3" />
                {total} lessons
              </span>
            )}
          </div>

          {quizMessage && quizStatus !== 'idle' && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${quizStatus === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}`}>
              {quizMessage}
            </div>
          )}

          {/* Emerald Gradient Progress Bar */}
          {total > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{completed} / {total} lessons</span>
                <span className="font-semibold text-primary">{Math.round(percentage)}%</span>
              </div>
              <Progress value={percentage} className="h-2.5 gradient-progress" />
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="border-t border-white/5 px-5 pb-5 pt-0">
          {lastWatched && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last: {new Date(lastWatched).toLocaleDateString()}
            </span>
          )}
        </CardFooter>
      </Card>
    </article>
  )
}
