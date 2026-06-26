import { prisma } from '@/lib/prisma'
import { readdir, stat } from 'fs/promises'
import { join, relative, extname, basename, dirname } from 'path'
import { getMimeType, getLessonType, slugify } from '@/lib/utils'
import { getVideoDuration, generateVideoThumbnail, checkVideoTools } from '@/lib/video-utils'
import { getCourseThumbnail } from '@/lib/thumbnail-index'
import { getLocalThumbnailUrl } from '@/lib/thumbnail-index-server'
import { ensureModuleQuizCache, syncQuizLessonFromCache, shouldSkipQuizGeneration } from '@/lib/quiz'
import { applyCourseMetadata, isMetadataFileName, readCourseMetadataFile } from '@/lib/course-metadata'
import { getLocalCourseThumbnailPath, ensurePublicThumbnail } from '@/lib/course-thumbnail-utils'
import { buildSubtitleTrackMap } from '@/lib/subtitles'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

// Natural sort: handles "1", "2", "10" correctly (not "1", "10", "2")
function naturalSort(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) || []
  const bParts = b.match(re) || []

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''
    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum
    } else {
      const cmp = aPart.localeCompare(bPart)
      if (cmp !== 0) return cmp
    }
  }
  return 0
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v', '.flv', '.wmv'])

async function directoryContainsVideo(dirPath: string, depth = 2): Promise<boolean> {
  if (depth <= 0) return false
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        if (VIDEO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          return true
        }
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        if (await directoryContainsVideo(join(dirPath, entry.name), depth - 1)) {
          return true
        }
      }
    }
  } catch {
    // ignore unreadable paths
  }
  return false
}

async function getCoursesRoot(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'coursesRoot' },
    })
    return setting?.value || './My_Courses'
  } catch {
    return './My_Courses'
  }
}

export async function getCoursesRootPath(): Promise<string> {
  return getCoursesRoot()
}

/**
 * Download and save course thumbnail locally
 */
async function downloadCourseThumbnail(courseName: string, courseSlug: string): Promise<string | null> {
  try {
    const thumbnailUrl = getCourseThumbnail(courseName, courseSlug)
    if (!thumbnailUrl) return null

    const thumbDir = join(process.cwd(), 'public', 'thumbnails', 'courses')
    if (!existsSync(thumbDir)) {
      await mkdir(thumbDir, { recursive: true })
    }

    const response = await fetch(thumbnailUrl)
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()

    // Determine extension from Content-Type header (more reliable than URL)
    const contentType = response.headers.get('content-type') || ''
    let primaryExt = '.png'
    if (contentType.includes('svg')) primaryExt = '.svg'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) primaryExt = '.jpg'
    else if (contentType.includes('png')) primaryExt = '.png'
    else if (contentType.includes('gif')) primaryExt = '.gif'
    else if (contentType.includes('webp')) primaryExt = '.webp'

    // Fallback to URL-based detection
    if (primaryExt === '.png' && thumbnailUrl.includes('.svg')) primaryExt = '.svg'

    // Save both .svg and .png versions to prevent 404s
    const extensionsToSave = primaryExt === '.svg' ? ['.svg', '.png'] : ['.png', '.svg']
    
    let returnedPath = ''
    
    for (const ext of extensionsToSave) {
      const filename = `${courseSlug}-thumb${ext}`
      const filepath = join(thumbDir, filename)
      
      // For the secondary format, convert if needed
      if (ext !== primaryExt) {
        // We already have the buffer, just save with different extension
        await writeFile(filepath, Buffer.from(buffer))
      } else {
        await writeFile(filepath, Buffer.from(buffer))
      }
      
      if (!returnedPath) {
        returnedPath = `/thumbnails/courses/${filename}`
      }
      
      console.log(`Downloaded thumbnail for ${courseName} (${ext})`)
    }
    
    return returnedPath
  } catch (error) {
    console.warn(`Failed to download thumbnail for ${courseName}:`, error)
    return null
  }
}

interface ScanResult {
  coursesCreated: number
  coursesUpdated: number
  coursesDeleted: number
  modulesCreated: number
  modulesUpdated: number
  lessonsCreated: number
  lessonsUpdated: number
  errors: string[]
}

interface CourseMetadata {
  title: string
  description?: string
  thumbnail?: string
  icon?: string
  tags: string[]
  metadata: Record<string, any>
}

