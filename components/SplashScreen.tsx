'use client'

import * as React from 'react'

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [visible, setVisible] = React.useState(true)
  const [logoScale, setLogoScale] = React.useState(0.8)
  const [textOpacity, setTextOpacity] = React.useState(0)
  const onCompleteRef = React.useRef(onComplete)

  onCompleteRef.current = onComplete

  React.useEffect(() => {
    let mounted = true

    // Animation sequence
    const timer = setTimeout(() => {
      if (!mounted) return
      setLogoScale(1)
      setTextOpacity(1)

      setTimeout(() => {
        if (!mounted) return
        setVisible(false)
        onCompleteRef.current()
      }, 800)
    }, minDuration)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [minDuration])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      style={{ backgroundColor: 'var(--background)' }}
      role="img"
      aria-label="OfflineAcademy loading"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo - using favicon.ico */}
        <div
          className="relative"
          style={{
            transform: `scale(${logoScale})`,
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <img
            src="/favicon16x16.ico"
            alt="OfflineAcademy"
            className="w-28 h-28 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* App name */}
        <div
          className="text-center"
          style={{
            opacity: textOpacity,
            transition: 'opacity 0.4s ease 0.2s',
          }}
        >
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            OfflineAcademy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your Personal Offline Learning Center</p>
        </div>

        {/* Loading indicator */}
        <div
          className="w-48 h-1.5 bg-muted rounded-full overflow-hidden"
          style={{
            opacity: textOpacity,
            transition: 'opacity 0.4s ease 0.4s',
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-primary via-emerald-400 to-primary rounded-full animate-pulse"
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </div>
  )
}
