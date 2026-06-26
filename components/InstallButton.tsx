'use client'

import * as React from 'react'
import { Download, Smartphone, Monitor, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function InstallButton({ 
  variant = 'ghost', 
  size = 'icon', 
  className = '',
  ...props 
}: { variant?: 'default' | 'ghost' | 'outline'; size?: 'sm' | 'icon'; className?: string }) {
  const [showInstructions, setShowInstructions] = React.useState(false)
  const [platform, setPlatform] = React.useState<'android' | 'ios' | 'desktop' | 'unknown'>('unknown')
  const [swDiagnostic, setSwDiagnostic] = React.useState<{
    controlling: boolean
    swVersion?: string
    error?: string
  } | null>(null)
  const [checkingSW, setCheckingSW] = React.useState(false)

  React.useEffect(() => {
    const ua = navigator.userAgent
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    
    if (isStandalone || isInWebAppiOS) return

    if (/iPad|iPhone|iPod/.test(ua)) setPlatform('ios')
    else if (/Android/.test(ua)) setPlatform('android')
    else setPlatform('desktop')
  }, [])

  const checkSW = async () => {
    setCheckingSW(true)
    try {
      if (!('serviceWorker' in navigator)) {
        setSwDiagnostic({ controlling: false, error: 'Service Workers not supported' })
        return
      }

      // First, unregister all old SWs to force fresh registration
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        if (reg.active?.scriptURL.includes('sw.js') && !reg.active.scriptURL.includes('v=3')) {
          await reg.unregister()
          console.log('Unregistered old SW:', reg.scope)
        }
      }

      // Register fresh
      const reg = await navigator.serviceWorker.register('/sw.js?v=3', { updateViaCache: 'none' })
      await reg.update()
      
      const controlling = !!navigator.serviceWorker.controller
      let swVersion = 'unknown'

      try {
        const res = await fetch('/sw.js?v=3')
        const text = await res.text()
        const match = text.match(/version\s+(\d+)/i) || text.match(/v(\d+)/i)
        if (match) swVersion = match[1]
      } catch {}

      setSwDiagnostic({ controlling, swVersion })
    } catch (err) {
      setSwDiagnostic({ controlling: false, error: String(err) })
    } finally {
      setCheckingSW(false)
    }
  }

  React.useEffect(() => {
    checkSW()
  }, [])

  const handleClick = () => setShowInstructions(true)

  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

  if (isInstalled) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled {...props}>
        <Download className="h-4 w-4 opacity-50" />
      </Button>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleClick}
          aria-label="Install OfflineAcademy"
          {...props}
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* SW Status Indicator */}
        <Button
          variant="ghost"
          size="icon"
          className="header-control"
          onClick={checkSW}
          disabled={checkingSW}
          aria-label="Check Service Worker status"
        >
          {checkingSW ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : swDiagnostic?.controlling ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-400" />
          )}
        </Button>
      </div>

      {/* Diagnostic Tooltip */}
      {swDiagnostic && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 glass-card-elevated rounded-lg p-3 shadow-xl border border-white/10 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">SW Diagnostic</h4>
            <Button variant="ghost" size="icon" onClick={() => setSwDiagnostic(null)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span>Service Worker: <strong>Registered</strong></span>
            </div>
            <div className={`flex items-center gap-2 ${swDiagnostic.controlling ? 'text-green-400' : 'text-red-400'}`}>
              {swDiagnostic.controlling ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              <span>Controlling page: <strong>{swDiagnostic.controlling ? 'YES ✓' : 'NO ✗'}</strong></span>
            </div>
            {swDiagnostic.swVersion && (
              <div className="text-muted-foreground">Version: {swDiagnostic.swVersion}</div>
            )}
            {swDiagnostic.error && (
              <div className="text-red-400">Error: {swDiagnostic.error}</div>
            )}
            {!swDiagnostic.controlling && (
              <div className="text-amber-400 mt-2 text-xs">
                If controlling=NO: refresh page, or check Brave Shields (lion icon → OFF)
              </div>
            )}
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInstructions(false)} />
          <div className="relative w-full max-w-sm glass-card-elevated rounded-xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-lg">Install OfflineAcademy</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowInstructions(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            {platform === 'android' && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  On <strong>Android (Chrome/Brave/Edge)</strong>, use the browser menu:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Chrome / Edge</p>
                      <p className="text-xs text-muted-foreground">Menu (⋮ top-right) → <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                    <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Brave Browser</p>
                      <p className="text-xs text-muted-foreground">Menu (⋮ bottom-right) → <strong>"Install app"</strong><br/>
                        <span className="text-xs text-amber-400">If missing: Shields OFF (lion icon) → reload</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {platform === 'ios' && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  On <strong>iOS (Safari)</strong>, use the Share button:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <ol className="space-y-1 text-xs">
                      <li>Tap <strong>Share button</strong> (square with arrow up) at bottom</li>
                      <li>Scroll down, tap <strong>"Add to Home Screen"</strong></li>
                      <li>Tap <strong>"Add"</strong> top-right</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  On <strong>Desktop (Chrome/Edge)</strong>:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Chrome</p>
                      <p className="text-xs text-muted-foreground">Menu (⋮ top-right) → <strong>"Install OfflineAcademy"</strong> or <strong>"Install app"</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Edge</p>
                      <p className="text-xs text-muted-foreground">Menu (⋮ top-right) → <strong>"Apps"</strong> → <strong>"Install this site as an app"</strong></p>
                    </div>
                  </div>
                  <div className="text-xs text-amber-400">
                    Creates Start Menu shortcut (Windows) / Applications folder (Mac)
                  </div>
                </div>
              </div>
            )}

            {platform === 'unknown' && (
              <p className="text-sm text-muted-foreground text-center">
                Open in Chrome/Edge/Safari/Brave for install options
              </p>
            )}

            <Button className="w-full mt-4" onClick={() => setShowInstructions(false)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}