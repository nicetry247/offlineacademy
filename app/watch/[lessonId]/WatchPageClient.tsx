'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/Header'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ModuleAccordion } from '@/components/ModuleAccordion'
import { LessonBookmarks } from '@/components/LessonBookmarks'
import { QuizPlayer } from '@/components/QuizPlayer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, Clock, CheckCircle, BookOpen, ArrowLeft, 
  ChevronLeft, ChevronRight, Volume2, VolumeX, 
  Maximize, Minimize, Settings, Loader2, SkipBack, SkipForward,
  Film, Music, FileText, Image as ImageIcon, HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import { formatDuration, formatTime, cn } from '@/lib/utils'
import { getCourseDisplayName } from '@/lib/course-display'

interface LessonType {
  id: string
  title: string
  slug: string
  order: number
  moduleId: string
  module: { name: string; courseId?: string; id: string }
  type: string
  duration: number | null
  filePath: string
  thumbnail: string | null
  subtitlePath: string | null
  progress?: { completed: boolean; position: number; lastWatched: string } | null
  quiz?: {
    version: 1
    source: 'quizapi' | 'the-trivia-api'
    topic: string
    title: string
    description: string
    fetchedAt: string
    updatedAt: string
    questions: Array<{
      id: string
      prompt: string
      options: string[]
      answerIndex: number
      explanation?: string
    }>
  } | null
}

interface CourseType {
  id: string
  slug: string
  name: string
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
      progress?: { completed: boolean; position: number; lastWatched: Date | string | null } | null
    }>
  }>
  stats: {
    totalLessons: number
    completedLessons: number
    percentage: number
  }
}

interface WatchPageClientProps {
  initialData: {
    lesson: LessonType
    course: CourseType
    prevLesson: { id: string; courseSlug: string } | null
    nextLesson: { id: string; courseSlug: string } | null
    currentIndex: number
    totalLessons: number
  }
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

function saveProgressFn(lessonId: string, courseId: string, moduleId: string, position: number) {
  return fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, courseId, moduleId, position, completed: false })
  })
}

function markCompleteFn(lessonId: string, courseId: string, moduleId: string, position: number) {
  return fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId, courseId, moduleId, position, completed: true })
  })
}

function VideoContent({ lesson, lessonProgress, onSave, onEnd, onTimeUpdate, seekRequest }: {
  lesson: { id: string; filePath: string; thumbnail: string | null; duration: number | null; subtitlePath: string | null }
  lessonProgress: { completed: boolean; position: number; lastWatched: string }
  onSave: (position: number) => void
  onEnd: () => void
  onTimeUpdate: (time: number) => void
  seekRequest: { time: number; nonce: number } | null
}) {
  return (
    <VideoPlayer
      src={'/api/files/' + lesson.filePath}
      poster={lesson.thumbnail ? '/api/files/' + lesson.thumbnail : undefined}
      initialTime={lessonProgress?.position || 0}
      autoPlay={true}
      onTimeUpdate={onTimeUpdate}
      onProgressSave={onSave}
      onEnded={onEnd}
      seekRequest={seekRequest}
      subtitles={lesson.subtitlePath ? '/api/files/' + lesson.subtitlePath : undefined}
    />
  )
}

