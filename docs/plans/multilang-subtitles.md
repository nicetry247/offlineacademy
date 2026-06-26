# Multi-Language Subtitles Implementation Plan

> **For Hermes / future AI assistants:** Use `offlineacademy-dev`, `writing-plans`, and `test-driven-development` before implementing this plan. Implement task-by-task on branch `feature/multilang-subtitles`. Do not modify unrelated watch-page sidebar behavior, donation buttons, Docker docs, or quiz features while working on this branch.

**Goal:** Add first-class multi-language subtitle support to OfflineAcademy so one video lesson can expose multiple selectable subtitle tracks such as English, Spanish, Japanese, Filipino, Chinese, etc.

**Current State:** OfflineAcademy already detects one `.srt` or `.vtt` subtitle file whose base name exactly matches a video file, stores it in `Lesson.subtitlePath`, and renders one hardcoded English `<track>` in `components/VideoPlayer.tsx`.

**Target State:** OfflineAcademy detects multiple language-suffixed subtitle files per video, stores them as structured subtitle tracks, renders all tracks in the video player, and provides a clear subtitle selector in the existing player settings menu.

**Tech Stack:** Next.js App Router, React client components, Prisma, SQLite, native HTML video `<track>` elements, local course files served through `/api/files/[...path]`.

---

## 1. User-Facing Behavior

### Supported Folder Pattern

Preferred pattern:

```text
My_Courses/
└── Course Name/
    └── Module Name/
        ├── 01 - Lesson.mp4
        ├── 01 - Lesson.en.vtt
        ├── 01 - Lesson.es.vtt
        ├── 01 - Lesson.ja.vtt
        └── 01 - Lesson.fil.vtt
```

Also accept single-file legacy pattern:

```text
01 - Lesson.mp4
01 - Lesson.vtt
```

Legacy matching should continue to work and should be treated as English unless the implementation can confidently infer otherwise.

### Supported Extensions

- `.vtt` — preferred browser-native format.
- `.srt` — detected by scanner; should either be served as-is for compatibility or converted/proxied to VTT before being used in `<track>`.

### Language Naming Convention

Use language suffixes immediately before the subtitle extension:

```text
<video base name>.<language-code>.<subtitle extension>
```

Examples:

```text
lesson.en.vtt
lesson.es.vtt
lesson.fr.srt
lesson.zh.vtt
lesson.ja.vtt
lesson.fil.vtt
lesson.pt-BR.vtt
```

Language codes should be normalized to lowercase except region suffixes may remain readable if needed (`pt-BR`, `zh-CN`).

---

## 2. Acceptance Criteria

- A video can have more than one subtitle track.
- Scanner recognizes both legacy subtitles and language-suffixed subtitles.
- A video with `01 - Lesson.mp4`, `01 - Lesson.en.vtt`, and `01 - Lesson.es.vtt` gets two subtitle tracks.
- The watch page passes all subtitle tracks to `VideoPlayer`.
- The video player renders one `<track>` per subtitle.
- The user can choose subtitle language or turn subtitles off from the player UI.
- Existing single subtitle files still work.
- Existing watch sidebar, bookmarks, speed selector, fullscreen, PiP, and tap-to-toggle behavior are not removed or regressed.
- `npm run build` passes.
- README and scan-page folder examples document the new pattern.

---

## 3. Recommended Data Model

### Preferred Prisma Model

Add a new `SubtitleTrack` model rather than stuffing JSON into `Lesson`.

```prisma
model Lesson {
  id           String          @id @default(cuid())
  // existing fields...
  subtitlePath String?         // keep temporarily for backwards compatibility
  subtitles    SubtitleTrack[]
}

model SubtitleTrack {
  id        String   @id @default(cuid())
  lessonId  String
  src       String
  lang      String
  label     String
  format    String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([lessonId, lang, src])
  @@index([lessonId])
}
```

### Why This Model

