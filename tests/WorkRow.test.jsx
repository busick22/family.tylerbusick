// WorkRow ticks the box immediately and only rolls back if the Firestore
// transaction actually fails. That optimistic path is the thing everyone taps
// all day on the tablet, and nothing covered it.
//
// The contexts are mocked rather than exported from the app, so this stays a
// test of the row's behavior and doesn't widen the production API.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const toggleTodo = vi.fn()
const toggleChore = vi.fn()
const showNotice = vi.fn()

vi.mock('../src/state/TodosContext.jsx', () => ({ useTodos: () => ({ toggleTodo }) }))
vi.mock('../src/state/ChoresContext.jsx', () => ({ useChores: () => ({ toggleChore }) }))
vi.mock('../src/state/NoticeContext.jsx', () => ({ useNotice: () => showNotice }))

const { default: WorkRow } = await import('../src/features/planning/WorkRow.jsx')

const task = { id: 't1', kind: 'task', title: 'Sign the field trip form', done: false, points: 0 }
const renderRow = (item) => render(<WorkRow item={item} onEdit={() => {}} />)

beforeEach(() => {
  toggleTodo.mockReset()
  toggleChore.mockReset()
  showNotice.mockReset()
})

describe('WorkRow', () => {
  it('ticks the box before the write resolves', async () => {
    const user = userEvent.setup()
    let resolveWrite
    toggleTodo.mockReturnValue(new Promise((r) => (resolveWrite = r)))
    renderRow(task)

    const box = screen.getByRole('checkbox')
    expect(box).not.toBeChecked()
    await user.click(box)

    // Still in flight — but the row already shows as done.
    expect(box).toBeChecked()
    expect(toggleTodo).toHaveBeenCalledWith('t1', true, undefined)
    resolveWrite()
  })

  it('rolls the tick back and warns when the write fails', async () => {
    const user = userEvent.setup()
    toggleTodo.mockRejectedValue(new Error('offline'))
    renderRow(task)

    const box = screen.getByRole('checkbox')
    await user.click(box)

    await waitFor(() => expect(box).not.toBeChecked())
    expect(showNotice).toHaveBeenCalledWith('Could not update this to-do. Please try again.', 'error')
  })

  it('asks who earned the points before completing shared, point-bearing work', async () => {
    const user = userEvent.setup()
    toggleTodo.mockResolvedValue(undefined)
    renderRow({ ...task, points: 5, assignee: 'Kids', title: 'Tidy the playroom' })

    await user.click(screen.getByRole('checkbox'))

    // No write yet — it has to know which kid gets the 5 points first.
    expect(toggleTodo).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Who completed this?')

    await user.click(screen.getByRole('button', { name: 'Livi' }))
    expect(toggleTodo).toHaveBeenCalledWith('t1', true, 'Livi')
  })

  it('routes a repeating chore to the chores context, not the to-dos one', async () => {
    const user = userEvent.setup()
    toggleChore.mockResolvedValue(undefined)
    renderRow({ id: 'c1', kind: 'chore', title: 'Feed the dog', day: 'Monday', done: false, points: 0 })

    await user.click(screen.getByRole('checkbox'))
    expect(toggleChore).toHaveBeenCalledWith('c1', true, undefined)
    expect(toggleTodo).not.toHaveBeenCalled()
  })
})
