// Bundles the Firestore writes a kid's Today tab needs: toggling a chore/
// task (with point award/revoke and the 1hr undo window on tasks), and
// adding/deleting either. Kept in one place since checking a task off and
// deleting it both need to know whether points were already awarded.

import { db } from '../../firebase.js'
import { setWorkCompletion } from '../../lib/workCompletion.js'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'
import { useKidPoints } from '../../state/KidPointsContext.jsx'
import { isTaskChecked } from './kidsUtils.js'

export function useKidActions(kid) {
  const { updateChore, deleteChore: removeChore } = useChores()
  const { todos, updateTodo, addTodo, deleteTodo: removeTodo } = useTodos()
  const { revokePoints } = useKidPoints()

  async function toggleChore(id, done) {
    await setWorkCompletion(db, 'chore', id, done, kid)
  }

  async function toggleTask(id, done) {
    await setWorkCompletion(db, 'task', id, done, kid)
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
