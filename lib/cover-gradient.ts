const COVER_GRADIENTS = [
  'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500',
  'bg-gradient-to-br from-emerald-500 via-green-500 to-lime-500',
  'bg-gradient-to-br from-orange-500 via-red-500 to-rose-500',
  'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500',
  'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500',
  'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
  'bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500',
]

export function getDeterministicGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[index]
}
