import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { KIDS, todayStr } from './family.js'

// Every checklist uses the same atomic completion and points behavior.
// No collection/schema migration: preserve the existing documents and history.
export async function setWorkCompletion(db, kind, id, done, actor = '') {
  if (!['task', 'chore'].includes(kind)) throw new Error('Unknown work type')
  const ref = doc(db, kind === 'task' ? 'todos' : 'chores', id)
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('This item was removed. Refresh your list.')
    const item = snapshot.data()
    if (Boolean(item.done) === done) return
    const completedBy = done ? (KIDS.includes(actor) ? actor : item.assignee && item.assignee !== 'Kids' ? item.assignee : actor) : ''
    const awardedTo = done ? completedBy : item.pendingDoneBy || item.completedBy
    const points = Number(item.points) || 0
    const kidRef = KIDS.includes(awardedTo) ? doc(db, 'kidPoints', awardedTo) : null
    const kidSnapshot = kidRef ? await transaction.get(kidRef) : null
    if (kidRef) {
      const history = [...(kidSnapshot.data()?.history || [])]
      if (done && points > 0) history.push({ points, label: item.text || item.name, type: kind, refId: id, date: todayStr(), ts: Date.now() })
      if (!done) {
        let index = -1
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].type === kind && history[i].refId === id) { index = i; break }
        }
        if (index >= 0) history.splice(index, 1)
      }
      if ((!done && kidSnapshot.exists()) || (done && points > 0)) transaction.set(kidRef, { history }, { merge: true })
    }
    const fields = { done, completedAt: done ? serverTimestamp() : null, completedBy }
    if (kind === 'task') Object.assign(fields, {
      pendingDoneUntil: done ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null,
      pendingDoneBy: done ? completedBy : '',
    })
    transaction.update(ref, fields)
  })
}
