// The dialog focus trap in src/components/Modal.jsx is 25 lines of imperative
// DOM work — querying focusable nodes, deciding which dialog owns a keypress,
// restoring focus on unmount. Nothing exercised it before.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import Modal from '../src/components/Modal.jsx'

function Harness({ onClose = () => {} }) {
  return (
    <Modal onClose={onClose}>
      <h2>Edit to-do</h2>
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </Modal>
  )
}

describe('Modal', () => {
  it('names itself from its heading so a screen reader announces the dialog', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Edit to-do')
  })

  it('moves focus into the dialog on open', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Tab from the last control back to the first', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Shift+Tab from the first control back to the last', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to whatever opened it', async () => {
    const user = userEvent.setup()

    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Modal onClose={() => setOpen(false)}>
              <h2>Edit to-do</h2>
              <button onClick={() => setOpen(false)}>Done</button>
            </Modal>
          )}
        </>
      )
    }

    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(opener).toHaveFocus()
  })

  it('only the topmost dialog handles Escape', async () => {
    const user = userEvent.setup()
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    render(
      <Modal onClose={closeOuter}>
        <h2>Outer</h2>
        <button>Outer button</button>
        <Modal onClose={closeInner}>
          <h2>Inner</h2>
          <button>Inner button</button>
        </Modal>
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(closeOuter).not.toHaveBeenCalled()
  })
})
