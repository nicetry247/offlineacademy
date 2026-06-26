'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  Play,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  HelpCircle,
} from 'lucide-react'
import { cn, formatDuration, formatTime } from '@/lib/utils'

interface ModuleAccordionProps {
  courseId: string
  modules: Array<{
    id: string
    name: string
    slug: string
    order: number
    lessons: Array<{
      id: string
      title: string
      slug: string
      order: number
      type: string
      duration: number | null
      moduleId: string
      progress?: {
        completed: boolean
        position: number
        lastWatched: Date | string | null
      } | null
    }>
  }>
  currentLessonId?: string
  courseSlug: string
  defaultOpenModuleId?: string | null
}

const lessonTypeIcons: Record<string, React.ReactNode> = {
  VIDEO: <Film className="h-4 w-4 text-red-400" />,
  AUDIO: <Music className="h-4 w-4 text-purple-400" />,
  PDF: <FileText className="h-4 w-4 text-red-500" />,
  MARKDOWN: <FileText className="h-4 w-4 text-blue-400" />,
  HTML: <FileText className="h-4 w-4 text-orange-400" />,
  IMAGE: <ImageIcon className="h-4 w-4 text-green-400" />,
  QUIZ: <HelpCircle className="h-4 w-4 text-amber-400" />,
  OTHER: <FileText className="h-4 w-4 text-muted-foreground" />,
}

async function saveProgress(payload: {
  lessonId: string
  courseId: string
  moduleId: string
  position: number
  completed: boolean
}) {
  const response = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to save progress')
  }
}

