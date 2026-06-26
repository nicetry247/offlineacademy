'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Play, 
  Clock as ClockIcon
} from 'iconoir-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatTime } from '@/lib/utils'
import { getCourseDisplayName } from '@/lib/course-display'

interface ContinueWatchingCardProps {
  item: {
    lesson: {
      id: string
      title: string
      type: string
      duration: number | null
      thumbnail: string | null
    }
    progress: {
      position: number
      lastWatched: string
    }
    course: {
      name: string
      slug: string
    }
    module: {
      name: string
    }
  }
  index: number
}

export function ContinueWatchingCard({ item, index }: ContinueWatchingCardProps) {
  const { lesson, progress, course, module } = item
  const courseTitle = getCourseDisplayName(course)
  const percentage = lesson.duration && progress.position
    ? Math.min(100, (progress.position / lesson.duration) * 100)
    : 0

  // Determine video thumbnail style based on course/module
  const getThumbClass = () => {
    const name = (courseTitle + ' ' + module.name).toLowerCase()
    if (name.includes('linux') || name.includes('terraform') || name.includes('shell')) return 'video-thumb-linux'
    if (name.includes('code') || name.includes('program') || name.includes('javascript') || name.includes('python')) return 'video-thumb-code'
    if (name.includes('automat') || name.includes('workflow') || name.includes('n8n')) return 'video-thumb-flow'
    return 'video-thumb-presenter'
  }

  return (
    <Link
      href={`/watch/${lesson.id}?course=${course.slug}`}
      key={`${lesson.id}-${index}`}
      className="flex-none w-72 sm:w-80 snap-start group"
    >
      <Card className="glass-card-elevated h-full overflow-hidden transition-all hover:shadow-[0_0_30px_-10px_hsl(160_100%_42%_/_0.25)] group">
        {/* Video Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          <div className={`video-thumb ${getThumbClass()} w-full h-full transition-transform duration-500 group-hover:scale-[1.02]`} />
          
          {/* Duration badge */}
          {lesson.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-xs font-medium text-white">
              {formatTime(lesson.duration)}
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="relative w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center text-accent-foreground hover:scale-110 hover:bg-accent transition-all duration-300" aria-label="Resume">
              <Play className="h-7 w-7 ml-1" />
              <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse" />
            </button>
          </div>

          {/* Progress bar overlay */}
          {progress.position && lesson.duration && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1 truncate">{courseTitle}</p>
          <h3 className="font-medium text-sm mb-2 line-clamp-1 text-foreground group-hover:text-primary transition-colors">{lesson.title}</h3>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {lesson.duration
                ? `${formatTime(progress.position || 0)} / ${formatTime(lesson.duration)}`
                : formatTime(progress.position || 0)}
            </span>
            {lesson.duration && (
              <Progress
                value={percentage}
                className="h-1.5 flex-1 gradient-progress"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface ContinueWatchingSectionProps {
  items: Array<{
    lesson: {
      id: string
      title: string
      type: string
      duration: number | null
      thumbnail: string | null
    }
    progress: {
      position: number
      lastWatched: string
    }
    course: {
      name: string
      slug: string
    }
    module: {
      name: string
    }
  }>
}

export function ContinueWatchingSection({ items }: ContinueWatchingSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="mb-10" aria-labelledby="continue-watching-heading">
      <div className="flex items-center justify-between mb-6">
        <h2 id="continue-watching-heading" className="text-xl font-semibold flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary" />
          </div>
          Continue Watching
        </h2>
      </div>
      
      <div className="flex gap-4 pb-4 -mx-4 px-4" style={{ scrollSnapType: 'x mandatory' }} role="list">
        {items.map((item, index) => (
          <ContinueWatchingCard key={`${item.lesson.id}-${index}`} item={item} index={index} />
        ))}
      </div>
    </section>
  )
}