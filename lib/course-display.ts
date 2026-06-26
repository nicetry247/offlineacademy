export interface CourseTitleLike {
  name: string
  displayName?: string | null
}

export function getCourseDisplayName(course: CourseTitleLike): string {
  return course.displayName?.trim() || course.name
}
