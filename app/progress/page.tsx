import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Gauge,
  HelpCircle,
  Keyboard,
  Layers,
  Laptop,
  Package,
  PictureInPicture2,
  Play,
  ShieldCheck,
  Smartphone,
  Tag,
  Upload,
  Zap,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Progress',
  description: 'Internal product status board for OfflineAcademy.',
}

type Status = 'Live' | 'Planned' | 'Future'

type FeatureGroup = {
  title: string
  status: Status
  icon: ComponentType<{ className?: string }>
  items: string[]
  completion: number
}

type RoadmapItem = {
  label: string
  done: boolean
}

type RoadmapPhase = {
  phase: string
  title: string
  items: RoadmapItem[]
  completion: number
}

const liveGroups: FeatureGroup[] = [
  {
    title: 'Library & Scanning',
    status: 'Live',
    icon: Database,
    completion: 100,
    items: [
      'Recursive scan of a local course root directory',
      'Course, module, and lesson discovery',
      'Natural sort for lesson ordering',
      'Folder-driven import with local file access',
    ],
  },
  {
    title: 'Playback & Resume',
    status: 'Live',
    icon: Play,
    completion: 100,
    items: [
      'Lesson playback inside the app',
      'Continue Watching and resume playback',
      'Auto-next / playback flow support',
      'Native HTML5 video player for speed and simplicity',
    ],
  },
  {
    title: 'Playback Enhancements',
    status: 'Live',
    icon: Zap,
    completion: 100,
    items: [
      'Variable playback speed (0.75x, 1x, 1.25x, 1.5x, 2.0x)',
      'Global keyboard shortcuts (play/pause, seek, mute, fullscreen, speed, PiP, Escape)',
      'Picture-in-Picture toggle',
    ],
  },
  {
    title: 'Learning Tools',
    status: 'Live',
    icon: Bookmark,
    completion: 100,
    items: [
      'Bookmarks with timestamp notes',
      'Jump-to-time bookmark playback',
      'Multi-language subtitle tracks for .vtt/.srt files',
      'Inline document viewing for lessons',
    ],
  },
  {
    title: 'Course Management',
    status: 'Live',
    icon: ShieldCheck,
    completion: 100,
    items: [
      'Persistent rename titles',
      'Delete from library',
      'Delete from disk',
      'Archived/hidden courses stay hidden on rescans',
    ],
  },
  {
    title: 'Progress Tracking UI',
    status: 'Live',
    icon: Gauge,
    completion: 100,
    items: [
      'Progress bars on course cards',
      'Lesson/module manual Done toggles',
      'Local analytics dashboard (`/analytics`) with watch time, completion rates, weekly activity',
    ],
  },
  {
    title: 'Built-in Quiz Interactivity',
    status: 'Live',
    icon: HelpCircle,
    completion: 100,
    items: [
      'Quiz settings: Auto-Fetch toggle + QuizAPI / The Trivia API source selector',
      'QuizPlayer: intro, active questions, results, 80% pass mark, ⚙️ Edit Topic override',
      'Auto-fetch writes quiz_cache.json to module folders on module open',
      'Scanner injects Quiz lesson type (🟣) into module sidebar',
      'Quiz, Question, QuizAttempt models; score/passed tracked; green checkmark on completion',
    ],
  },
  {
    title: 'Library Organization',
    status: 'Live',
    icon: Tag,
    completion: 100,
    items: [
      'Custom tags & categories with color (Tag + CourseTag models)',
      'Filter by tag, favorites, in-progress, completed, not-started',
      'Sort by name, progress %, updatedAt; favorites pinned to top',
    ],
  },
  {
    title: 'Content Types & Thumbnails',
    status: 'Live',
    icon: FileText,
    completion: 100,
    items: [
      'PDF, TXT, MD, HTML, and JSON inline preview',
      'Local thumbnail support',
      'Safer thumbnail lookup to reduce broken image noise',
      'Watch-page rendering for mixed lesson types',
    ],
  },
  {
    title: 'Settings & Data Model',
    status: 'Live',
    icon: Laptop,
    completion: 100,
    items: [
      'Configured course root directory',
      'SQLite + Prisma local persistence',
      'Progress and bookmark tables',
      'No login, no accounts, no cloud storage',
    ],
  },
]

