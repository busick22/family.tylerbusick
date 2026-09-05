// One chore or task row inside a kid's Today list: checkbox, tappable body
// (edit), points chip, tap-to-confirm delete. Checking it off pops a little
// themed particle burst so it feels celebratory without per-kid physics.

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function KidItemRow({
  label,
  meta,
  checked,
  points,
  particles,
  onToggle,
  onEdit,
  onDelete,
}) {
  const [confirming, setConfirming] = useState(false)
  const [bursting, setBursting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Completion goes through a Firestore transaction, which — unlike an
  // ordinary write — always waits for the server instead of applying locally
  // first. Showing `pending` until the real value catches up keeps the tick
  // and the celebration instant on a slow kitchen connection.
  const [pending, setPending] = useState(null)
  const shown = pending === null ? checked : pending
  useEffect(() => {
    setPending((p) => (p === null || p === checked ? null : p))
  }, [checked])

  async function handleToggle(e) {
    const next = e.target.checked
    setBusy(true)
    setError('')
    setPending(next)
    if (next && particles?.length) {
      setBursting(true)
      setTimeout(() => setBursting(false), 650)
    }
    try {
      await onToggle(next)
    } catch {
      setPending(null)
      setBursting(false)
      setError('Could not update this item. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div><div className={`k-row ${shown ? 'done' : ''} ${bursting ? 'k-row-burst' : ''}`}>
      <label className="work-check">
      <input
        type="checkbox"
        className="k-check"
        checked={shown}
        onChange={handleToggle}
        disabled={busy}
        aria-label={`Mark ${label} ${shown ? 'incomplete' : 'complete'}`}
      />
      </label>
      {bursting && (
        <span className="k-row-particles" aria-hidden="true">
          {particles.map((p, i) => (
            <span key={i} className="k-row-particle" style={{ '--i': i }}>
              {p}
            </span>
          ))}
        </span>
      )}
      <button type="button" className="k-row-main" onClick={() => onEdit?.()}>
        <span className="k-row-label">{label}</span>
        {meta && <span className="k-meta">{meta}</span>}
      </button>
      {typeof points === 'number' && points > 0 && <span className="task-points-chip">{points} pts</span>}
      {onDelete &&
        (confirming ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => onDelete()}
            onBlur={() => setConfirming(false)}
          >
            Really?
          </button>
        ) : (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${label}`}
          >
            <X aria-hidden="true" size={15} />
          </button>
        ))}
    </div>{error && <p className="kid-row-error" role="alert">{error}</p>}</div>
  )
}
