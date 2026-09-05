// Bundles the Firestore writes a kid's Today tab needs: toggling a chore/
// task (with point award/revoke and the 1hr undo window on tasks), and
// adding/deleting either. Kept in one place since checking a task off and
// deleting it both need to know whether points were already awarded.

import { db } from '../../firebase.js'
import { deleteWork, setWorkCompletion } from '../../lib/workCompletion.js'
import { useChores } from '../../state/ChoresContext.jsx'
import { useTodos } from '../../state/TodosContext.jsx'

export function useKidActions(kid) {
  const { updateChore, deleteChore: removeChore } = useChores()
  const { updateTodo, addTodo } = useTodos()

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

  // Deleting and taking back any points it awarded happen together, so a
  // failure part-way can't leave the kid holding points for a deleted task.
  async function deleteTask(id) {
    await deleteWork(db, 'task', id)
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
