// The Lists empty state. This is the screen that shipped a stray "0" on it:
// `{all.length && <p>…</p>}` renders the number 0 when the list is empty,
// because 0 is falsy but is still a valid React child. The first test below
// fails against that version of the code.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = { todos: [], chores: [], loading: false, error: '' }

vi.mock('../src/state/TodosContext.jsx', () => ({
  useTodos: () => ({
    todos: state.todos,
    loading: state.loading,
    error: state.error,
    addTodo: vi.fn(),
  }),
}))
vi.mock('../src/state/ChoresContext.jsx', () => ({
  useChores: () => ({
    chores: state.chores,
    loading: state.loading,
    error: state.error,
    resetWeek: vi.fn(),
  }),
}))
vi.mock('../src/state/TodoListsContext.jsx', () => ({
  useTodoLists: () => ({ lists: [{ id: 'general', name: 'General' }] }),
  normalizedTodoListId: (id) => id || 'general',
}))
vi.mock('../src/state/MembersContext.jsx', () => ({
  useMembers: () => ({ members: [], memberColor: () => '#888' }),
}))
vi.mock('../src/state/NoticeContext.jsx', () => ({ useNotice: () => vi.fn() }))

const { default: WorkPage } = await import('../src/features/planning/WorkPage.jsx')

const renderPage = (route = '/lists') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <WorkPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  state.todos = []
  state.chores = []
  state.loading = false
  state.error = ''
})

describe('Lists empty states', () => {
  it('shows nothing but the invitation when there is no work at all', () => {
    renderPage()
    const panel = document.querySelector('.empty-workspace')
    expect(panel).toHaveTextContent('No to-dos yet')
    // The regression guard. `{all.length && <p>…</p>}` renders the number 0
    // when the list is empty, and it lands right against the heading text —
    // so this checks the panel's own text for a digit, not a spaced "0".
    expect(panel.textContent).not.toMatch(/\d/)
    expect(panel).not.toHaveTextContent('Try another person')
  })

  it('offers a way out when the list is non-empty but the filter hides everything', () => {
    state.todos = [{ id: 't1', text: 'Sign the form', done: true, assignee: 'Liam' }]
    renderPage('/lists?who=Nobody')
    const panel = document.querySelector('.empty-workspace')
    expect(panel).toHaveTextContent('Nothing in this view')
    expect(panel).toHaveTextContent('Try another person, list, or view.')
  })

  it('reports a load failure instead of pretending the list is empty', () => {
    state.error = 'Could not load your to-dos. Check your connection or sign in again.'
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your to-dos')
    expect(document.querySelector('.empty-workspace')).toBeNull()
  })

  it('says it is loading rather than showing an empty list', () => {
    state.loading = true
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading to-dos…')
    expect(document.querySelector('.empty-workspace')).toBeNull()
  })
})
