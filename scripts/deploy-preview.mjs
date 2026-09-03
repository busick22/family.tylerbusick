import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const branch = 'codex/planning-first-redesign'
const current = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (current !== branch) {
  console.error(`Preview deployment requires ${branch}; current branch is ${current || 'detached HEAD'}.`)
  process.exit(1)
}
const changes = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
if (changes) {
  console.error('Commit the intended changes before publishing so the preview matches a saved branch revision.')
  process.exit(1)
}

// Hosting only. Never publishes the live channel or deploys database rules.
// Auth is in a DIFFERENT project: do not let Hosting sync the wrong allowlist.
const steps = [
  ['npm', ['run', 'lint']],
  ['npm', ['test']],
  ['npm', ['run', 'build']],
  ['firebase', ['hosting:channel:deploy', 'planning-first', '--project', 'busick-recipes',
    '--config', 'firebase.json', '--expires', '30d', '--no-authorized-domains']],
]
for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) console.error(result.error.message)
  if (result.status !== 0) process.exit(result.status || 1)
}
