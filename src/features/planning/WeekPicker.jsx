import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayStr } from '../../lib/family.js'
import { shiftDate } from '../../lib/planning.js'

export default function WeekPicker({ date, onChange }) {
  return <div className="week-picker" aria-label="Choose week">
    <button className="icon-btn" aria-label="Previous week" onClick={() => onChange(shiftDate(date, -7))}><ChevronLeft aria-hidden="true" /></button>
    <button className="btn" onClick={() => onChange(todayStr())}>Today</button>
    <button className="icon-btn" aria-label="Next week" onClick={() => onChange(shiftDate(date, 7))}><ChevronRight aria-hidden="true" /></button>
  </div>
}
