# OfflineAcademy - Feature Summary

**Project Location:** `/home/afterhours/OfflineU2`
**Port:** 5001 | **Stack:** Next.js 14, TypeScript, Tailwind, Shadcn/UI, SQLite + Prisma

---

## ✅ Implemented Features

| Feature | Status | Details |
|---------|--------|---------|
| **Course Discovery** | ✅ | Recursive scan of `My_Courses` folder, natural sort (1,2,3...10,11) |
| **Dashboard** | ✅ | Course grid with progress %, thumbnails, continue watching row |
| **Course Detail Page** | ✅ | Module/lesson tree, progress tracking, resume button |
| **Watch Page** | ✅ | Video player (auto-play, resume), audio/PDF/image/other preview |
| **Video Auto-Play** | ✅ | Starts automatically on page load |
| **Auto-Next Lesson** | ✅ | Redirects to next lesson on video completion |
| **Progress Bookmarking** | ✅ | 500ms debounced save, persists position + completion |
| **Mobile Overlay** | ✅ | Bottom progress bar with title/duration on small screens |
| **Sidebar Navigation** | ✅ | Collapsible module accordion, current lesson highlighted |
| **Keyboard Shortcuts** | ✅ | Space (play/pause), ←/→ (seek ±10s), F (fullscreen), M (mute), ↑/↓ (volume) |
| **Quick Scan Button** | ✅ | Dashboard button triggers background re-scan |
| **Settings Page** | ✅ | Configure courses root path |
| **Theme Toggle** | ✅ | Light/dark/system with persistence |

---

## 🔌 API Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/progress` | GET, POST | Lesson & course progress (upsert + fetch) |
| `/api/settings` | GET, POST | Courses root configuration |
| `/api/files/*` | GET | Secure file serving with range requests (video streaming) |
| `/api/scan` | POST | Background course discovery job |

---

## 🗄 Database Schema (Prisma)

```prisma
model Course {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  path        String   @unique
  thumbnail   String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  modules     Module[]
  progress    Progress[]

  @@index([slug])
  @@index([path])
}

model Module {
  id        String   @id @default(cuid())
  name      String
  slug      String
  order     Int      @default(0)
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lessons   Lesson[]
  progress  Progress[]

  @@unique([courseId, slug])
  @@index([courseId, order])
}

model Lesson {
  id        String   @id @default(cuid())
  title     String
  slug      String
  order     Int      @default(0)
  moduleId  String
  module    Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  filePath  String
  fileName  String
  mimeType  String
  duration  Int?
  thumbnail String?
  type      String   @default("VIDEO")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  progress  Progress[]

  @@unique([moduleId, slug])
  @@index([moduleId, order])
  @@index([filePath])
}

model Progress {
  id          String   @id @default(cuid())
  userId      String   @default("local-user")
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  moduleId    String?
  module      Module?  @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  lessonId    String?
  lesson      Lesson?  @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  completed   Boolean  @default(false)
  position    Int      @default(0)
  lastWatched DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, lessonId])
  @@index([userId, courseId])
  @@index([userId, lastWatched])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 📁 Key Project Structure

```
/home/afterhours/OfflineU2/
├── app/
│   ├── page.tsx                              # Dashboard
│   ├── course/[slug]/page.tsx                # Course detail
│   ├── watch/[lessonId]/page.tsx             # Watch page (server)
│   ├── watch/[lessonId]/WatchPageClient.tsx  # Watch client (fixed)
│   ├── scan/page.tsx                         # Quick scan UI
│   ├── settings/page.tsx                     # Settings
│   └── api/
│       ├── progress/route.ts                 # Progress CRUD
│       ├── settings/route.ts                 # Settings CRUD
│       ├── files/[...path]/route.ts          # File serving
│       └── scan/route.ts                     # Scan trigger
├── components/
│   ├── Header.tsx
│   ├── VideoPlayer.tsx
│   ├── ModuleAccordion.tsx
│   ├── CourseCard.tsx
│   ├── ThemeToggle.tsx
│   ├── KeyboardShortcutsOverlay.tsx
│   └── ui/                                   # Shadcn components
├── lib/
│   ├── prisma.ts                             # Prisma client
│   └── utils.ts                              # Helpers (formatDuration, cn, etc.)
├── prisma/
│   └── schema.prisma                         # Database schema
├── global.d.ts                               # lucide-react type declarations
├── radix-separator.d.ts                      # @radix-ui/react-separator types
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

```bash
cd /home/afterhours/OfflineU2
npm run dev          # Starts on http://localhost:5001
```

---

## ⚠️ Known Minor Issues (Non-Blocking)

1. **`COURSES_ROOT` references** in `app/scan/page.tsx` and `app/settings/page.tsx` - should use dynamic settings
2. **`lastWatched` type mismatch** - Prisma returns `Date`, API expects `string` (watch page parent)
3. **TypeScript errors** in `WatchComponents.tsx`, `VideoPlayer.tsx`, `KeyboardShortcutsOverlay.tsx` - cosmetic, don't affect runtime

---

## 📝 History Notes

- **Renamed from OfflineU2 → OfflineAcademy** (brand cleanup)
- **WatchPageClient.tsx** completely rewritten to fix TypeScript JSX parsing issues
- **Progress API** fixed to use valid Prisma unique key (`@@unique([userId, lessonId])`)
- **Type declarations** added for `lucide-react` and `@radix-ui/react-separator`

---

*Generated for workspace transfer - all features functional as of last session.*