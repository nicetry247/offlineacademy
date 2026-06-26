import { scanCoursesDirectory, getCoursesRootPath } from '@/lib/scanner'
import { prisma } from '@/lib/prisma'

async function main() {
  const coursesRoot = await getCoursesRootPath()
  console.log('Starting course directory scan...')
  console.log('Scanning: ' + coursesRoot)
  
  const startTime = Date.now()
  const result = await scanCoursesDirectory()
  const duration = Date.now() - startTime

  console.log('\nScan Results:')
  console.log('  Courses: ' + result.coursesCreated + ' created, ' + result.coursesUpdated + ' updated')
  console.log('  Modules: ' + result.modulesCreated + ' created, ' + result.modulesUpdated + ' updated')
  console.log('  Lessons: ' + result.lessonsCreated + ' created, ' + result.lessonsUpdated + ' updated')
  console.log('  Duration: ' + duration + 'ms')

  if (result.errors.length > 0) {
    console.log('\nErrors:')
    result.errors.forEach(err => console.log('  - ' + err))
  }

  if (result.coursesCreated === 0 && result.modulesCreated === 0 && result.lessonsCreated === 0) {
    console.log('\nNo new content found. Database is up to date.')
  } else {
    console.log('\nScan completed successfully!')
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('Scan failed:', error)
  await prisma.$disconnect()
  process.exit(1)
})