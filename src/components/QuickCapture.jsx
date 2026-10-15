import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useTodos } from '../state/TodosContext.jsx'
import './quickCapture.css'

export default function QuickCapture({ listId = 'general', assignee = '', onAdded, compact = false }) {
  const { addTodo, loading, error } = useTodos()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [failed, setFailed] = useState(false)
  async function save(event) {
    event.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    setStatus('')
    setFailed(false)
    try {
      await addTodo({ text: text.trim(), listId, assignee, dueDate: null, points: 0 })
      setText('')
      setStatus('Saved to your to-dos.')
      onAdded?.()
    } catch {
      setFailed(true)
      setStatus('Could not save. Your thought is still here. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={compact ? 'quick-capture compact' : 'quick-capture'} aria-label="Quickly add a to-do">
      {!compact && <label htmlFor="capture-thought">Add a to-do</label>}
      <form onSubmit={save}>
        <input
          id="capture-thought"
          disabled={busy}
          aria-label="New to-do"
          placeholder={compact ? 'Add a to-do…' : 'Remember to…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          required
        />
        <button className="btn btn-primary" disabled={busy || loading || !!error || !text.trim()}>
          <Plus size={20} aria-hidden="true" />
          {busy ? 'Saving…' : 'Add'}
        </button>
      </form>
      {status && (
        <p className="capture-status" role={failed ? 'alert' : 'status'}>
          {!failed && <Check size={15} aria-hidden="true" />}
          {status}
        </p>
      )}
    </section>
  )
}
