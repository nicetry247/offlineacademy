import Link from 'next/link'
import { CourseActions } from './CourseActions'
import { ModuleAccordion } from '@/components/ModuleAccordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, BookOpen } from 'lucide-react'
import { getCourseDisplayName } from '@/lib/course-display'
import { formatDuration } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

async function getCourse(slug: string) {
  const course = await prisma.course.findFirst({
    where: { slug, hidden: false },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              progress: {
                where: { userId: 'local-user' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!course) return null

  const modules = course.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({
      ...lesson,
      progress: lesson.progress[0]
        ? {
            completed: lesson.progress[0].completed,
            position: lesson.progress[0].position,
            lastWatched: lesson.progress[0].lastWatched.toISOString(),
          }
        : null,
    })),
  }))

  const allLessons = modules.flatMap((module) => module.lessons)
  const completedLessons = allLessons.filter((lesson) => lesson.progress?.completed).length
  const totalLessons = allLessons.length
  const totalDuration = allLessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0)
  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const latestProgress = await prisma.progress.findFirst({
    where: { userId: 'local-user', courseId: course.id, lessonId: { not: null } },
    orderBy: { lastWatched: 'desc' },
    select: { lessonId: true },
  })

  return {
    ...course,
    modules,
    stats: {
      totalLessons,
      completedLessons,
      totalDuration,
      percentage,
      lastLessonId: latestProgress?.lessonId || null,
    },
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) return null

  const courseTitle = getCourseDisplayName(course)
  const modules = course.modules || []

  return (
    <div className="min-h-screen bg-background">
      <CourseActions course={course} modules={modules} />

      <section className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted lg:w-64 lg:flex-shrink-0">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={courseTitle} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <BookOpen className="h-16 w-16 text-primary/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{modules.length} modules</Badge>
                <Badge variant="secondary">{course.stats.totalLessons} lessons</Badge>
                <Badge variant="outline">{formatDuration(course.stats.totalDuration)}</Badge>
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">{courseTitle}</h1>
              {course.description && <p className="text-muted-foreground line-clamp-3">{course.description}</p>}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>{course.stats.completedLessons} / {course.stats.totalLessons} lessons completed</span>
                  <span className="font-semibold text-primary">{course.stats.percentage}%</span>
                </div>
                <Progress value={course.stats.percentage} className="mt-2 h-3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-4">
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Course Content
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-12rem)] overflow-y-auto p-0">
            <div className="p-4">
              <ModuleAccordion courseId={course.id} modules={modules} currentLessonId={course.stats.lastLessonId || undefined} courseSlug={course.slug} />
            </div>
          </CardContent>
        </Card>

        <section className="lg:col-span-3">
          <Card>
            <CardContent className="space-y-4 py-10 text-center">
              {course.stats.lastLessonId ? (
                <>
                  <Play className="mx-auto h-12 w-12 text-primary/50" />
                  <h3 className="text-lg font-semibold">Ready to continue?</h3>
                  <p className="text-sm text-muted-foreground">You left off at <strong>Lesson {(modules.flatMap((module: any) => module.lessons).find((lesson: any) => lesson.id === course.stats.lastLessonId)?.order ?? 0) + 1}</strong></p>
                  <Link href={`/watch/${course.stats.lastLessonId}?course=${course.slug}`}>
                    <Button className="gap-2">
                      <Play className="h-5 w-5" />
                      Continue Watching
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <BookOpen className="mx-auto h-12 w-12 text-primary/50" />
                  <h3 className="text-lg font-semibold">Start Learning</h3>
                  <p className="text-sm text-muted-foreground">Select a lesson from the sidebar to begin.</p>
                  {modules[0]?.lessons[0] && (
                    <Link href={`/watch/${modules[0].lessons[0].id}?course=${course.slug}`}>
                      <Button className="gap-2">
                        <Play className="h-5 w-5" />
                        Start First Lesson
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