const COURSE_METADATA_MAPPINGS: Record<string, CourseMetadata> = {
  'hashicorp': {
    title: 'HashiCorp Certified',
    description: 'Official HashiCorp certification courses for Terraform, Vault, Consul, and Nomad',
    tags: ['hashicorp', 'terraform', 'vault', 'consul', 'nomad', 'certification'],
    metadata: { vendor: 'HashiCorp', certifications: ['Terraform Associate', 'Vault Associate', 'Consul Associate'] },
  },
  'terraform': {
    title: 'Terraform',
    description: 'Infrastructure as Code with Terraform - from basics to advanced patterns',
    tags: ['iac', 'terraform', 'hashicorp', 'cloud', 'devops'],
    metadata: { provider: 'HashiCorp', registry: 'registry.terraform.io' },
  },
  'jenkins': {
    title: 'Jenkins CI/CD',
    description: 'Complete Jenkins pipeline automation - from basics to advanced declarative pipelines',
    tags: ['ci/cd', 'jenkins', 'automation', 'pipeline', 'devops'],
    metadata: { url: 'https://www.jenkins.io', plugins: ['Pipeline', 'Blue Ocean', 'GitHub Integration'] },
  },
  'kubernetes': {
    title: 'Kubernetes',
    description: 'Container orchestration with Kubernetes - fundamentals to advanced operations',
    tags: ['k8s', 'kubernetes', 'containers', 'orchestration', 'cloud-native'],
    metadata: { versions: ['1.28', '1.29', '1.30'], cni: ['Calico', 'Cilium', 'Flannel'] },
  },
  'docker': {
    title: 'Docker & Containers',
    description: 'Container fundamentals - Docker, Podman, Buildah, and container best practices',
    tags: ['docker', 'containers', 'podman', 'containerd', 'buildah'],
    metadata: { registry: 'Docker Hub', runtimes: ['containerd', 'cri-o', 'runc'] },
  },
  'ansible': {
    title: 'Ansible Automation',
    description: 'Infrastructure automation with Ansible - playbooks, roles, collections, and AWX',
    tags: ['ansible', 'automation', 'configuration-management', 'redhat'],
    metadata: { galaxy: 'galaxy.ansible.com', collections: ['community.general', 'community.docker', 'kubernetes.core'] },
  },
  'prometheus': {
    title: 'Prometheus & Grafana',
    description: 'Monitoring and observability with Prometheus, Grafana, Alertmanager, and Loki',
    tags: ['monitoring', 'prometheus', 'grafana', 'observability', 'alerting'],
    metadata: { stack: ['Prometheus', 'Grafana', 'Alertmanager', 'Loki', 'Tempo'] },
  },
  'github-actions': {
    title: 'GitHub Actions CI/CD',
    description: 'CI/CD pipelines with GitHub Actions - workflows, reusable actions, and self-hosted runners',
    tags: ['github', 'actions', 'ci/cd', 'workflows', 'automation'],
    metadata: { marketplace: 'GitHub Marketplace', runners: ['ubuntu-latest', 'windows-latest', 'macos-latest', 'self-hosted'] },
  },
  'linux': {
    title: 'Linux System Administration',
    description: 'Linux fundamentals - shell scripting, systemd, networking, security, and performance tuning',
    tags: ['linux', 'shell', 'bash', 'systemd', 'networking', 'security'],
    metadata: { distros: ['Ubuntu', 'Debian', 'RHEL', 'Fedora', 'Arch'], shells: ['bash', 'zsh', 'fish'] },
  },
  'python': {
    title: 'Python Programming',
    description: 'Python programming - from basics to advanced async, testing, and packaging',
    tags: ['python', 'programming', 'async', 'testing', 'packaging'],
    metadata: { versions: ['3.10', '3.11', '3.12'], frameworks: ['FastAPI', 'Django', 'Flask', 'Pydantic'] },
  },
  'go': {
    title: 'Go Programming',
    description: 'Go programming - concurrency, microservices, CLI tools, and performance',
    tags: ['go', 'golang', 'concurrency', 'microservices', 'cli'],
    metadata: { versions: ['1.21', '1.22'], tools: ['go modules', 'golangci-lint', 'delve'] },
  },
  'aws': {
    title: 'Amazon Web Services',
    description: 'AWS cloud services - compute, storage, networking, serverless, and security',
    tags: ['aws', 'cloud', 'serverless', 'infrastructure', 'devops'],
    metadata: { regions: ['us-east-1', 'us-west-2', 'eu-west-1'], certifications: ['Solutions Architect', 'Developer', 'SysOps'] },
  },
  'azure': {
    title: 'Microsoft Azure',
    description: 'Azure cloud platform - compute, storage, networking, DevOps, and AI services',
    tags: ['azure', 'cloud', 'microsoft', 'devops', 'ai'],
    metadata: { regions: ['East US', 'West Europe', 'Southeast Asia'], certifications: ['AZ-104', 'AZ-204', 'AZ-400'] },
  },
  'gcp': {
    title: 'Google Cloud Platform',
    description: 'Google Cloud - compute, storage, BigQuery, Kubernetes Engine, and AI/ML',
    tags: ['gcp', 'google-cloud', 'bigquery', 'kubernetes', 'ai'],
    metadata: { regions: ['us-central1', 'europe-west1', 'asia-northeast1'], certifications: ['Cloud Architect', 'Data Engineer', 'DevOps Engineer'] },
  },
}

