#!/usr/bin/env tsx
/**
 * Course Metadata & Thumbnail Downloader
 * Downloads thumbnails for courses based on their topics (Jenkins, Terraform, etc.)
 * Usage: npx tsx scripts/download-thumbnails.ts
 */

import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs'
import { writeFile } from 'fs/promises'

interface CourseMetadata {
  title: string
  description?: string
  tags: string[]
}

const COURSE_METADATA_MAPPINGS: Record<string, CourseMetadata> = {
  'hashicorp': {
    title: 'HashiCorp Certified',
    description: 'Official HashiCorp certification courses for Terraform, Vault, Consul, and Nomad',
    tags: ['hashicorp', 'terraform', 'vault', 'consul', 'nomad', 'certification'],
  },
  'terraform': {
    title: 'Terraform',
    description: 'Infrastructure as Code with Terraform - from basics to advanced patterns',
    tags: ['iac', 'terraform', 'hashicorp', 'cloud', 'devops'],
  },
  'jenkins': {
    title: 'Jenkins CI/CD',
    description: 'Complete Jenkins pipeline automation - from basics to advanced declarative pipelines',
    tags: ['ci/cd', 'jenkins', 'automation', 'pipeline', 'devops'],
  },
  'kubernetes': {
    title: 'Kubernetes',
    description: 'Container orchestration with Kubernetes - fundamentals to advanced operations',
    tags: ['k8s', 'kubernetes', 'containers', 'orchestration', 'cloud-native'],
  },
  'docker': {
    title: 'Docker & Containers',
    description: 'Container fundamentals - Docker, Podman, Buildah, and container best practices',
    tags: ['docker', 'containers', 'podman', 'containerd', 'buildah'],
  },
  'ansible': {
    title: 'Ansible Automation',
    description: 'Infrastructure automation with Ansible - playbooks, roles, collections, and AWX',
    tags: ['ansible', 'automation', 'configuration-management', 'redhat'],
  },
  'prometheus': {
    title: 'Prometheus & Grafana',
    description: 'Monitoring and observability with Prometheus, Grafana, Alertmanager, and Loki',
    tags: ['monitoring', 'prometheus', 'grafana', 'observability', 'alerting'],
  },
  'github-actions': {
    title: 'GitHub Actions CI/CD',
    description: 'CI/CD pipelines with GitHub Actions - workflows, reusable actions, and self-hosted runners',
    tags: ['github', 'actions', 'ci/cd', 'workflows', 'automation'],
  },
  'linux': {
    title: 'Linux System Administration',
    description: 'Linux fundamentals - shell scripting, systemd, networking, security, and performance tuning',
    tags: ['linux', 'shell', 'bash', 'systemd', 'networking', 'security'],
  },
  'python': {
    title: 'Python Programming',
    description: 'Python programming - from basics to advanced async, testing, and packaging',
    tags: ['python', 'programming', 'async', 'testing', 'packaging'],
  },
  'go': {
    title: 'Go Programming',
    description: 'Go programming - concurrency, microservices, CLI tools, and performance',
    tags: ['go', 'golang', 'concurrency', 'microservices', 'cli'],
  },
  'aws': {
    title: 'Amazon Web Services',
    description: 'AWS cloud services - compute, storage, networking, serverless, and security',
    tags: ['aws', 'cloud', 'serverless', 'infrastructure', 'devops'],
  },
  'azure': {
    title: 'Microsoft Azure',
    description: 'Azure cloud platform - compute, storage, networking, DevOps, and AI services',
    tags: ['azure', 'cloud', 'microsoft', 'devops', 'ai'],
  },
  'gcp': {
    title: 'Google Cloud Platform',
    description: 'Google Cloud - compute, storage, BigQuery, Kubernetes Engine, and AI/ML',
    tags: ['gcp', 'google-cloud', 'bigquery', 'kubernetes', 'ai'],
  },
}

const THUMBNAIL_SOURCES: Record<string, string[]> = {
  'terraform': [
    'https://www.datocms-assets.com/2885/1623276269-terraform-logo.png',
    'https://cdn.worldvectorlogo.com/logos/terraform-1.svg',
  ],
  'hashicorp': [
    'https://www.datocms-assets.com/2885/1623276182-hashicorp-logo.png',
    'https://cdn.worldvectorlogo.com/logos/hashicorp.svg',
  ],
  'jenkins': [
    'https://www.jenkins.io/images/logos/jenkins/jenkins.svg',
    'https://cdn.worldvectorlogo.com/logos/jenkins-1.svg',
  ],
  'kubernetes': [
    'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
    'https://cdn.worldvectorlogo.com/logos/kubernetes.svg',
  ],
  'docker': [
    'https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png',
    'https://cdn.worldvectorlogo.com/logos/docker.svg',
  ],
  'ansible': [
    'https://ansible.com/img/ansible-logo-tm.png',
    'https://cdn.worldvectorlogo.com/logos/ansible.svg',
  ],
  'prometheus': [
    'https://prometheus.io/assets/prometheus_logo-cb55bb5c346.png',
  ],
  'grafana': [
    'https://grafana.com/static/assets/img/blog/grafana_logo.png',
  ],
  'k8s': [
    'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
  ],
  'ci/cd': [
    'https://github.githubassets.com/images/modules/site/github-actions-icon.png',
  ],
  'linux': [
    'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg',
  ],
  'python': [
    'https://www.python.org/static/community_logos/python-logo-generic.svg',
  ],
  'go': [
    'https://go.dev/images/gophers/gopher.svg',
  ],
  'aws': [
    'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
  ],
  'azure': [
    'https://azure.microsoft.com/svghandler/azure-logo/',
  ],
  'gcp': [
    'https://cloud.google.com/images/social-icon-google-cloud-1200-630.png',
  ],
}

