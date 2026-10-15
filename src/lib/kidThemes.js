// Per-kid personality. Each kid gets an accent color, an emoji avatar, and
// their own celebration when a checklist is finished.
//
// The old static app carried a much larger config here — per-kid tab labels
// ("⛏️ Today"), progress-bar captions ("XP Progress", "Force Meter"), toast
// wording and empty-state lines. The September 2026 home redesign replaced
// those screens with plain shared labels, which left every one of those
// fields rendering nowhere, so they were removed rather than left to rot.
// If you want that voice back, it is a design decision, not a restore:
// `git show 9675d2c:src/lib/kidThemes.js` has the full original wording.

const KID_THEMES = {
  Liam: {
    emoji: '🧑‍🦰',
    color: '#5d9c2a',
    allDoneIcon: '🏆',
    allDoneMsg: 'Achievement Unlocked!',
    particles: ['⛏️', '🟩', '💎'],
  },
  Livi: {
    emoji: '👩‍🦰',
    color: '#dc2626',
    allDoneIcon: '🐞',
    allDoneMsg: 'You did it! 🌸',
    particles: ['🌸', '🐞', '🌺'],
  },
  Spencer: {
    emoji: '👦🏼',
    color: '#d4a017',
    allDoneIcon: '🚀',
    allDoneMsg: 'Mission Complete!',
    particles: ['⭐', '🚀', '✨'],
  },
}

export function kidTheme(kidName) {
  return KID_THEMES[kidName] || KID_THEMES.Liam
}