interface ScanOptions {
  skipVideoMetadata?: boolean
  maxConcurrency?: number
  maxLessonsPerCourse?: number
  maxModulesPerCourse?: number
  batchSize?: number
}

interface ScanResult {
  coursesCreated: number
  coursesUpdated: number
  coursesDeleted: number
  modulesCreated: number
  modulesUpdated: number
  lessonsCreated: number
  lessonsUpdated: number
  errors: string[]
}

// Utility for concurrent task processing with limited concurrency
async function parallelLimit<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const queue = [...items]
  let running = 0

  async function processNext() {
    if (queue.length === 0 && running === 0) return

    const item = queue.shift()
    if (!item) return

    running++
    try {
      await processor(item)
    } finally {
      running--
      processNext()
    }
  }

  // Start initial workers
  while (running < concurrency && queue.length > 0) {
    processNext()
  }

  // Wait for all to complete
  while (running > 0) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

interface ScanOptions {
  skipVideoMetadata?: boolean
  maxConcurrency?: number
  maxLessonsPerCourse?: number
  maxModulesPerCourse?: number
  autoFetchQuizzes?: boolean
  quizApiSource?: 'the-trivia-api' | 'quizapi'
}

async function scanCourses(options: ScanOptions = {}): Promise<ScanResult> {
  const { 
    skipVideoMetadata = true, 
    maxConcurrency = 8,
    maxLessonsPerCourse = 500,
    maxModulesPerCourse = 50,
    batchSize = 50,
    autoFetchQuizzes = false,
    quizApiSource = 'quizapi',
  } = options

  const result: ScanResult = {
    coursesCreated: 0,
    coursesUpdated: 0,
    coursesDeleted: 0,
    modulesCreated: 0,
    modulesUpdated: 0,
    lessonsCreated: 0,
    lessonsUpdated: 0,
    errors: [],
  }

  try {
    const coursesRoot = await getCoursesRoot()
    const rootStat = await stat(coursesRoot).catch(() => null)
    if (!rootStat || !rootStat.isDirectory()) {
      result.errors.push('Courses root directory not found: ' + coursesRoot)
      return result
    }

    // Get all existing courses in one query to avoid N+1
    const existingCourses = await prisma.course.findMany({
      select: { id: true, slug: true, name: true, path: true, hidden: true, description: true, thumbnail: true, displayName: true }
    })
    const existingCourseMap = new Map(existingCourses.map(c => [c.slug, c]))

    const hiddenCourseSlugs = new Set(
      existingCourses.filter(c => c.hidden).map(c => c.slug)
    )

    const courseDirs = await readdir(coursesRoot, { withFileTypes: true })
    let courses = courseDirs.filter(d => d.isDirectory() && !d.name.startsWith('.') && !hiddenCourseSlugs.has(slugify(d.name)))

    // Strict: ignore folders that don't contain any video files
    const strictCourses: typeof courses = []
    for (const courseDir of courses) {
      const coursePath = join(coursesRoot, courseDir.name)
      const hasVideo = await directoryContainsVideo(coursePath, 3)
      if (hasVideo) {
        strictCourses.push(courseDir)
      } else {
        result.errors.push(`Skipping empty/non-video course folder: ${courseDir.name}`)
      }
    }
    courses = strictCourses

    // Batch upsert courses
    const courseUpserts = courses
      .map((courseDir) => ({
        where: { slug: slugify(courseDir.name) },
        update: { 
          name: courseDir.name, 
          path: join(coursesRoot, courseDir.name),
        },
        create: { 
          name: courseDir.name, 
          slug: slugify(courseDir.name), 
          path: join(coursesRoot, courseDir.name),
        },
      }))

    // Process in batches to avoid memory issues
    for (let i = 0; i < courseUpserts.length; i += batchSize) {
      const batch = courseUpserts.slice(i, i + batchSize)
      await prisma.$transaction(
        batch.map(upsert => prisma.course.upsert(upsert))
      )
    }

    // Get updated courses
    const updatedCourses = await prisma.course.findMany({
      where: { slug: { in: courses.map(c => slugify(c.name)) } },
      select: { id: true, slug: true, name: true }
    })
    const courseMap = new Map(updatedCourses.map(c => [c.slug, c]))

    // Now process modules and lessons with better batching
    for (const courseDir of courses) {
      if (result.errors.length > 50) break // Stop if too many errors
      
      const courseSlug = slugify(courseDir.name)
      const course = courseMap.get(courseSlug)
      if (!course) continue

      const existingCourse = existingCourseMap.get(courseSlug)
      if (!existingCourse) result.coursesCreated++
      else result.coursesUpdated++

      const courseLowerName = courseDir.name.toLowerCase()
      let courseMetadata: CourseMetadata | null = null
      for (const [key, meta] of Object.entries(COURSE_METADATA_MAPPINGS)) {
        if (courseLowerName.includes(key)) {
          courseMetadata = meta
          break
        }
      }

      const coursePath = join(coursesRoot, courseDir.name)
      const courseJsonMetadata = await readCourseMetadataFile(coursePath)
      if (courseJsonMetadata) {
        await applyCourseMetadata(course.id, courseJsonMetadata.metadata, `course-json:${courseJsonMetadata.fileName}`)
      }

      await scanModules(course.id, coursePath, courseSlug, coursesRoot, result, courseMetadata, maxModulesPerCourse, maxLessonsPerCourse, autoFetchQuizzes, quizApiSource)
      
      // Step 1: Local image scanner - check course folder root for cover/thumbnail images
      const localThumbPath = await getLocalCourseThumbnailPath(coursePath)
      let finalThumbnail: string | null = null
      if (localThumbPath) {
        finalThumbnail = await ensurePublicThumbnail(courseSlug, localThumbPath)
      }
      
      if (courseMetadata) {
        const existingCourse = existingCourseMap.get(courseSlug)
        if (!finalThumbnail) {
          // Only download external thumbnail if no local cover found
          finalThumbnail = existingCourse?.thumbnail ? null : await downloadCourseThumbnail(courseDir.name, courseSlug)
        }
        await applyCourseMetadata(
          course.id,
          {
            displayName: courseMetadata.title,
            description: courseMetadata.description,
            thumbnail: finalThumbnail || undefined,
            tags: courseMetadata.tags,
          },
          'scanner-defaults'
        )
      } else if (finalThumbnail) {
        // Course has local cover but no metadata mapping - still save thumbnail
        await prisma.course.update({
          where: { id: course.id },
          data: { thumbnail: finalThumbnail },
        })
      }
    }

    const foundSlugs = new Set(courses.map((c) => slugify(c.name)))
    const staleCourses = existingCourses.filter((c) => !c.hidden && !foundSlugs.has(c.slug))
    if (staleCourses.length > 0) {
      const staleIds = staleCourses.map((c) => c.id)
      await prisma.course.deleteMany({
        where: { id: { in: staleIds } },
      })
      result.coursesDeleted = staleCourses.length
    }

  } catch (error) {
    result.errors.push('Failed to scan courses root: ' + error)
  }

  return result
}

