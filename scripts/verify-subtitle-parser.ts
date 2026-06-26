import { buildSubtitleTrackMap, languageCodeToLabel, normalizeSubtitleLang } from '@/lib/subtitles'

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const tracks = buildSubtitleTrackMap(
  ['01 - Lesson.mp4', '02 - Other.mp4'],
  [
    '01 - Lesson.vtt',
    '01 - Lesson.en.vtt',
    '01 - Lesson.es.vtt',
    '01 - Lesson.pt-BR.srt',
    '02 - Other.ja.vtt',
    'unrelated.en.vtt',
  ],
  (fileName) => `Course/Module/${fileName}`
)

const lessonTracks = tracks.get('01 - Lesson') || []
assert(lessonTracks.length === 4, `expected 4 subtitle tracks for 01 - Lesson, got ${lessonTracks.length}`)
assert(lessonTracks[0].lang === 'en', 'legacy subtitle should become default English track')
assert(lessonTracks[0].isDefault === true, 'first/default English track should be default')
assert(lessonTracks.some(track => track.lang === 'es' && track.label === 'Spanish'), 'Spanish track missing')
assert(lessonTracks.some(track => track.lang === 'pt-BR' && track.label === 'Portuguese (Brazil)'), 'pt-BR track missing')

const otherTracks = tracks.get('02 - Other') || []
assert(otherTracks.length === 1, `expected 1 subtitle track for 02 - Other, got ${otherTracks.length}`)
assert(otherTracks[0].lang === 'ja' && otherTracks[0].label === 'Japanese', 'Japanese track missing')

assert(normalizeSubtitleLang('PT-br') === 'pt-BR', 'pt-BR normalization failed')
assert(languageCodeToLabel('fil') === 'Filipino', 'Filipino label failed')
assert(!tracks.has('unrelated'), 'unrelated subtitle should not create a track group')

console.log('subtitle parser verification passed')
