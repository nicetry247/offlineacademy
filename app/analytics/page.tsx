import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { getAnalyticsData } from '@/lib/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Clock,
  CheckCircle2,
  BookOpen,
  Play,
  TrendingUp,
  Bookmark,
  Film,
  Music,
  FileText,
  Image as ImageIcon,
  Award,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Learning analytics and progress overview.',
}

const lessonTypeIcons: Record<string, React.ReactNode> = {
  VIDEO: <Film className="h-4 w-4 text-red-400" />,
  AUDIO: <Music className="h-4 w-4 text-purple-400" />,
  PDF: <FileText className="h-4 w-4 text-red-500" />,
  MARKDOWN: <FileText className="h-4 w-4 text-blue-400" />,
  HTML: <FileText className="h-4 w-4 text-orange-400" />,
  IMAGE: <ImageIcon className="h-4 w-4 text-green-400" />,
  OTHER: <FileText className="h-4 w-4 text-muted-foreground" />,
}

const lessonTypeColors: Record<string, string> = {
  VIDEO: 'bg-red-500/20 text-red-400',
  AUDIO: 'bg-purple-500/20 text-purple-400',
  PDF: 'bg-red-500/20 text-red-400',
  MARKDOWN: 'bg-blue-500/20 text-blue-400',
  HTML: 'bg-orange-500/20 text-orange-400',
  IMAGE: 'bg-green-500/20 text-green-400',
  OTHER: 'bg-muted text-muted-foreground',
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  const totalWatchedHours = Math.floor(data.totalWatchedMinutes / 60)
  const remainingMinutes = data.totalWatchedMinutes % 60

  return (
    <div className="min-h-screen bg-background">
      <Header backHref="/" backLabel="Dashboard" coffeeUrl="https://ko-fi.com/nicetry247" />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 text-gradient-primary">
            Learning Analytics
          </h1>
          <p className="text-muted-foreground">
            Your personal learning insights and progress overview.
          </p>
        </section>

        {/* Overview Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                Total Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{data.totalCourses}</p>
                <p className="text-xs text-muted-foreground">
                  {data.completedCourses} completed · {data.inProgressCourses} in progress
                </p>
                <Progress
                  value={data.totalCourses > 0 ? Math.round((data.completedCourses / data.totalCourses) * 100) : 0}
                  className="h-1.5 mt-2 gradient-progress"
                />
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Lessons Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{data.completedLessons}</p>
                <p className="text-xs text-muted-foreground">
                  {data.lessonCompletionRate}% completion rate
                </p>
                <Progress value={data.lessonCompletionRate} className="h-1.5 mt-2 gradient-progress" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Total Time Watched
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {totalWatchedHours}h {remainingMinutes}m
                </p>
                <p className="text-xs text-muted-foreground">{data.totalWatchedMinutes} minutes total</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {data.weeklyWatchedHours}h
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.weeklyCompletedLessons} lessons completed
                </p>
                <Progress
                  value={Math.min(100, Math.round((data.weeklyWatchedHours / 10) * 100))}
                  className="h-1.5 mt-2 gradient-progress-accent"
                />
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Detailed Breakdown */}
        <section className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Lessons by Type */}
          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Lessons by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.lessonsByType.map(({ type, _count }) => {
                const completed = data.completedByType[type] || 0
                const percentage = _count > 0 ? Math.round((completed / _count) * 100) : 0
                const Icon = lessonTypeIcons[type] || lessonTypeIcons.OTHER
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${lessonTypeColors[type] || lessonTypeColors.OTHER}`}>
                          {Icon}
                        </span>
                        <div>
                          <p className="font-medium capitalize">{type.toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {completed} / {_count} completed
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {percentage}%
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2 gradient-progress" />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Course Progress Distribution */}
          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Course Progress Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    Completed
                  </span>
                  <Badge variant="secondary">{data.completedCourses}</Badge>
                </div>
                <Progress
                  value={data.totalCourses > 0 ? Math.round((data.completedCourses / data.totalCourses) * 100) : 0}
                  className="h-2.5 gradient-progress"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-400" />
                    In Progress
                  </span>
                  <Badge variant="secondary">{data.inProgressCourses}</Badge>
                </div>
                <Progress
                  value={data.totalCourses > 0 ? Math.round((data.inProgressCourses / data.totalCourses) * 100) : 0}
                  className="h-2.5 gradient-progress-accent"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-muted" />
                    Not Started
                  </span>
                  <Badge variant="secondary">
                    {data.totalCourses - data.completedCourses - data.inProgressCourses}
                  </Badge>
                </div>
                <Progress
                  value={data.totalCourses > 0
                    ? Math.round(((data.totalCourses - data.completedCourses - data.inProgressCourses) / data.totalCourses) * 100)
                    : 0}
                  className="h-2.5"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    Lesson Completion
                  </span>
                  <Badge variant="secondary">{data.lessonCompletionRate}%</Badge>
                </div>
                <Progress value={data.lessonCompletionRate} className="h-3 gradient-progress" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Time Stats */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Total Watch Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours watched</span>
                <span className="font-semibold text-lg">{totalWatchedHours}h {remainingMinutes}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minutes total</span>
                <span className="font-semibold">{data.totalWatchedMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average per lesson</span>
                <span className="font-semibold">
                  {data.completedLessons > 0
                    ? `${Math.round(data.totalWatchedMinutes / data.completedLessons)} min`
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                This Week Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hours watched</span>
                <span className="font-semibold text-lg">{data.weeklyWatchedHours}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minutes</span>
                <span className="font-semibold">{data.weeklyWatchedMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lessons completed</span>
                <span className="font-semibold text-green-500">{data.weeklyCompletedLessons}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Lesson Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Completed
                </span>
                <span className="font-semibold text-green-500">{data.completedLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-blue-400" />
                  In Progress
                </span>
                <span className="font-semibold text-blue-400">{data.inProgressLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-muted" />
                  Not Started
                </span>
                <span className="font-semibold text-muted-foreground">{data.notStartedLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Bookmark className="h-3 w-3" />
                  Total
                </span>
                <span className="font-semibold">{data.totalLessons}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}