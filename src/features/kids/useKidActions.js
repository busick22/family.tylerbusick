// Bundles the Firestore writes a kid's Today tab needs: toggling a chore/
// task (with point award/revoke and the 1hr undo window on tasks), and
// adding/deleting either. Kept in one place since checking a task off and
// deleting it both need to know whether points were already awarded.

import { serverTimestamp } from 'firebase/firestore'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { taskCompleteDelayMs, isTaskChecked } from './kidsUtils.js'

export function useKidActions(kid) {
  const { chores, updateChore, deleteChore: removeChore } = useChores()
  const { todos, updateTodo, addTodo, deleteTodo: removeTodo } = useTodos()
  const { awardPoints, revokePoints } = useKidPoints()

  async function toggleChore(id, done) {
    const chore = chores.find((c) => c.id === id)
    if (done) {
      await updateChore(id, { done: true, completedAt: serverTimestamp(), completedBy: kid })
      const pts = chore?.points || 0
      if (pts > 0) await awardPoints(kid, pts, chore?.name || 'Chore', 'chore', id)
    } else {
      await updateChore(id, { done: false, completedAt: null, completedBy: '' })
    }
  }

  async function toggleTask(id, done) {
    const task = todos.find((t) => t.id === id)
    const pts = task?.points || 0
    if (done) {
      await updateTodo(id, {
        done: true,
        completedAt: serverTimestamp(),
        completedBy: kid,
        pendingDoneUntil: new Date(Date.now() + taskCompleteDelayMs()).toISOString(),
        pendingDoneBy: kid,
      })
      if (pts > 0) await awardPoints(kid, pts, task?.text || 'Task', 'task', id)
    } else {
      const awardedTo = task?.pendingDoneBy || task?.completedBy || kid
      await updateTodo(id, { done: false, completedAt: null, completedBy: '', pendingDoneUntil: null, pendingDoneBy: '' })
      if (pts > 0 && awardedTo) await revokePoints(awardedTo, 'task', id)
    }
  }

  async function addTask(text, dueDate) {
    await addTodo({ text, assignee: kid, dueDate: dueDate || null, points: 0 })
  }

  async function editTask(id, text, dueDate) {
    await updateTodo(id, { text, dueDate: dueDate || null })
  }

  async function deleteTask(id) {
    const task = todos.find((t) => t.id === id)
    if (!task) return
    const awardedTo = task.pendingDoneBy || task.completedBy || ''
    if ((task.points || 0) > 0 && awardedTo && isTaskChecked(task)) await revokePoints(awardedTo, 'task', id)
    await removeTodo(id)
  }

  async function editChore(id, name, day) {
    await updateChore(id, { name, day })
  }

  async function deleteChore(id) {
    await removeChore(id)
  }

  async function completeChoreNow(id) {
    await toggleChore(id, true)
  }

  return { toggleChore, toggleTask, addTask, editTask, deleteTask, editChore, deleteChore, completeChoreNow }
}
