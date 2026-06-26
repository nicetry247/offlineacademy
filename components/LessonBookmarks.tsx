'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkPlus, Clock, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatTime } from '@/lib/utils'

export type LessonBookmark = {
  id: string
  lessonId: string
  courseId: string
  moduleId: string
  position: number
  note: string
  createdAt: string
  updatedAt: string
  lesson: {
    id: string
    title: string
    slug: string
  }
}

interface LessonBookmarksProps {
  lessonId: string
  courseId: string
  moduleId: string
  currentTime: number
  onJumpToTime: (time: number) => void
  isVideo?: boolean
}

function formatSavedAt(isoDate: string) {
  const date = new Date(isoDate)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function LessonBookmarks({
  lessonId,
  courseId,
  moduleId,
  currentTime,
  onJumpToTime,
  isVideo = true,
}: LessonBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<LessonBookmark[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedBookmarks = useMemo(
    () => [...bookmarks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    [bookmarks]
  )

  const fetchBookmarks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/bookmarks?lessonId=' + lessonId)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch bookmarks')
      }

      setBookmarks(data.items || [])
    } catch (fetchError) {
      console.error('Failed to fetch bookmarks:', fetchError)
      setError('Could not load bookmarks. The notebook page got smudged.')
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])

  const handleSave = async () => {
    if (!isVideo) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          courseId,
          moduleId,
          position: Math.max(0, Math.floor(currentTime)),
          note,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save bookmark')
      }

      setBookmarks(prev => [data.bookmark, ...prev])
      setNote('')
    } catch (saveError) {
      console.error('Failed to create bookmark:', saveError)
      setError('Could not save bookmark. The pen ran out of cosmic ink.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId)
    setError(null)

    try {
      const response = await fetch('/api/bookmarks/' + bookmarkId, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete bookmark')
      }

      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId))
    } catch (deleteError) {
      console.error('Failed to delete bookmark:', deleteError)
      setError('Could not delete bookmark. The eraser bounced off the desk.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="border-white/10 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4 text-primary" />
          Lesson Bookmarks
        </CardTitle>
        <CardDescription>
          Save a timestamp and note for this lesson so you can jump back to the exact spot later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isVideo && (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
            Time-based bookmarks are available on video lessons.
          </div>
        )}

        {isVideo && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Current time: {formatTime(Math.max(0, Math.floor(currentTime)))}
              </span>
              <Button type="button" size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
                <BookmarkPlus className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save bookmark'}
              </Button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about why this timestamp matters..."
              className="min-h-[92px] resize-none bg-background/80"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Tip: keep it short and searchable — a command name, bug, or concept works great.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Saved bookmarks</h4>
            <span className="text-xs text-muted-foreground">{sortedBookmarks.length} total</span>
          </div>

          {loading ? (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-muted-foreground">
              Loading bookmarks...
            </div>
          ) : sortedBookmarks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-4 text-sm text-muted-foreground">
              No bookmarks yet. Save your first “aha!” moment.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBookmarks.map(bookmark => (
                <div key={bookmark.id} className="rounded-lg border border-white/10 bg-background/60 p-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onJumpToTime(bookmark.position)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      aria-label={`Jump to ${formatTime(bookmark.position)}`}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      {formatTime(bookmark.position)}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {bookmark.note || 'No note added'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Saved {formatSavedAt(bookmark.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(bookmark.id)}
                      disabled={deletingId === bookmark.id}
                      aria-label="Delete bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
