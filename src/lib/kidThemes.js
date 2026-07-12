// Per-kid personality — ported from the old app's KID config. Each kid
// gets their own accent color, tab labels, and celebratory messages so the
// same Today/Points/History shell feels custom-made for them.

export const KID_THEMES = {
  Liam: {
    emoji: '🧑‍🦰',
    color: '#5d9c2a',
    age: 'Age 10',
    vibe: '⛏️ Minecraft',
    choreLabel: 'Daily Quests',
    tabToday: '⛏️ Today',
    tabPoints: '⭐ Points',
    tabHistory: '📅 History',
    progressLabel: 'XP Progress',
    allDoneIcon: '🏆',
    allDoneMsg: 'Achievement Unlocked!',
    allDoneSub: 'You mined through it all!',
    toastDone: 'Level Up! ⭐',
    toastTask: 'Added to inventory!',
    emptyToday: 'No quests today — go explore! 🌲',
    addPlaceholder: 'New quest item…',
    particles: ['⛏️', '🟩', '💎'],
  },
  Livi: {
    emoji: '👩‍🦰',
    color: '#dc2626',
    age: 'Age 8',
    vibe: '🐞 Ladybugs',
    choreLabel: 'Chores',
    tabToday: '🌸 Today',
    tabPoints: '⭐ Points',
    tabHistory: '📅 History',
    progressLabel: "Today's Progress",
    allDoneIcon: '🐞',
    allDoneMsg: 'You did it! 🌸',
    allDoneSub: 'Every spot is sparkling!',
    toastDone: 'Great job! 🌟',
    toastTask: 'Added! 🐞',
    emptyToday: 'Nothing today — enjoy your day! 🦋',
    addPlaceholder: 'Add a task…',
    particles: ['🌸', '🐞', '🌺'],
  },
  Spencer: {
    emoji: '👦🏼',
    color: '#d4a017',
    age: 'Age 5',
    vibe: '⭐ Star Wars',
    choreLabel: 'Assignments',
    tabToday: '🚀 Today',
    tabPoints: '⭐ Points',
    tabHistory: '📅 History',
    progressLabel: 'Force Meter',
    allDoneIcon: '🚀',
    allDoneMsg: 'Mission Complete!',
    allDoneSub: 'The Force is strong with you.',
    toastDone: 'Well done, Padawan! ⚡',
    toastTask: 'Mission logged!',
    emptyToday: 'No missions today — the galaxy awaits! 🌌',
    addPlaceholder: 'Enter mission…',
    particles: ['⭐', '🚀', '✨'],
  },
}

export function kidTheme(kidName) {
  return KID_THEMES[kidName] || KID_THEMES.Liam
}
