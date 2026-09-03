import { useState } from 'react'
import { useTurns } from '../../state/TurnsContext.jsx'

export default function TurnControls({ showNotice }) {
  const turns = useTurns()
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  async function advance(kind) {
    if (confirm !== kind) return setConfirm(kind)
    setBusy(true)
    try { await (kind === 'movie' ? turns.advanceMovieTurn() : turns.advanceDogTurn()); setConfirm(null) }
    catch { showNotice('Could not change the turn.', 'error') }
    finally { setBusy(false) }
  }
  return <section className="workspace-surface parent-turns"><div className="surface-heading"><h2>Whose turn?</h2></div>
    {[['movie', 'Movie night', turns.moviePicker], ['dog', 'Dog feeding', turns.dogFeeder]].map(([kind, label, who]) => <div className="work-row" key={kind}><div className="work-edit"><strong>{label}</strong><small>{who}</small></div><button className="btn" disabled={busy} onClick={() => advance(kind)}>{confirm === kind ? 'Confirm next person' : 'Next person'}</button>{confirm === kind && <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>}</div>)}
  </section>
}
