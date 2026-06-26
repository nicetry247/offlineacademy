export function saveProgressFn(lessonId: string, courseId: string, moduleId: string, position: number) {
  return fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonId,
      courseId,
      moduleId,
      position,
      completed: false
    })
  })
}

export function markCompleteFn(lessonId: string, courseId: string, moduleId: string, position: number) {
  return fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonId,
      courseId,
      moduleId,
      position,
      completed: true
    })
  })
}