// One chore or task row inside a kid's Today list: checkbox, tappable body
// (edit), points chip, tap-to-confirm delete. Checking it off pops a little
// themed particle burst so it feels celebratory without per-kid physics.

import { useState } from 'react'
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

  function handleToggle(e) {
    const next = e.target.checked
    if (next && particles?.length) {
      setBursting(true)
      setTimeout(() => setBursting(false), 650)
    }
    onToggle(next)
  }

  return (
    <div className={`k-row ${checked ? 'done' : ''} ${bursting ? 'k-row-burst' : ''}`}>
      <input
        type="checkbox"
        className="k-check"
        checked={checked}
        onChange={handleToggle}
        aria-label={`Mark ${label} ${checked ? 'incomplete' : 'complete'}`}
      />
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
    </div>
  )
}
