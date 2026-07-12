// Schedule tab: month calendar of planned dinners + a tappable week list.

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useMeals } from '../../state/MealsContext.jsx'
import { MONTHS, MONTHS_SHORT, DAYS_SHORT } from '../../lib/family.js'

function dateKeyOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function ScheduleTab({ onPickDay, showNotice }) {
  const { meals, clearMeal } = useMeals()
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [weekOffset, setWeekOffset] = useState(0)

  async function clearDay(dateKey) {
    try {
      await clearMeal(dateKey)
    } catch (e) {
      console.error(e)
      showNotice("Couldn't remove that meal.", 'error')
    }
  }

  function changeMonth(dir) {
    let m = calMonth + dir
    let y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCalMonth(m)
    setCalYear(y)
  }

  function goToday() {
    const t = new Date()
    setCalYear(t.getFullYear())
    setCalMonth(t.getMonth())
    setWeekOffset(0)
  }

  // Build the 6x7 month grid (leading/trailing days from adjacent months).
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const daysInPrev = new Date(calYear, calMonth, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrev - i,
      cur: false,
      year: calMonth === 0 ? calYear - 1 : calYear,
      month: calMonth === 0 ? 11 : calMonth - 1,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true, year: calYear, month: calMonth })
  const trailing = 42 - cells.length
  for (let d = 1; d <= trailing; d++) {
    cells.push({
      day: d,
      cur: false,
      year: calMonth === 11 ? calYear + 1 : calYear,
      month: calMonth === 11 ? 0 : calMonth + 1,
    })
  }

  // Week list (Sunday-start week, shifted by weekOffset).
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push(d)
  }
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  return (
    <div className="schedule-tab">
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button className="btn btn-sm" onClick={goToday}>Today</button>
          <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <h2 className="cal-month-label">{MONTHS[calMonth]} {calYear}</h2>
      </div>

      <div className="card cal-card">
        <div className="cal-dow-row">
          {DAYS_SHORT.map((d) => (
            <div className="cal-dow" key={d}>{d}</div>
          ))}
        </div>
        <div className="cal-days">
          {cells.map((c, i) => {
            const dk = dateKeyOf(c.year, c.month, c.day)
            const meal = meals[dk]
            const isToday =
              c.cur &&
              c.day === now.getDate() &&
              c.month === now.getMonth() &&
              c.year === now.getFullYear()
            return (
              <button
                type="button"
                key={i}
                className="cal-day"
                data-other={!c.cur}
                data-today={isToday}
                onClick={() => onPickDay(dk)}
                aria-label={`${dk}${meal ? ` — ${meal.recipeName}` : ''}`}
              >
                <span className="cal-day-num">{c.day}</span>
                {meal ? (
                  <span className="cal-meal-chip">
                    <span className="cal-meal-chip-name">{meal.recipeName}</span>
                    <span
                      className="cal-clear"
                      role="button"
                      aria-label={`Clear dinner for ${dk}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        clearDay(dk)
                      }}
                    >
                      <X aria-hidden="true" size={11} />
                    </span>
                  </span>
                ) : (
                  <span className="cal-add-hint">+ dinner</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card week-list">
        <div className="week-list-head">
          <span className="week-label">
            {MONTHS_SHORT[weekStart.getMonth()]} {weekStart.getDate()} –{' '}
            {MONTHS_SHORT[weekEnd.getMonth()]} {weekEnd.getDate()}, {weekEnd.getFullYear()}
          </span>
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Previous week">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>Today</button>
            <button className="icon-btn" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Next week">
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        {weekDays.map((d) => {
          const dk = dateKeyOf(d.getFullYear(), d.getMonth(), d.getDate())
          const meal = meals[dk]
          const isToday = d.getTime() === todayMidnight.getTime()
          return (
            <div
              className="week-row"
              data-today={isToday}
              key={dk}
              role="button"
              tabIndex={0}
              onClick={() => onPickDay(dk)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPickDay(dk)
                }
              }}
            >
              <span className="week-dayname">{DAYS_SHORT[d.getDay()]}</span>
              <span className="week-datenum">{d.getDate()}</span>
              {meal ? (
                <>
                  <span className="week-meal">{meal.recipeName}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Clear dinner for ${dk}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      clearDay(dk)
                    }}
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </>
              ) : (
                <span className="week-empty">Tap to plan dinner</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