const PLACEHOLDER_THUMBNAILS = [
  'https://via.placeholder.com/400x225/1e293b/10b981?text=Course+Thumbnail',
  'https://via.placeholder.com/400x225/0f172a/10b981?text=Video+Preview',
]

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OfflineAcademy/1.0)' },
    })
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (e) {
    return null
  }
}

async function downloadThumbnailForCourse(courseName: string, outputDir: string): Promise<string | null> {
  const lowerName = courseName.toLowerCase()
  let metadata: CourseMetadata | null = null

  for (const [key, meta] of Object.entries(COURSE_METADATA_MAPPINGS)) {
    if (lowerName.includes(key)) {
      metadata = meta
      break
    }
  }

  if (!metadata) {
    console.log(`No metadata found for: ${courseName}`)
    return null
  }

  console.log(`Processing: ${courseName} -> ${metadata.title}`)

  const thumbDir = join(outputDir, '.thumbnails', slugify(courseName))
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true })
  }

  // Get thumbnail sources for this course's tags
  const sources: string[] = []
  for (const tag of metadata.tags) {
    if (THUMBNAIL_SOURCES[tag]) {
      sources.push(...THUMBNAIL_SOURCES[tag])
    }
  }
  sources.push(...PLACEHOLDER_THUMBNAILS)

  // Try each source until one works
  for (let i = 0; i < sources.length; i++) {
    const url = sources[i]
    console.log(`  Trying: ${url}`)
    const buffer = await downloadImage(url)
    if (buffer) {
      const ext = url.includes('.png') ? '.png' : url.includes('.svg') ? '.svg' : '.jpg'
      const outputPath = join(thumbDir, `thumb_${i}${ext}`)
      await writeFile(outputPath, buffer)
      console.log(`  ✓ Downloaded thumbnail to ${outputPath}`)
      return outputPath
    }
  }

  // If all fail, create a simple placeholder
  const placeholderPath = join(thumbDir, 'placeholder.svg')
  const svg = generatePlaceholderSVG(metadata.title)
  await writeFile(placeholderPath, svg)
  console.log(`  ✓ Created placeholder SVG for ${courseName}`)
  return placeholderPath
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generatePlaceholderSVG(title: string): string {
  const colors: Record<string, string> = {
    'terraform': '#7B42BC',
    'hashicorp': '#7B42BC',
    'jenkins': '#D24933',
    'kubernetes': '#326CE5',
    'docker': '#2496ED',
    'ansible': '#EE0000',
    'prometheus': '#E6522C',
    'grafana': '#F46800',
    'linux': '#FCC624',
    'python': '#3776AB',
    'go': '#00ADD8',
    'aws': '#FF9900',
    'azure': '#0078D4',
    'gcp': '#4285F4',
  }
  
  const bgColor = Object.entries(colors).find(([key]) => title.toLowerCase().includes(key))?.[1] || '#10b981'
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
    <rect width="400" height="225" fill="${bgColor}"/>
    <text x="200" y="112" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${title}</text>
    <text x="200" y="140" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">Course Thumbnail</text>
  </svg>`
}

async function main() {
  console.log('Starting thumbnail download for courses...')

  // Get all courses from the project
  const publicDir = join(process.cwd(), 'public')
  const thumbDir = join(publicDir, '.thumbnails')
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true })
  }

  // We'll manually specify common course names to download thumbnails for
  const commonCourses = [
    'HashiCorp Certified Terraform',
    'Terraform Associate',
    'Jenkins CI/CD Pipeline',
    'Kubernetes Basics',
    'Docker Fundamentals',
    'Ansible Automation',
    'Prometheus Grafana',
    'GitHub Actions',
    'Linux Administration',
    'Python Programming',
    'Go Programming',
    'AWS Solutions Architect',
    'Azure Administrator',
    'GCP Cloud Engineer',
  ]

  for (const courseName of commonCourses) {
    await downloadThumbnailForCourse(courseName, publicDir)
  }

  console.log('\nThumbnail download complete!')
  console.log(`Thumbnails saved to: ${thumbDir}`)
}

main().catch(console.error)