/**
 * Course Thumbnail Index - Client Safe
 * Maps course names to their external thumbnail URLs
 * Does NOT check local filesystem (server-side only)
 * 
 * IMPORTANT: This file MUST NOT import 'fs' or 'path' modules
 * as it's used in client components. Server-side filesystem
 * operations should use lib/thumbnail-index-server.ts
 */

const courseThumbnails: Record<string, string> = {
  // HashiCorp / Terraform
  'terraform': 'https://www.datocms-assets.com/2885/1623276269-terraform-logo.png',
  'hashicorp': 'https://www.datocms-assets.com/2885/1623276182-hashicorp-logo.png',
  'vault': 'https://www.datocms-assets.com/2885/1623276272-vault-logo.png',
  'consul': 'https://www.datocms-assets.com/2885/1623276274-consul-logo.png',
  'nomad': 'https://www.datocms-assets.com/2885/1623276276-nomad-logo.png',
  
  // Jenkins
  'jenkins': 'https://www.jenkins.io/images/logos/jenkins/jenkins.svg',
  
  // Kubernetes
  'kubernetes': 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
  'k8s': 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
  
  // Docker
  'docker': 'https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png',
  'podman': 'https://podman.io/images/logo.svg',
  
  // Ansible
  'ansible': 'https://ansible.com/img/ansible-logo-tm.png',
  
  // Monitoring
  'prometheus': 'https://prometheus.io/assets/prometheus_logo-cb55bb5c346.png',
  'grafana': 'https://grafana.com/static/assets/img/blog/grafana_logo.png',
  
  // CI/CD
  'github-actions': 'https://github.githubassets.com/images/modules/site/github-actions-icon.png',
  'gitlab': 'https://about.gitlab.com/images/press/logo.svg',
  
  // Linux
  'linux': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg',
  'ubuntu': 'https://assets.ubuntu.com/v1/29985a98-ubuntu-logo32.png',
  
  // Python
  'python': 'https://www.python.org/static/community_logos/python-logo-generic.svg',
  
  // Go
  'go': 'https://go.dev/images/gophers/gopher.svg',
  'golang': 'https://go.dev/images/gophers/gopher.svg',
  
  // Cloud
  'aws': 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
  'azure': 'https://azure.microsoft.com/svghandler/azure-logo/',
  'gcp': 'https://cloud.google.com/images/social-icon-google-cloud-1200-630.png',
  
  // Programming
  'javascript': 'https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png',
  'typescript': 'https://raw.githubusercontent.com/github/explore/main/topics/typescript/typescript.png',
  'react': 'https://raw.githubusercontent.com/github/explore/main/topics/react/react.png',
  'vue': 'https://raw.githubusercontent.com/github/explore/main/topics/vue/vue.png',
  'nodejs': 'https://raw.githubusercontent.com/github/explore/main/topics/nodejs/nodejs.png',
  
  // DevOps tools
  'packer': 'https://www.datocms-assets.com/2885/1623276282-packer-logo.png',
  'vagrant': 'https://www.datocms-assets.com/2885/1623276284-vagrant-logo.png',
}

/**
 * Get external thumbnail URL from index
 */
export function getCourseThumbnail(courseName: string, slug?: string): string | null {
  const name = courseName.toLowerCase()
  const courseSlug = (slug || '').toLowerCase()
  
  for (const [key, url] of Object.entries(courseThumbnails)) {
    if (name.includes(key) || courseSlug.includes(key)) {
      return url
    }
  }
  
  return null
}

// Client-side version that uses database-provided thumbnail
export function getCourseThumbnailClient(course: { thumbnail?: string | null; name: string; slug?: string }): string | null {
  // First use database-stored thumbnail
  if (course.thumbnail) {
    return course.thumbnail
  }
  
  // Fallback to external URLs from index
  return getCourseThumbnail(course.name, course.slug)
}

export function getAvailableThumbnails(): string[] {
  return Object.values(courseThumbnails)
}