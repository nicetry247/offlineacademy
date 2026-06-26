'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, Keyboard, MousePointer, Monitor, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutItem {
  key: string
  description: string
}

const shortcuts: ShortcutItem[] = [
  { key: 'Space / K', description: 'Play / Pause' },
  { key: 'J / ←', description: 'Rewind 10s' },
  { key: 'L / →', description: 'Forward 30s' },
  { key: '↑ / ↓', description: 'Volume Up / Down' },
  { key: 'M', description: 'Mute / Unmute' },
  { key: 'F', description: 'Toggle Fullscreen' },
  { key: ', / [', description: 'Decrease speed' },
  { key: '. / ]', description: 'Increase speed' },
  { key: '0-9', description: 'Seek to 0%-90%' },
  { key: 'P / I', description: 'Toggle Picture-in-Picture' },
  { key: 'Esc', description: 'Close overlay / exit fullscreen / exit PiP' },
  { key: '?', description: 'Show / Hide This Overlay' },
]

export function KeyboardShortcutsOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <kbd className="flex items-center gap-1 px-2.5 py-1 bg-muted border rounded text-sm font-mono text-muted-foreground min-w-[90px] text-center">
                {item.key.split(' / ').map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-xs text-muted-foreground/50">/</span>}
                    <span>{k.trim()}</span>
                  </React.Fragment>
                ))}
              </kbd>
              <span className="text-sm flex-1 text-foreground">{item.description}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded">?</kbd> anywhere to toggle</span>
        </div>
      </div>
    </div>,
    document.body
  )
}