export function ModuleAccordion({ modules, currentLessonId, courseSlug, courseId, defaultOpenModuleId }: ModuleAccordionProps) {
  const router = useRouter()
  const [savingLessonIds, setSavingLessonIds] = React.useState<Record<string, boolean>>({})
  const [savingModuleIds, setSavingModuleIds] = React.useState<Record<string, boolean>>({})

  const currentModuleId = React.useMemo(() => {
    if (defaultOpenModuleId) return defaultOpenModuleId
    if (!currentLessonId) return undefined
    for (const module of modules) {
      if (module.lessons.some(lesson => lesson.id === currentLessonId)) {
        return module.id
      }
    }
    return undefined
  }, [currentLessonId, modules, defaultOpenModuleId])
  const openModuleId = React.useMemo(() => {
    if (!currentModuleId) return undefined
    return [currentModuleId]
  }, [currentModuleId])

  const toggleLessonDone = React.useCallback(async (
    lesson: {
      id: string
      moduleId: string
      duration: number | null
      progress?: { completed: boolean; position: number } | null
    }
  ) => {
    const wasCompleted = Boolean(lesson.progress?.completed)
    const nextCompleted = !wasCompleted
    const position = nextCompleted
      ? Math.max(lesson.progress?.position || 0, lesson.duration || 0)
      : (lesson.progress?.position || 0)

    setSavingLessonIds((prev) => ({ ...prev, [lesson.id]: true }))
    try {
      await saveProgress({
        lessonId: lesson.id,
        courseId,
        moduleId: lesson.moduleId,
        position,
        completed: nextCompleted,
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle lesson done:', error)
    } finally {
      setSavingLessonIds((prev) => {
        const next = { ...prev }
        delete next[lesson.id]
        return next
      })
    }
  }, [courseId, router])

  const toggleModuleDone = React.useCallback(async (
    module: {
      id: string
      lessons: Array<{
        id: string
        moduleId: string
        duration: number | null
        progress?: { completed: boolean; position: number } | null
      }>
    }
  ) => {
    const completedCount = module.lessons.filter((lesson) => lesson.progress?.completed).length
    const allCompleted = completedCount === module.lessons.length && module.lessons.length > 0
    const nextCompleted = !allCompleted

    setSavingModuleIds((prev) => ({ ...prev, [module.id]: true }))
    try {
      for (const lesson of module.lessons) {
        const position = nextCompleted
          ? Math.max(lesson.progress?.position || 0, lesson.duration || 0)
          : (lesson.progress?.position || 0)

        await saveProgress({
          lessonId: lesson.id,
          courseId,
          moduleId: lesson.moduleId,
          position,
          completed: nextCompleted,
        })
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle module done:', error)
    } finally {
      setSavingModuleIds((prev) => {
        const next = { ...prev }
        delete next[module.id]
        return next
      })
    }
  }, [courseId, router])

  const [openModules, setOpenModules] = React.useState<string[] | undefined>(openModuleId)

  React.useEffect(() => {
    setOpenModules(openModuleId)
  }, [openModuleId])

  return (
    <Accordion type="multiple" className="w-full" value={openModules} onValueChange={setOpenModules}>
      {modules.map((module) => {
        const completedCount = module.lessons.filter((lesson) => lesson.progress?.completed).length
        const allCompleted = completedCount === module.lessons.length && module.lessons.length > 0
        const isSavingModule = Boolean(savingModuleIds[module.id])
        const isCurrentModule = currentModuleId === module.id

        return (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger className="py-3 text-left font-medium hover:bg-accent rounded-lg px-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-mono">
                  {String(module.order + 1).padStart(2, '0')}
                </span>
                <span className="flex-1">{module.name}</span>
                {isCurrentModule ? (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Now Playing
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                    {completedCount}/{module.lessons.length}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-2">
              <div className="space-y-3 pl-8 border-l border-border/50 ml-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-secondary/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {completedCount} / {module.lessons.length} lessons done
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {allCompleted ? 'All lessons in this module are marked done.' : 'Mark the whole module done or clear it in one click.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={allCompleted ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => toggleModuleDone(module)}
                    disabled={isSavingModule}
                    className="gap-2"
                  >
                    {isSavingModule ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : allCompleted ? (
                      <Circle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {allCompleted ? 'Mark module incomplete' : 'Mark module done'}
                  </Button>
                </div>

                {module.lessons.map((lesson) => {
                  const isCurrent = currentLessonId === lesson.id
                  const isCompleted = Boolean(lesson.progress?.completed)
                  const progress = lesson.progress
                  const hasProgress = progress && progress.position > 0 && !isCompleted
                  const progressPercent = lesson.duration && progress
                    ? Math.round((progress.position / lesson.duration) * 100)
                    : 0
                  const isSavingLesson = Boolean(savingLessonIds[lesson.id])
                  const watchHref = '/watch/' + lesson.id + '?course=' + courseSlug

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-2 py-2 transition-colors',
                        'hover:bg-accent',
                        isCurrent && 'bg-primary/10 border border-primary/30',
                        isCompleted && 'opacity-60'
                      )}
                    >
                      <Link
                        href={watchHref}
                        className="flex flex-1 min-w-0 items-start gap-3"
                      >
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span className="text-xs text-muted-foreground font-mono w-6 text-right">
                            {String(lesson.order + 1).padStart(2, '0')}
                          </span>

                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                          ) : hasProgress ? (
                            <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
                          ) : (
                            <Play className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'font-medium truncate',
                            isCompleted && 'line-through text-muted-foreground',
                            isCurrent && 'text-primary'
                          )}>
                            {lesson.title}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {lessonTypeIcons[lesson.type] || lessonTypeIcons.OTHER}
                            <span className="capitalize">{lesson.type.toLowerCase()}</span>
                            {lesson.duration && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(lesson.duration)}</span>
                              </>
                            )}
                            {hasProgress && lesson.duration && (
                              <>
                                <span>•</span>
                                <span>{formatTime(progress!.position)} / {formatDuration(lesson.duration)}</span>
                              </>
                            )}
                          </div>

                          {hasProgress && lesson.duration && (
                            <div className="h-1 bg-muted rounded-full mt-1 w-32">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: progressPercent + '%' }}
                              />
                            </div>
                          )}
                        </div>
                      </Link>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'mt-0.5 h-9 w-9 shrink-0 rounded-full',
                          isCompleted ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                        onClick={() => toggleLessonDone({
                          id: lesson.id,
                          moduleId: lesson.moduleId,
                          duration: lesson.duration,
                          progress: lesson.progress ? {
                            completed: lesson.progress.completed,
                            position: lesson.progress.position,
                          } : null,
                        })}
                        disabled={isSavingLesson}
                        aria-label={isCompleted ? 'Mark lesson incomplete' : 'Mark lesson complete'}
                        title={isCompleted ? 'Mark lesson incomplete' : 'Mark lesson complete'}
                      >
                        {isSavingLesson ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