- Keeps one lesson to many subtitle tracks cleanly represented.
- Avoids fragile JSON parsing in Prisma query results.
- Allows future features: default language preference, uploaded subtitles, generated subtitles, subtitle source/provider, etc.
- Keeps `Lesson.subtitlePath` temporarily so existing data and old code do not break during migration.

---

## 4. File-by-File Implementation Map

### Prisma / Database

Modify:

```text
prisma/schema.prisma
```

Add:

```text
SubtitleTrack model
Lesson.subtitles relation
```

Run:

```bash
npm run db:push
npx prisma generate
```

Verify:

```bash
npm run build
```

### Scanner

Modify:

```text
lib/scanner.ts
```

Current behavior:

```ts
const subtitleMap = new Map<string, string>()
subtitleMap.set(baseName, relativePath)
const subtitlePath = subtitleMap.get(baseName) || null
```

Target behavior:

```ts
type SubtitleTrackInput = {
  src: string
  lang: string
  label: string
  format: 'vtt' | 'srt'
  isDefault: boolean
}

const subtitleMap = new Map<string, SubtitleTrackInput[]>()
```

Scanner should parse:

```text
01 - Lesson.vtt       -> base: 01 - Lesson, lang: en, label: English, default: true
01 - Lesson.en.vtt    -> base: 01 - Lesson, lang: en, label: English, default: true
01 - Lesson.es.vtt    -> base: 01 - Lesson, lang: es, label: Spanish
01 - Lesson.pt-BR.vtt -> base: 01 - Lesson, lang: pt-BR, label: Portuguese (Brazil)
```

When upserting a lesson:

1. Keep setting `subtitlePath` to the first/default track for backward compatibility.
2. Delete existing subtitle tracks for the lesson.
3. Create new subtitle tracks for the detected files.

Important: do this after the lesson upsert returns the lesson ID. The current batch upsert transaction may need to be split or followed by another query.

### Utility Function

Recommended new file:

```text
lib/subtitles.ts
```

Suggested exports:

```ts
export type SubtitleTrackInput = {
  src: string
  lang: string
  label: string
  format: 'vtt' | 'srt'
  isDefault: boolean
}

export function parseSubtitleFile(videoBaseName: string, subtitleFileName: string): SubtitleTrackInput | null
export function languageCodeToLabel(code: string): string
export function normalizeSubtitleLang(code: string): string
```

This keeps scanner logic readable and testable.

### Watch Page Data Query

Modify likely files:

```text
app/watch/[lessonId]/page.tsx
app/watch/[lessonId]/WatchPageClient.tsx
```

Make sure the Prisma query includes:

```ts
subtitles: {
  orderBy: [
    { isDefault: 'desc' },
    { label: 'asc' },
  ],
}
```

Update client prop type from:

```ts
subtitlePath: string | null
```

to something like:

```ts
subtitles: Array<{
  id: string
  src: string
  lang: string
  label: string
  format: string
  isDefault: boolean
}>
```

Keep fallback behavior:

```ts
const subtitleTracks = lesson.subtitles?.length
  ? lesson.subtitles
  : lesson.subtitlePath
    ? [{ src: lesson.subtitlePath, lang: 'en', label: 'English', isDefault: true }]
    : []
```

### Video Player

Modify:

```text
components/VideoPlayer.tsx
```

Current prop:

```ts
subtitles?: string
```

Target prop:

```ts
type SubtitleTrack = {
  src: string
  srcLang: string
  label: string
  default?: boolean
}

subtitles?: SubtitleTrack[]
```

Render:

```tsx
{subtitles?.map(track => (
  <track
    key={`${track.srcLang}-${track.src}`}
    kind="subtitles"
    src={track.src}
    srcLang={track.srcLang}
    label={track.label}
    default={track.default}
  />
))}
```

Add subtitle selector inside existing settings menu:

```text
Subtitles
- Off
- English
- Spanish
- Japanese
```

