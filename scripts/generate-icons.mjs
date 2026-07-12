// Renders public/favicon.svg into the PNG sizes the PWA manifest needs.
// Run once (or after changing the favicon): `npm run icons`

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const publicDir = path.join(root, 'public')
const svg = await readFile(path.join(publicDir, 'favicon.svg'))

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  await sharp(svg, { density: Math.ceil((size / 64) * 72) })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, file))
  console.log(`✓ ${file}`)
}
