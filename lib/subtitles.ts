import { basename, extname } from 'path'

export type SubtitleFormat = 'vtt' | 'srt'

export type SubtitleTrackInput = {
  src: string
  lang: string
  label: string
  format: SubtitleFormat
  isDefault: boolean
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-BR': 'Portuguese (Brazil)',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  fil: 'Filipino',
  tl: 'Tagalog',
  id: 'Indonesian',
  ms: 'Malay',
  th: 'Thai',
  vi: 'Vietnamese',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
}

export function normalizeSubtitleLang(code: string): string {
  const trimmed = code.trim().replace(/_/g, '-')
  if (!trimmed) return 'en'

  const [language, region, ...rest] = trimmed.split('-')
  const normalizedLanguage = language.toLowerCase()
  const normalizedRegion = region ? region.toUpperCase() : undefined
  const normalizedRest = rest.map(part => part.length === 2 ? part.toUpperCase() : part)

  return [normalizedLanguage, normalizedRegion, ...normalizedRest]
    .filter(Boolean)
    .join('-')
}

export function languageCodeToLabel(code: string): string {
  const normalized = normalizeSubtitleLang(code)
  if (LANGUAGE_LABELS[normalized]) return LANGUAGE_LABELS[normalized]

  const baseLanguage = normalized.split('-')[0]
  if (LANGUAGE_LABELS[baseLanguage]) {
    const region = normalized.split('-')[1]
    return region ? `${LANGUAGE_LABELS[baseLanguage]} (${region})` : LANGUAGE_LABELS[baseLanguage]
  }

  return normalized
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getSubtitleFormat(fileName: string): SubtitleFormat | null {
  const ext = extname(fileName).slice(1).toLowerCase()
  return ext === 'vtt' || ext === 'srt' ? ext : null
}

function tryExactBasename(
  videoBaseName: string,
  subtitleBaseName: string,
  src: string,
  format: SubtitleFormat
): SubtitleTrackInput | null {
  if (subtitleBaseName === videoBaseName) {
    return {
      src,
      lang: 'en',
      label: 'English',
      format,
      isDefault: true,
    }
  }
  return null
}

function tryDottedLangSuffix(
  videoBaseName: string,
  subtitleBaseName: string,
  src: string,
  format: SubtitleFormat
): SubtitleTrackInput | null {
  const languagePrefix = `${videoBaseName}.`
  if (!subtitleBaseName.startsWith(languagePrefix)) return null

  const rawLanguage = subtitleBaseName.slice(languagePrefix.length)
  if (!rawLanguage || rawLanguage.includes('/')) return null

  const lang = normalizeSubtitleLang(rawLanguage)
  return {
    src,
    lang,
    label: languageCodeToLabel(lang),
    format,
    isDefault: lang === 'en',
  }
}

function tryEmbeddedLangSegment(
  videoBaseName: string,
  subtitleBaseName: string,
  src: string,
  format: SubtitleFormat
): SubtitleTrackInput | null {
  const subtitleParts = subtitleBaseName.split('-')
  const videoParts = videoBaseName.split('-')
  if (subtitleParts.length < videoParts.length + 1) return null

  for (let index = 1; index < subtitleParts.length - 1; index += 1) {
    const candidateParts = [...subtitleParts]
    candidateParts.splice(index, 1)
    if (candidateParts.join('-') !== videoBaseName) continue

    const rawLanguage = subtitleParts[index]
    if (!rawLanguage || rawLanguage.includes('/')) continue

    const lang = normalizeSubtitleLang(rawLanguage)
    return {
      src,
      lang,
      label: languageCodeToLabel(lang),
      format,
      isDefault: lang === 'en',
    }
  }

  return null
}

export function parseSubtitleForVideo(
  videoBaseName: string,
  subtitleFileName: string,
  src: string
): SubtitleTrackInput | null {
  const format = getSubtitleFormat(subtitleFileName)
  if (!format) return null

  const subtitleBaseName = basename(subtitleFileName, extname(subtitleFileName))

  const direct = tryExactBasename(videoBaseName, subtitleBaseName, src, format)
  if (direct) return direct

  const dotted = tryDottedLangSuffix(videoBaseName, subtitleBaseName, src, format)
  if (dotted) return dotted

  const embedded = tryEmbeddedLangSegment(videoBaseName, subtitleBaseName, src, format)
  if (embedded) return embedded

  return null
}

export function buildSubtitleTrackMap(
  videoFileNames: string[],
  subtitleFileNames: string[],
  toRelativePath: (fileName: string) => string
): Map<string, SubtitleTrackInput[]> {
  const map = new Map<string, SubtitleTrackInput[]>()
  const videoBaseNames = videoFileNames.map(fileName => basename(fileName, extname(fileName)))

  for (const videoBaseName of videoBaseNames) {
    for (const subtitleFileName of subtitleFileNames) {
      const track = parseSubtitleForVideo(
        videoBaseName,
        subtitleFileName,
        toRelativePath(subtitleFileName)
      )
      if (!track) continue

      const existingTracks = map.get(videoBaseName) || []
      const duplicate = existingTracks.some(existing => existing.lang === track.lang && existing.src === track.src)
      if (!duplicate) {
        existingTracks.push(track)
      }
      map.set(videoBaseName, sortSubtitleTracks(existingTracks))
    }
  }

  return map
}

export function sortSubtitleTracks(tracks: SubtitleTrackInput[]): SubtitleTrackInput[] {
  return [...tracks].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    if (a.lang === 'en' && b.lang !== 'en') return -1
    if (b.lang === 'en' && a.lang !== 'en') return 1
    return a.label.localeCompare(b.label)
  })
}

export function convertSrtToVtt(content: string): string {
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (!normalized) return 'WEBVTT\n\n'
  if (normalized.startsWith('WEBVTT')) return normalized.endsWith('\n') ? normalized : `${normalized}\n`

  const vttBody = normalized
    .split('\n')
    .map(line => {
      if (/^\d+$/.test(line.trim())) return ''
      return line.replace(
        /(\d{2}:\d{2}:\d{2}),(\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}),(\d{3})/g,
        '$1.$2 --> $3.$4'
      )
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return `WEBVTT\n\n${vttBody}\n`
}