Use `videoRef.current.textTracks` to control active track:

```ts
function setSubtitleTrack(index: number | 'off') {
  const tracks = videoRef.current?.textTracks
  if (!tracks) return
  for (let i = 0; i < tracks.length; i++) {
    tracks[i].mode = index === i ? 'showing' : 'disabled'
  }
}
```

Do not remove existing speed controls. Add subtitles below speed inside the same dropdown.

### File Serving

Inspect:

```text
app/api/files/[...path]/route.ts
```

Current MIME types:

```ts
srt: 'text/plain; charset=utf-8'
vtt: 'text/vtt; charset=utf-8'
```

For VTT, current behavior is fine.

For SRT, browsers may not display it reliably in `<track>`. Choose one of these approaches:

1. **Phase 1:** document `.vtt` as preferred and keep `.srt` as best-effort.
2. **Phase 2:** add an API conversion route that converts SRT to VTT on the fly.

Recommended for first implementation: implement VTT fully and keep SRT backward-compatible/best-effort unless conversion is quick and tested.

---

## 5. Detailed Task Breakdown

### Task 1: Add subtitle parsing utility

**Objective:** Create a testable helper that maps subtitle filenames to video base names and language metadata.

**Files:**

- Create: `lib/subtitles.ts`
- Create or modify tests if test setup exists. If no test harness exists, add a small script under `scripts/verify-subtitle-parser.ts`.

**Implementation notes:**

- Parse only `.srt` and `.vtt`.
- Accept legacy exact base match: `lesson.vtt` for `lesson.mp4`.
- Accept language suffix: `lesson.en.vtt`, `lesson.es.srt`.
- Reject unrelated files.

**Verification:**

```bash
npm run build
```

If script is added:

```bash
npx tsx scripts/verify-subtitle-parser.ts
```

Expected: parser examples pass.

---

### Task 2: Add Prisma subtitle model

**Objective:** Store multiple subtitle tracks per lesson.

**Files:**

- Modify: `prisma/schema.prisma`

**Steps:**

1. Add `SubtitleTrack` model.
2. Add `subtitles SubtitleTrack[]` relation to `Lesson`.
3. Keep `subtitlePath String?` for backward compatibility.
4. Run:

```bash
npm run db:push
npx prisma generate
npm run build
```

**Expected:** Prisma client builds successfully and app compiles.

---

### Task 3: Update scanner to detect multiple subtitle tracks

**Objective:** Replace single `subtitleMap` with many subtitle tracks per video.

**Files:**

- Modify: `lib/scanner.ts`
- Import helpers from: `lib/subtitles.ts`

**Steps:**

1. Build `Map<string, SubtitleTrackInput[]>`.
2. For each subtitle file, compare against video base names.
3. For each lesson, upsert lesson first.
4. Delete existing `SubtitleTrack` rows for that lesson.
5. Insert detected tracks.
6. Set legacy `subtitlePath` to default track `src` or `null`.

**Risk:** Current lesson upserts are batched in a transaction. You may need to refactor to collect upsert results before creating subtitle tracks.

**Verification:**

Create a temporary course fixture outside the repo or in a safe ignored folder:

```text
My_Courses/Test Subtitles/01 Module/01 Lesson.mp4
My_Courses/Test Subtitles/01 Module/01 Lesson.en.vtt
My_Courses/Test Subtitles/01 Module/01 Lesson.es.vtt
```

Run scan and verify DB has two subtitle tracks for the lesson.

---

### Task 4: Update watch page query and props

**Objective:** Pass multiple subtitle tracks from server to client.

**Files:**

- Modify: `app/watch/[lessonId]/page.tsx`
- Modify: `app/watch/[lessonId]/WatchPageClient.tsx`

**Steps:**

1. Include `subtitles` relation in Prisma query.
2. Update TypeScript lesson types.
3. Convert DB tracks to video-player track props.
4. Preserve fallback from `subtitlePath`.

