// Paint the right theme before React loads to avoid a color flash.
// Defaults to 'light' — this app runs on a kitchen tablet and should read
// bright and cheerful out of the box, unlike the dark-first sibling apps.
try {
  document.documentElement.dataset.theme = localStorage.getItem('family:theme') || 'light'
} catch {
  document.documentElement.dataset.theme = 'light'
}
