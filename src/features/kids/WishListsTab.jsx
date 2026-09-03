import { useState } from 'react'
import { ArrowLeft, ChevronRight, Gift, LockKeyhole, Pencil, Plus, Share2 } from 'lucide-react'
import { useAuth } from '../../state/AuthContext.jsx'
import { useWishItems, useWishLists } from '../../state/WishListsContext.jsx'
import { isParentAccount } from '../../lib/wishLists.js'
import WishEditModal from './WishEditModal.jsx'
import WishShareModal from './WishShareModal.jsx'
import WishItemCard from './WishItemCard.jsx'
import WishPurchasesModal from './WishPurchasesModal.jsx'
import './wishLists.css'

function WishListDetail({ list, onBack }) {
  const { user } = useAuth()
  const actions = useWishLists()
  const { items, loading, error } = useWishItems(list.id)
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)

  return <section className="wish-section" aria-label={list.name}>
    <button className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> All my lists</button>
    <div className="wish-heading">
      <h2>{list.name}</h2>
      <button className="icon-btn" onClick={() => setModal({ kind: 'list' })} aria-label="Edit list"><Pencil size={18} aria-hidden="true" /></button>
    </div>
    <div className="wish-toolbar">
      <button className="btn btn-primary" onClick={() => setModal({ kind: 'item', value: null })}><Plus size={18} aria-hidden="true" /> Add wish</button>
      <button className="btn" onClick={() => setModal({ kind: 'share' })}><Share2 size={18} aria-hidden="true" /> Share list</button>
    </div>
    {loading && <p className="wish-hint" role="status">Loading wishes…</p>}
    {error && <p className="wish-error" role="alert">{error}</p>}
    {!loading && !error && !items.length && <div className="wish-empty card">
      <Gift aria-hidden="true" /><h3>What are you wishing for?</h3><p>Add your first wish to this list.</p>
    </div>}
    <ul className="wish-items">{items.map((item) => <WishItemCard key={item.id} item={item} onEdit={() => setModal({ kind: 'item', value: item })} />)}</ul>
    {isParentAccount(user) && <button className="btn btn-ghost wish-parent" onClick={() => setModal({ kind: 'purchases' })} disabled={loading || Boolean(error)}>
      <LockKeyhole size={16} aria-hidden="true" /> Parent gift tracking
    </button>}
    {modal?.kind === 'list' && <WishEditModal kind="list" value={list} onClose={close}
      onSave={(name) => actions.renameList(list.id, name)} onDelete={() => actions.removeList(list.id)} />}
    {modal?.kind === 'item' && <WishEditModal kind="item" value={modal.value} onClose={close}
      onSave={(fields) => actions.saveWish(list.id, modal.value?.id, fields)}
      onDelete={modal.value ? () => actions.removeWish(list.id, modal.value.id) : undefined} />}
    {modal?.kind === 'share' && <WishShareModal list={list} onClose={close} />}
    {modal?.kind === 'purchases' && <WishPurchasesModal list={list} items={items} onClose={close} />}
  </section>
}

export default function WishListsTab({ kid }) {
  const { lists, loading, error, createList } = useWishLists()
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const mine = lists.filter((list) => list.kid === kid)
  const selected = mine.find((list) => list.id === selectedId)

  if (selected) return <WishListDetail key={selected.id} list={selected} onBack={() => setSelectedId(null)} />

  return <section className="wish-section" aria-label="My wish lists">
    <div className="wish-heading"><h2>My wish lists</h2>
      <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={loading || Boolean(error)}><Plus size={18} aria-hidden="true" /> New list</button>
    </div>
    {loading && <p className="wish-hint" role="status">Loading your lists…</p>}
    {error && <p className="wish-error" role="alert">{error}</p>}
    {!loading && !error && !mine.length && <div className="wish-empty card"><Gift aria-hidden="true" /><h3>A place for your big ideas</h3><p>Make a list for a birthday, a holiday, or just because.</p></div>}
    <ul className="wish-items">{mine.map((list) => <li key={list.id}>
      <button className="wish-list-button card" onClick={() => setSelectedId(list.id)}>
        <Gift aria-hidden="true" /><span><strong>{list.name}</strong><small>{list.shared ? 'Link sharing on' : 'Only in Family'}</small></span><ChevronRight aria-hidden="true" />
      </button>
    </li>)}</ul>
    {creating && <WishEditModal kind="list" onClose={() => setCreating(false)} onSave={async (name) => {
      const id = await createList(kid, name)
      setSelectedId(id)
    }} />}
  </section>
}
