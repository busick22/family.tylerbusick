import { useSearchParams } from 'react-router-dom'
import { todayStr } from '../../lib/family.js'
import { validDate } from '../../lib/planning.js'

export function usePlanDate() {
  const [params, setParams] = useSearchParams()
  const date = validDate(params.get('date')) ? params.get('date') : todayStr()
  const setDate = (next) =>
    setParams((previous) => {
      const copy = new URLSearchParams(previous)
      copy.set('date', next)
      return copy
    })
  return [date, setDate]
}