**Verification:**

```bash
npm run build
```

Expected: TypeScript passes.

---

### Task 5: Update VideoPlayer to render and select subtitle tracks

**Objective:** Render multiple `<track>` elements and add a subtitle selector to the existing settings menu.

**Files:**

- Modify: `components/VideoPlayer.tsx`

**Steps:**

1. Replace `subtitles?: string` with `subtitles?: SubtitleTrack[]`.
2. Render one `<track>` per subtitle.
3. Add state for selected subtitle track.
4. Use `videoRef.current.textTracks` to toggle track modes.
5. Add `Subtitles` section to the existing settings dropdown below Speed.
6. Include `Off` option.

**Do not regress:**

- Play/pause
- Speed selector
- Fullscreen
- PiP
- Keyboard shortcuts
- Tap-to-toggle
- Mobile layout

**Verification:**

```bash
npm run build
```

Manual browser check:

- Open a video with two `.vtt` subtitle tracks.
- Open settings menu.
- Select English.
- Select Spanish.
- Select Off.

---

### Task 6: Update scan page docs and README examples

**Objective:** Explain subtitle naming clearly for users.

**Files:**

- Modify: `app/scan/page.tsx`
- Modify: `README.md`

**Add examples:**

```text
01 - Lesson.mp4
01 - Lesson.en.vtt
01 - Lesson.es.vtt
01 - Lesson.ja.vtt
```

**Mention:**

- `.vtt` is preferred.
- `.srt` is detected but may be best-effort unless converted.
- Language suffixes use ISO-like codes: `en`, `es`, `fr`, `ja`, `fil`, `zh-CN`, `pt-BR`.

**Verification:**

```bash
npm run build
```

---

### Task 7: Final verification and cleanup

**Objective:** Prove the feature is ready to merge.

**Commands:**

```bash
npm run build
git status --short
```

Optional live verification if the production test server is being used:

```bash
ss -tlnp | grep ':6767'
# restart only if user wants live testing
```

**Manual checklist:**

- Single legacy subtitle still works.
- Multiple VTT subtitles render and can be selected.
- SRT behavior is documented accurately.
- No watch sidebar regression.
- No donation/header changes.
- No Docker docs changed except if README subtitle docs are added.

---

## 6. Suggested Commit Sequence

Use small commits:

```bash
git commit -m "feat: add subtitle track parsing helpers"
git commit -m "feat: store multiple subtitle tracks per lesson"
git commit -m "feat: scan language-specific subtitle tracks"
git commit -m "feat: add subtitle selector to video player"
git commit -m "docs: document multilingual subtitle naming"
```

---

## 7. Implementation Warnings

- Do not remove `Lesson.subtitlePath` immediately; keep it as a compatibility bridge.
- Do not import `fs/promises`, Prisma, or scanner utilities into `components/VideoPlayer.tsx`; it is a client component.
- Do not assume `.srt` will render natively in all browsers.
- Do not break the existing one-subtitle flow.
- Do not touch unrelated UI such as Ko-fi badges, header buttons, analytics, install/PWA leftovers, Docker compose files, or quiz flows.
- Do not use `window.prompt` or native alert flows for this feature.

---

## 8. Future Enhancements After MVP

These are intentionally out of scope for the first implementation:

- Automatic SRT-to-VTT conversion.
- User-level preferred subtitle language setting.
- Auto-generated subtitles/translations.
- Subtitle upload UI.
- Per-course subtitle language defaults.
- Subtitle style customization.

---

## 9. Human Summary

Today, OfflineAcademy can find one subtitle file per video. This feature branch is for making it understand many subtitle files per video, each with a language code, so the video player can let the user choose the subtitle language.

The simplest user workflow should become:

```text
01 - Lesson.mp4
01 - Lesson.en.vtt
01 - Lesson.es.vtt
01 - Lesson.ja.vtt
```

Then scan the course, open the video, and pick the language from the player settings menu.