export async function scanCoursesDirectory(options: ScanOptions = {}): Promise<ScanResult> {
  return scanCourses({ skipVideoMetadata: true, maxConcurrency: 6, ...options }) // Fast scan with concurrency
}

export async function scanCoursesFull(options: ScanOptions = {}): Promise<ScanResult> {
  return scanCourses({ skipVideoMetadata: false, maxConcurrency: 3, ...options }) // Full scan with metadata, lower concurrency for resource limits
}

async function scanModules(
  courseId: string,
  coursePath: string,
  courseSlug: string,
  coursesRoot: string,
  result: ScanResult,
  courseMetadata: CourseMetadata | null,
  maxModulesPerCourse: number,
  maxLessonsPerCourse: number,
  autoFetchQuizzes: boolean,
  quizApiSource: 'the-trivia-api' | 'quizapi'
) {
  try {
    const entries = await readdir(coursePath, { withFileTypes: true })
    const moduleDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => naturalSort(a.name, b.name))

    // Get existing modules in one query
    const existingModules = await prisma.module.findMany({
      where: { courseId },
      select: { id: true, slug: true, name: true }
    })
    const existingModuleMap = new Map(existingModules.map(m => [m.slug, m]))

    // Batch upsert modules
    const moduleUpserts = moduleDirs
      .slice(0, maxModulesPerCourse)
      .map((moduleDir, index) => ({
        where: { courseId_slug: { courseId, slug: slugify(moduleDir.name) } },
        update: { name: moduleDir.name, order: index },
        create: { name: moduleDir.name, slug: slugify(moduleDir.name), order: index, courseId },
      }))

    if (moduleUpserts.length > 0) {
      await prisma.$transaction(
        moduleUpserts.map(upsert => prisma.module.upsert(upsert))
      )
    }

    // Get updated modules
    const updatedModules = await prisma.module.findMany({
      where: { courseId, slug: { in: moduleUpserts.map(u => u.where.courseId_slug.slug) } },
      select: { id: true, slug: true, name: true }
    })
    const moduleMap = new Map(updatedModules.map(m => [m.slug, m]))

    // Process modules and scan lessons
    for (const moduleDir of moduleDirs.slice(0, maxModulesPerCourse)) {
      const moduleSlug = slugify(moduleDir.name)
      const module = moduleMap.get(moduleSlug)
      if (!module) continue

      const existingModule = existingModuleMap.get(moduleSlug)
      if (!existingModule) result.modulesCreated++
      else result.modulesUpdated++

      // Scan lessons in this module
      await scanLessons(courseId, module.id, join(coursePath, moduleDir.name), coursesRoot, result, maxLessonsPerCourse, autoFetchQuizzes, quizApiSource)
    }
  } catch (error) {
    result.errors.push('Failed to scan modules for course ' + courseSlug + ': ' + error)
  }
}