const roadmapPhases: RoadmapPhase[] = [
  {
    phase: 'Phase 5',
    title: 'Data Portability',
    completion: 0,
    items: [
      { label: 'Export local state to JSON (progress, bookmarks, notes, tags, course metadata, quiz attempts)', done: false },
      { label: 'Import and restore JSON state safely', done: false },
    ],
  },
]

const futureIdeas = [
  {
    title: 'Reset Course',
    icon: Gauge,
    note: 'Clear progress and start a course from zero.',
  },
  {
    title: 'Mobile App Wrapper',
    icon: Smartphone,
    note: 'Lightweight mobile wrapper or app packaging layer.',
  },
  {
    title: 'Import / Export Course Metadata',
    icon: Package,
    note: 'Move course metadata in and out without touching core progress state.',
  },
]

const stackBadges = [
  'Next.js 14',
  'React',
  'TypeScript',
  'Tailwind',
  'shadcn/ui',
  'Prisma',
  'SQLite',
  'Native Video',
]

const currentCompletion = Math.round((liveGroups.filter((group) => group.completion === 100).length / liveGroups.length) * 100)

export default function ProgressPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl">
        <section className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Internal route
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Local-only
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Fast stack
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3 text-gradient-primary">
                OfflineAcademy Progress
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                A private status board for the app’s live features, roadmap, and future ideas.
                This page is intentionally not linked from the dashboard — it’s an internal route
                you can visit directly at <code className="bg-muted px-1.5 py-0.5 rounded">/progress</code>.
              </p>

              <div className="flex flex-wrap gap-2 mt-5">
                {stackBadges.map((item) => (
                  <Badge key={item} variant="outline" className="bg-secondary/60">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="w-full lg:w-[360px] glass-card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gauge className="h-5 w-5 text-primary" />
                  Current Build Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Live core complete</span>
                    <span className="font-semibold text-primary">{currentCompletion}%</span>
                  </div>
                  <Progress value={currentCompletion} className="h-3 gradient-progress" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/5 bg-secondary/30 p-3">
                    <div className="text-muted-foreground">Live feature groups</div>
                    <div className="text-2xl font-bold mt-1">{liveGroups.length}</div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-secondary/30 p-3">
                    <div className="text-muted-foreground">Roadmap phases</div>
                    <div className="text-2xl font-bold mt-1">{roadmapPhases.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                What’s Live Today
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {liveGroups.map((group) => {
                const Icon = group.icon
                return (
                  <div key={group.title} className="rounded-xl border border-white/5 bg-secondary/30 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-semibold">{group.title}</h3>
                          <p className="text-xs text-muted-foreground">{group.status}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{group.completion}%</Badge>
                    </div>
                    <Progress value={group.completion} className="h-2 gradient-progress" />
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="glass-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Layers className="h-5 w-5 text-accent" />
                Roadmap Phases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roadmapPhases.map((phase) => (
                <div key={phase.title} className="rounded-xl border border-white/5 bg-secondary/30 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{phase.phase}</div>
                      <h3 className="font-semibold text-lg">{phase.title}</h3>
                    </div>
                    <Badge variant="outline">{phase.completion}%</Badge>
                  </div>
                  <Progress value={phase.completion} className="h-2 gradient-progress-accent" />
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {phase.items.map((item) => (
                      <li key={item.label} className="flex gap-2">
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        )}
                        <span className={item.done ? 'text-foreground' : ''}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Tag className="h-5 w-5 text-primary" />
                Future Ideas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {futureIdeas.map((idea) => {
                const Icon = idea.icon
                return (
                  <div key={idea.title} className="rounded-xl border border-white/5 bg-secondary/25 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="font-semibold">{idea.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{idea.note}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="h-5 w-5 text-primary" />
                Product Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />No authentication, no accounts, no user profiles.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Everything stays local: folder scanning, SQLite, and file serving.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />The app is built to stay fast as more courses are added.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />This route is a direct internal progress page, not a dashboard menu item.</p>
              <div className="pt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Playback speed & shortcuts: Live</Badge>
                <Badge variant="secondary" className="gap-1.5"><PictureInPicture2 className="h-3.5 w-3.5" />PiP: Live</Badge>
                <Badge variant="secondary" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" />Quizzes: Live</Badge>
                <Badge variant="secondary" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export planned</Badge>
                <Badge variant="secondary" className="gap-1.5"><Upload className="h-3.5 w-3.5" />Import planned</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

