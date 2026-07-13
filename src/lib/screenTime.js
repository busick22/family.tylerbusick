// Screen-time math — pure helpers shared by the kid timer card and the
// parent controls. Docs live in screenTime/{kidName}: { dailyBudgetMs,
// usedMsToday, lastResetDate ('YYYY-MM-DD'), bonusMsToday, bonusDate,
// activeSessionStart (epoch ms or null) }.

import { todayStr } from './family.js'

// Used only when a kid has no screenTime doc yet. Once a parent sets a
// budget, the stored value wins.
export const DEFAULT_BUDGETS_MS = {
  Liam: 40 * 60 * 1000,
  Livi: 40 * 60 * 1000,
  Spencer: 30 * 60 * 1000,
}
export const FALLBACK_DAILY_BUDGET_MS = 60 * 60 * 1000

export function defaultScreenTime(kidName) {
  return {
    dailyBudgetMs: DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS,
    usedMsToday: 0,
    lastResetDate: todayStr(),
    bonusMsToday: 0,
    bonusDate: todayStr(),
    activeSessionStart: null,
  }
}

// Live remaining ms from wall-clock time. Flags a needed midnight reset so
// the caller can persist it.
export function computeTimerView(data, kidName) {
  const today = todayStr()
  let usedMs = data.usedMsToday || 0
  let needsReset = false
  if (data.lastResetDate !== today) {
    usedMs = 0
    needsReset = true
  }
  const baseBudget = data.dailyBudgetMs || DEFAULT_BUDGETS_MS[kidName] || FALLBACK_DAILY_BUDGET_MS
  const bonus = data.bonusDate === today ? data.bonusMsToday || 0 : 0
  const budget = baseBudget + bonus
  let remaining = budget - usedMs
  const running = !!data.activeSessionStart
  if (running) remaining -= Math.max(0, Date.now() - data.activeSessionStart)
  return { remaining, budget, usedMs, running, needsReset }
}
