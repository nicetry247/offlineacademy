'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Loader2, HelpCircle, PictureInPicture2, Check } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { KeyboardShortcutsOverlay } from '@/components/KeyboardShortcutsOverlay'

interface VideoSubtitleTrack {
  src: string
  srcLang: string
  label: string
  default?: boolean
}

interface VideoPlayerProps {
  src: string
  poster?: string
  subtitles?: VideoSubtitleTrack[]
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onProgressSave?: (time: number) => void
  initialTime?: number
  autoPlay?: boolean
  seekRequest?: { time: number; nonce: number } | null
}

export function VideoPlayer({
  src,
  poster,
  subtitles,
  onTimeUpdate,
  onEnded,
  onProgressSave,
  initialTime = 0,
  autoPlay = true,
  seekRequest = null,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const playbackRates = [0.75, 1, 1.25, 1.5, 2]
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isPiPSupported, setIsPiPSupported] = useState(false)
  const [isPiPActive, setIsPiPActive] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<{ time: number; x: number } | null>(null)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | 'off'>(() => {
    const defaultIndex = subtitles?.findIndex(track => track.default) ?? -1
    return defaultIndex >= 0 ? defaultIndex : 'off'
  })
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const progressSaveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const hasAutoPlayedRef = useRef(false)

  const formatTimeDisplay = (seconds: number) => formatTime(seconds)

  useEffect(() => {
    if (autoPlay && videoRef.current && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch(() => {
            // Auto-play failed (browser policy), user must tap to play
            setIsPlaying(false)
            hasAutoPlayedRef.current = false // Allow retry on user interaction
          })
      }
    }
  }, [autoPlay])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnterPiP = () => setIsPiPActive(true)
    const handleLeavePiP = () => setIsPiPActive(false)

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsPiPSupported(Boolean((document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled))
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const doc = document as Document & { pictureInPictureEnabled?: boolean; pictureInPictureElement?: Element | null }

    if (!doc.pictureInPictureEnabled) {
      window.alert('Picture-in-Picture is not supported in this browser.')
      return
    }

    try {
      if (doc.pictureInPictureElement === video) {
        await doc.exitPictureInPicture?.()
      } else {
        await video.requestPictureInPicture?.()
      }
    } catch (error) {
      console.error('Picture-in-Picture toggle failed:', error)
    }
  }, [])

  const saveProgress = useCallback((time: number) => {
    if (progressSaveTimeoutRef.current) clearTimeout(progressSaveTimeoutRef.current)
    progressSaveTimeoutRef.current = setTimeout(() => {
      onProgressSave?.(time)
    }, 500)
  }, [onProgressSave])

  const seekToPercent = (percent: number) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = (percent / 100) * duration
      setCurrentTime(videoRef.current.currentTime)
      saveProgress(videoRef.current.currentTime)
    }
  }

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const hoverTime = percent * duration
      setHoverProgress({ time: hoverTime, x: e.clientX - rect.left })
    }
  }, [duration])

  const handleProgressLeave = useCallback(() => {
    setHoverProgress(null)
  }, [])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = percent * duration
      setCurrentTime(videoRef.current.currentTime)
      saveProgress(videoRef.current.currentTime)
    }
  }, [duration, saveProgress])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      const video = videoRef.current

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case '?':
          if (e.shiftKey) {
            e.preventDefault()
            setShowShortcuts(prev => !prev)
          }
          break
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'j':
        case 'ArrowLeft':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 10)
          saveProgress(video.currentTime)
          break
        case 'l':
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 30)
          saveProgress(video.currentTime)
          break
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          setVolume(video.volume)
          setIsMuted(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          setVolume(video.volume)
          if (video.volume === 0) setIsMuted(true)
          break
        case 'm':
          if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
          }
          break
        case 'f':
          if (videoRef.current) {
            if (!isFullscreen) {
              videoRef.current.requestFullscreen()
            } else {
              document.exitFullscreen()
            }
          }
          break
        case 'p':
        case 'i':
          e.preventDefault()
          togglePictureInPicture()
          break
        case 'Escape':
          e.preventDefault()
          if (showShortcuts) {
            setShowShortcuts(false)
            break
          }
          if (document.fullscreenElement) {
            document.exitFullscreen()
            break
          }
          if (isPiPActive) {
            togglePictureInPicture()
          }
          break
        case ',':
        case '[':
          video.playbackRate = Math.max(0.25, video.playbackRate - 0.25)
          setPlaybackRate(video.playbackRate)
          break
        case '.':
        case ']':
          video.playbackRate = Math.min(2, video.playbackRate + 0.25)
          setPlaybackRate(video.playbackRate)
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          seekToPercent(parseInt(e.key) * 10)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, isMuted, isFullscreen, saveProgress, duration, seekToPercent, togglePictureInPicture, showShortcuts, isPiPActive])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      if (initialTime > 0) {
        videoRef.current.currentTime = initialTime
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)
      saveProgress(time)
    }
  }

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    onEnded?.()
  }

  const handlePlay = () => setIsPlaying(true)

  const handlePause = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime)
    }
  }

  const handleVolumeChangeNative = () => {
    if (videoRef.current) {
      setVolume(videoRef.current.volume)
      setIsMuted(videoRef.current.muted)
    }
  }

  const handleRateChange = () => {
    if (videoRef.current) {
      setPlaybackRate(videoRef.current.playbackRate)
    }
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (videoRef.current && initialTime > 0 && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = initialTime
      // Allow auto-play attempt again when seeking to saved position
      hasAutoPlayedRef.current = false
    }
  }, [initialTime])

  useEffect(() => {
    if (!videoRef.current || !seekRequest) return

    const nextTime = Math.max(0, seekRequest.time)
    videoRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
    saveProgress(nextTime)

    videoRef.current.play().catch(() => {})
  }, [seekRequest?.nonce, saveProgress])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      if (progressSaveTimeoutRef.current) clearTimeout(progressSaveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsMenu])

  useEffect(() => {
    const defaultIndex = subtitles?.findIndex(track => track.default) ?? -1
    setSelectedSubtitle(defaultIndex >= 0 ? defaultIndex : 'off')
  }, [subtitles])

  useEffect(() => {
    const textTracks = videoRef.current?.textTracks
    if (!textTracks) return

    for (let index = 0; index < textTracks.length; index += 1) {
      textTracks[index].mode = selectedSubtitle === index ? 'showing' : 'disabled'
    }
  }, [selectedSubtitle, subtitles])

  return (
    <div
      className="video-player-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="relative w-full h-full" style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onProgress={handleProgress}
          onEnded={handleEnded}
          onPlay={handlePlay}
          onPause={handlePause}
          onVolumeChange={handleVolumeChangeNative}
          onRateChange={handleRateChange}
          onClick={togglePlay}
          className="w-full h-full cursor-pointer"
        >
          {subtitles?.map((track, index) => (
            <track
              key={`${track.srcLang}-${track.src}`}
              kind="subtitles"
              src={track.src}
              srcLang={track.srcLang}
              label={track.label}
              default={selectedSubtitle === index}
            />
          ))}
        </video>
      </div>

      {videoRef.current && videoRef.current.readyState < 2 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-200',
          showControls || isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-3 mb-2 relative">
          <span className="text-xs text-white font-mono w-12 text-right">
            {formatTimeDisplay(currentTime)}
          </span>
          <div
            className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative"
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
            onClick={handleProgressClick}
          >
            {buffered > 0 && duration > 0 && (
              <div
                className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />
            )}
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-none"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            {hoverProgress && (
              <div
                className="absolute bottom-full left-0 mb-2 transform -translate-x-1/2 transition-opacity duration-100 opacity-100 pointer-events-none z-20"
                style={{ left: `${(hoverProgress.x / (duration > 0 ? 1 : 1)) * 100}%` }}
              >
                <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {formatTimeDisplay(hoverProgress.time)}
                </div>
                <div className="w-0 h-0 border-4 border-t-black/90 border-r-transparent border-l-transparent border-b-transparent mt-1" />
              </div>
            )}
          </div>
          <span className="text-xs text-white font-mono w-12">
            {formatTimeDisplay(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => videoRef.current && (videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10))}
              aria-label="Rewind 10s"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => videoRef.current && (videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 30))}
              aria-label="Forward 30s"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 relative">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted
                    setIsMuted(!isMuted)
                  }
                }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value)
                  if (videoRef.current) {
                    videoRef.current.volume = vol
                    setVolume(vol)
                    setIsMuted(vol === 0)
                  }
                }}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none accent-primary cursor-pointer"
                aria-label="Volume"
              />
            </div>

            {/* Fullscreen - FIRST */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={async () => {
                if (videoRef.current) {
                  if (!isFullscreen) {
                    try {
                      await videoRef.current.requestFullscreen({ navigationUI: 'hide' })
                    } catch {
                      videoRef.current.requestFullscreen()
                    }
                  } else {
                    document.exitFullscreen()
                  }
                }
              }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>

            {/* Picture-in-Picture */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/20',
                isPiPActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              onClick={togglePictureInPicture}
              disabled={!isPiPSupported}
              aria-label={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
              title={isPiPSupported ? 'Toggle Picture-in-Picture (I)' : 'Picture-in-Picture not supported'}
            >
              <PictureInPicture2 className="h-5 w-5" />
            </Button>

            {/* Settings Menu (3-dot) - Speed + Shortcuts */}
            <div className="relative" ref={settingsMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                aria-label="Settings"
                aria-expanded={showSettingsMenu}
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </Button>

              {showSettingsMenu && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-52 glass-card-elevated rounded-lg p-2 shadow-xl border border-white/10 animate-in zoom-in-95 z-20"
                  role="menu"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">Speed</div>
                  {playbackRates.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.playbackRate = rate
                        }
                        setPlaybackRate(rate)
                        setShowSettingsMenu(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/10 rounded ${playbackRate === rate ? 'bg-primary/20 text-primary' : ''}`}
                      role="menuitemradio"
                      aria-checked={playbackRate === rate}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                  {subtitles && subtitles.length > 0 && (
                    <>
                      <hr className="border-white/10 my-1" />
                      <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">Subtitles</div>
                      <button
                        onClick={() => {
                          setSelectedSubtitle('off')
                          setShowSettingsMenu(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/10 rounded ${selectedSubtitle === 'off' ? 'bg-primary/20 text-primary' : ''}`}
                        role="menuitemradio"
                        aria-checked={selectedSubtitle === 'off'}
                      >
                        <span>Off</span>
                        {selectedSubtitle === 'off' && <Check className="h-4 w-4" />}
                      </button>
                      {subtitles.map((track, index) => (
                        <button
                          key={`${track.srcLang}-${track.src}`}
                          onClick={() => {
                            setSelectedSubtitle(index)
                            setShowSettingsMenu(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/10 rounded ${selectedSubtitle === index ? 'bg-primary/20 text-primary' : ''}`}
                          role="menuitemradio"
                          aria-checked={selectedSubtitle === index}
                        >
                          <span className="truncate">{track.label}</span>
                          {selectedSubtitle === index && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))}
                    </>
                  )}
                  <hr className="border-white/10 my-1" />
                  <button
                    onClick={() => setShowShortcuts(true)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/10 rounded"
                    role="menuitem"
                  >
                    <span>Keyboard Shortcuts</span>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <hr className="border-white/10 my-1" />
                  <button
                    onClick={() => setShowSettingsMenu(false)}
                    className="w-full flex items-center justify-center px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded"
                    role="menuitem"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <KeyboardShortcutsOverlay isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}