function NonVideoContent({ lesson }: { lesson: { type: string; filePath: string; title: string; duration: number | null } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
      <div className="text-center p-8">
        {lesson.type === 'AUDIO' && (
          <audio
            src={'/api/files/' + lesson.filePath}
            controls
            className="w-full max-w-2xl mb-4"
          />
        )}
        {['PDF', 'MARKDOWN', 'HTML', 'JSON', 'TEXT', 'TXT', 'VTT'].includes(lesson.type) && (
          <iframe
            src={'/api/files/' + lesson.filePath}
            className="w-full h-[60vh] rounded border"
            title={lesson.title}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
        {lesson.type === 'IMAGE' && (
          <img
            src={'/api/files/' + lesson.filePath}
            alt={lesson.title}
            className="max-w-full max-h-[70vh] rounded shadow-lg"
          />
        )}
        {lesson.type === 'OTHER' && (
          <div className="text-center">
            <p className="text-muted-foreground">This file type cannot be previewed inline.</p>
            <a
              href={'/api/files/' + lesson.filePath}
              target="_blank"
              className="text-primary hover:underline mt-2 inline-block"
            >
              Open in new tab →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function MobileOverlay({ lesson, lessonProgress }: {
  lesson: { title: string; type: string; duration: number | null }
  lessonProgress: { completed: boolean; position: number; lastWatched: string }
}) {
  const [visible, setVisible] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
      onTouchStart={() => setVisible(false)}
    >
      <div className="max-w-3xl mx-auto pointer-events-none">
        <h2 className="text-lg font-semibold text-white mb-1">{lesson.title}</h2>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground capitalize">
            {lesson.type.toLowerCase()}
          </span>
          {lesson.duration && lessonProgress && (
            <>
              <span>{formatTime(lessonProgress.position)}</span>
              <span>/</span>
              <span>{formatTime(lesson.duration)}</span>
            </>
          )}
          {lesson.duration && !lessonProgress && (
            <span>{'0:00'} / {formatTime(lesson.duration)}</span>
          )}
        </div>
        {(lessonProgress?.position ?? 0) > 0 && lesson.duration && (
          <Progress 
            value={Math.min(100, ((lessonProgress?.position ?? 0) / lesson.duration) * 100)} 
            className="h-1.5 mt-2" 
          />
        )}
      </div>
    </div>
  )
}

function LessonHeader({ lesson, lessonProgress, prevLesson, nextLesson, course, currentIndex, totalLessons }: {
  lesson: {
    id: string
    title: string
    slug: string
    type: string
    duration: number | null
    order: number
    module: { name: string; id: string; courseId?: string }
    progress?: { completed: boolean; position: number; lastWatched: string } | null
  }
  lessonProgress: { completed: boolean; position: number; lastWatched: string }
  prevLesson: { id: string; courseSlug: string } | null
  nextLesson: { id: string; courseSlug: string } | null
  course: { id: string; slug: string; name: string; modules: any[] }
  currentIndex: number
  totalLessons: number
}) {
  const allLessons = course.modules.flatMap(m => m.lessons)

  return (
    <div className="hidden lg:block p-4 lg:p-6 border-t bg-card">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{lesson.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              {lessonTypeIcons[lesson.type] || lessonTypeIcons.OTHER}
              <span className="capitalize">{lesson.type.toLowerCase()}</span>
              {lesson.duration && <span>• {formatDuration(lesson.duration)}</span>}
              <span>• Module: {lesson.module.name}</span>
              <span>• Lesson {lesson.order + 1} of {allLessons.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prevLesson && (
              <Link href={`/watch/${prevLesson.id}?course=${course.slug}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            )}
            {nextLesson && (
              <Link href={`/watch/${nextLesson.id}?course=${course.slug}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {lessonProgress?.position && lesson.duration && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{formatTime(lessonProgress.position)} / {formatTime(lesson.duration)}</span>
              <span>{Math.round(Math.min(100, (lessonProgress.position / lesson.duration) * 100))}%</span>
            </div>
            <Progress value={Math.min(100, (lessonProgress.position / lesson.duration) * 100)} className="h-2" />
          </div>
        )}
      </div>
    </div>
  )
}

export function WatchPageClient({ initialData }: WatchPageClientProps) {
  const { lesson, course, prevLesson, nextLesson, currentIndex, totalLessons } = initialData
  const isVideo = lesson.type === 'VIDEO'
  const isQuiz = lesson.type === 'QUIZ'
  const allLessons = course.modules.flatMap(m => m.lessons)

  const [lessonProgress, setLessonProgress] = useState(lesson.progress || {
    completed: false,
    position: 0,
    lastWatched: new Date().toISOString(),
  })
  const [currentTime, setCurrentTime] = useState(lesson.progress?.position || 0)
  const [bookmarkSeekRequest, setBookmarkSeekRequest] = useState<{ time: number; nonce: number } | null>(null)

  const currentModule = course.modules.find(m => m.id === lesson.moduleId) || null

  // Sync progress when initialData changes (e.g., after auto-next navigation)
  useEffect(() => {
    setLessonProgress(lesson.progress || { completed: false, position: 0, lastWatched: new Date().toISOString() })
  }, [lesson.id, lesson.progress])

  function onSave(position: number) {
    saveProgressFn(lesson.id, course.id, lesson.moduleId, position)
      .then(() => setLessonProgress(p => ({ ...p, position, lastWatched: new Date().toISOString() })))
      .catch(e => console.error('Failed to save progress:', e))
  }

  function onEnd() {
    markCompleteFn(lesson.id, course.id, lesson.moduleId, lesson.duration || 0)
      .then(() => setLessonProgress(p => ({ ...p, completed: true, position: lesson.duration || 0 })))
      .catch(e => console.error('Failed to mark complete:', e))
    if (nextLesson) window.location.href = `/watch/${nextLesson.id}?course=${course.slug}`
  }

  const handlePrevLesson = useCallback(() => {
    if (prevLesson) {
      window.location.href = `/watch/${prevLesson.id}?course=${course.slug}`
    }
  }, [prevLesson, course.slug])

  const handleNextLesson = useCallback(() => {
    if (nextLesson) {
      window.location.href = `/watch/${nextLesson.id}?course=${course.slug}`
    }
  }, [nextLesson, course.slug])

  const handleBookmarkJump = useCallback((time: number) => {
    setBookmarkSeekRequest({ time, nonce: Date.now() })
    setCurrentTime(time)
    // Clear the seek request after the video player processes it
    setTimeout(() => setBookmarkSeekRequest(null), 100)
  }, [])

  const videoPlayer = isVideo ? (
    <VideoContent
      lesson={lesson}
      lessonProgress={lessonProgress}
      onSave={onSave}
      onEnd={onEnd}
      onTimeUpdate={setCurrentTime}
      seekRequest={bookmarkSeekRequest}
    />
  ) : null

  const quizContent = isQuiz ? (
    lesson.quiz ? (
      <QuizPlayer
        quiz={lesson.quiz}
        lessonId={lesson.id}
        courseId={course.id}
        moduleId={lesson.moduleId}
      />
    ) : (
      <Card className="mx-auto w-full max-w-3xl border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Quiz unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The quiz cache could not be loaded for this lesson yet.
          Try rescanning the course or open the course page to regenerate the cache.
        </CardContent>
      </Card>
    )
  ) : null

  const nonVideoContent = !isVideo && !isQuiz ? (
    <NonVideoContent lesson={lesson} />
  ) : null

  const courseTitle = getCourseDisplayName(course)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header backHref={`/course/${course.slug}`} backLabel={courseTitle} coffeeUrl="https://ko-fi.com/nicetry247" />

      <main className="flex-1 flex min-h-0 flex-col lg:flex-row overflow-hidden relative">
        {/* Main Video/Content Area */}
        <div className="flex-1 lg:w-3/4 min-w-0 min-h-0 flex flex-col relative">
          <div className="flex-1 min-h-0 relative bg-black">
            {/* Video container with proper aspect ratio on mobile */}
            <div className="w-full aspect-video lg:aspect-auto lg:h-full relative p-4 lg:p-6">
              {videoPlayer}
              {quizContent}
              {nonVideoContent}
              {isVideo && <MobileOverlay lesson={lesson} lessonProgress={lessonProgress} />}
            </div>
          </div>
          
          {/* Lesson Header - Desktop */}
          <LessonHeader
            lesson={lesson}
            lessonProgress={lessonProgress}
            prevLesson={prevLesson}
            nextLesson={nextLesson}
            course={course}
            currentIndex={currentIndex}
            totalLessons={totalLessons}
          />
          
          {/* Mobile Navigation Buttons */}
          <div className="lg:hidden p-4 border-t bg-card flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevLesson}
              disabled={!prevLesson}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={handleNextLesson}
              disabled={!nextLesson}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar - Below Video on Mobile */}
        <div className="lg:hidden border-t bg-card/50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Content
              </h3>
              <span className="text-sm text-muted-foreground">
                {course.stats.percentage}% complete
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${course.stats.percentage}%` }} 
              />
            </div>
          </div>
          {isVideo && currentModule && (
            <div className="shrink-0 border-b border-primary/30 bg-primary/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-primary">Now Playing</p>
              <p className="truncate text-sm font-medium">{currentModule.name}</p>
              <p className="truncate text-xs text-muted-foreground">{lesson.title}</p>
            </div>
          )}
          <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {isVideo && (
              <LessonBookmarks
                lessonId={lesson.id}
                courseId={course.id}
                moduleId={lesson.moduleId}
                currentTime={currentTime}
                onJumpToTime={handleBookmarkJump}
                isVideo={isVideo}
              />
            )}
            <ModuleAccordion
              courseId={course.id}
              modules={course.modules}
              currentLessonId={lesson.id}
              courseSlug={course.slug}
              defaultOpenModuleId={lesson.moduleId}
            />
          </div>
        </div>

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:w-1/4 border-l bg-card/50 flex-col h-[calc(100vh-4rem)] min-h-0 overscroll-y-contain">
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Content
              </h3>
              <span className="text-sm text-muted-foreground">
                {course.stats.percentage}% complete
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${course.stats.percentage}%` }} 
              />
            </div>
          </div>
          {isVideo && currentModule && (
            <div className="shrink-0 border-b border-primary/30 bg-primary/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-primary">Now Playing</p>
              <p className="truncate text-sm font-medium">{currentModule.name}</p>
              <p className="truncate text-xs text-muted-foreground">{lesson.title}</p>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 custom-scrollbar space-y-4">
            {isVideo && (
              <LessonBookmarks
                lessonId={lesson.id}
                courseId={course.id}
                moduleId={lesson.moduleId}
                currentTime={currentTime}
                onJumpToTime={handleBookmarkJump}
                isVideo={isVideo}
              />
            )}
            <ModuleAccordion
              courseId={course.id}
              modules={course.modules}
              currentLessonId={lesson.id}
              courseSlug={course.slug}
              defaultOpenModuleId={lesson.moduleId}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}