async function scanLessons(
  courseId: string,
  moduleId: string,
  modulePath: string,
  coursesRoot: string,
  result: ScanResult,
  maxLessonsPerCourse: number,
  autoFetchQuizzes: boolean,
  quizApiSource: 'the-trivia-api' | 'quizapi'
) {
  try {
    const moduleJsonMetadata = await readCourseMetadataFile(modulePath)
    if (moduleJsonMetadata) {
      await applyCourseMetadata(courseId, moduleJsonMetadata.metadata, `module-json:${basename(modulePath)}/${moduleJsonMetadata.fileName}`)
    }

    // Track slugs within this module so same-name files do not overwrite each other.
    const moduleSeenSlugs = new Set<string>()

    if (autoFetchQuizzes) {
      await ensureModuleQuizCache({
        modulePath,
        topic: basename(modulePath),
        source: quizApiSource,
      }).catch((error) => {
        result.errors.push('Failed to warm quiz cache for ' + modulePath + ': ' + error)
      })
    }

    const entries = await readdir(modulePath, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile() && !e.name.startsWith('.'))
      .sort((a, b) => naturalSort(a.name, b.name))

    const subtitleFiles = files.filter(file => ['srt', 'vtt'].includes(extname(file.name).slice(1).toLowerCase()))

    // Filter files to only include supported lesson types. Subtitle files are attached to videos, not created as lessons.
    const supportedFiles = files.filter(file => {
      if (file.name === 'quiz_cache.json' || isMetadataFileName(file.name)) {
        return false
      }

      const mimeType = getMimeType(file.name)
      const lessonType = getLessonType(mimeType)
      if (lessonType === 'OTHER' && !['json', 'txt'].includes(extname(file.name).slice(1).toLowerCase())) {
        return false
      }
      if (['srt', 'vtt'].includes(extname(file.name).slice(1).toLowerCase())) {
        return false
      }
      return true
    })

    const selectedFiles = supportedFiles.slice(0, maxLessonsPerCourse)
    const subtitleMap = buildSubtitleTrackMap(
      selectedFiles.map(file => file.name),
      subtitleFiles.map(file => file.name),
      (fileName) => relative(coursesRoot, join(modulePath, fileName)).replace(/\\/g, '/')
    )

    // Get existing lessons in one query
    const existingLessons = await prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true, slug: true }
    })
    const existingLessonMap = new Map(existingLessons.map(l => [l.slug, l]))

    const lessonRecords: Array<{ slug: string; baseName: string }> = []

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index]
      const relativePath = relative(coursesRoot, join(modulePath, file.name)).replace(/\\/g, '/')
      const mimeType = getMimeType(file.name)
      const lessonType = getLessonType(mimeType)
      const baseName = basename(file.name, extname(file.name))
      const baseSlug = slugify(baseName)

      let lessonSlug = baseSlug
      if (moduleSeenSlugs.has(lessonSlug)) {
        const typedSlug = `${baseSlug}-${lessonType.toLowerCase()}`
        lessonSlug = typedSlug
        let suffix = 2
        while (moduleSeenSlugs.has(lessonSlug)) {
          lessonSlug = `${typedSlug}-${suffix}`
          suffix += 1
        }
      }
      moduleSeenSlugs.add(lessonSlug)

      const subtitleTracks = subtitleMap.get(baseName) || []
      const defaultSubtitle = subtitleTracks.find(track => track.isDefault) || subtitleTracks[0] || null

      const lesson = await prisma.lesson.upsert({
        where: { moduleId_slug: { moduleId, slug: lessonSlug } },
        update: {
          title: baseName,
          order: index,
          filePath: relativePath,
          fileName: file.name,
          mimeType,
          type: lessonType,
          duration: null,
          thumbnail: null,
          subtitlePath: defaultSubtitle?.src || null,
        },
        create: {
          title: baseName,
          slug: lessonSlug,
          order: index,
          filePath: relativePath,
          fileName: file.name,
          mimeType,
          type: lessonType,
          duration: null,
          thumbnail: null,
          subtitlePath: defaultSubtitle?.src || null,
          moduleId,
        },
      })

      await prisma.$transaction([
        prisma.subtitleTrack.deleteMany({ where: { lessonId: lesson.id } }),
        ...subtitleTracks.map(track => prisma.subtitleTrack.create({
          data: {
            lessonId: lesson.id,
            src: track.src,
            lang: track.lang,
            label: track.label,
            format: track.format,
            isDefault: track.src === defaultSubtitle?.src,
          },
        })),
      ])

      lessonRecords.push({ slug: lessonSlug, baseName })
    }

    const moduleShouldSkipQuiz = await shouldSkipQuizGeneration(modulePath, basename(modulePath))

    // Update counts for non-quiz lessons first
    const newLessons = lessonRecords.filter(record => !existingLessonMap.has(record.slug))
    result.lessonsCreated += newLessons.length
    result.lessonsUpdated += lessonRecords.length - newLessons.length

    if (!moduleShouldSkipQuiz) {
      if (autoFetchQuizzes) {
        await ensureModuleQuizCache({
          modulePath,
          topic: basename(modulePath),
          source: quizApiSource,
        }).catch((error) => {
          result.errors.push('Failed to warm quiz cache for ' + modulePath + ': ' + error)
        })
      }

      const quizSync = await syncQuizLessonFromCache({
        moduleId,
        modulePath,
        courseRoot: coursesRoot,
        topic: basename(modulePath),
        source: quizApiSource,
        lessonOrder: lessonRecords.length,
        autoFetch: autoFetchQuizzes,
      })

      if (quizSync) {
        if (quizSync.created) result.lessonsCreated += 1
        else result.lessonsUpdated += 1
      }
    } else {
      await prisma.lesson.deleteMany({ where: { moduleId, slug: 'quiz' } }).catch(() => {})
    }
  } catch (error) {
    result.errors.push('Failed to scan lessons: ' + error)
  }
}


export async function getCourseStats(courseId: string) {
  const [modulesCount, lessonsCount] = await Promise.all([
    prisma.module.count({ where: { courseId } }),
    prisma.lesson.count({ where: { module: { courseId } } }),
  ])
  return { modulesCount, lessonsCount }
}