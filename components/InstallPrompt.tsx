'use client'

import * as React from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstallPromptProps {
  onDismiss: () => void
  onInstall: () => void
}

export function InstallPrompt({ onDismiss, onInstall }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = React.useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false)

  React.useEffect(() => {
    // Check if iOS
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua)
    setIsIOS(isIOSDevice)

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    if (isStandalone || isInWebAppiOS) {
      onDismiss()
      return
    }

    // Check if dismissed before
    const dismissed = localStorage.getItem('offlineacademy-install-dismissed')
    if (dismissed) {
      onDismiss()
      return
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [onDismiss])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('offlineacademy-install-dismissed', 'true')
        onDismiss()
      }
      setDeferredPrompt(null)
    } else {
      // iOS - show instructions
      setShowIOSInstructions(true)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('offlineacademy-install-dismissed', 'true')
    onDismiss()
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 sm:max-w-md z-50 animate-slide-up">
        <div className="glass-card-elevated rounded-xl p-4 shadow-xl border border-white/10">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">Install on iOS</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the <strong>Share button</strong> (square with arrow up) in Safari,
                then scroll down and tap <strong>"Add to Home Screen"</strong>.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowIOSInstructions(false)}>
                  Got it
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 sm:max-w-md z-50 animate-slide-up">
      <div className="glass-card-elevated rounded-xl p-4 shadow-xl border border-white/10">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">Install OfflineAcademy</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add to home screen for offline access, faster loads, and app-like experience.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleInstall} className="gap-1">
                <Download className="h-4 w-4" />
                Install
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
