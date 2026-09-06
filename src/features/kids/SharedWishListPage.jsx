import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { db } from '../../firebase.js'
import { useWishItems } from '../../state/WishListsContext.jsx'
import WishItemCard from './WishItemCard.jsx'
import './wishLists.css'

function SharedWishes({ list }) {
  const { items, loading, error } = useWishItems(list.id)
  return <>
    <p className="wish-eyebrow">{list.kid}’s wish list</p>
    <h1>{list.name}</h1>
    {loading && <p role="status">Loading wishes…</p>}
    {error && <p className="wish-error" role="alert">This list is unavailable. The owner may have turned off sharing.</p>}
    {!loading && !error && !items.length && <div className="wish-empty card"><Gift aria-hidden="true" /><h2>No wishes yet</h2><p>Check back later.</p></div>}
    <ul className="wish-items">{items.map((item) => <WishItemCard key={item.id} item={item} />)}</ul>
  </>
}

export default function SharedWishListPage() {
  const { listId } = useParams()
  const [state, setState] = useState({ id: null, list: null, loading: true })

  useEffect(() => {
    if (!/^[A-Za-z0-9]{20}$/.test(listId || '')) {
      setState({ id: listId, list: null, loading: false })
      return undefined
    }
    return onSnapshot(doc(db, 'wishLists', listId), (snapshot) => {
      const data = snapshot.data()
      setState({ id: listId, list: data?.shared && !data.archived ? { ...data, id: snapshot.id } : null, loading: false })
    }, () => setState({ id: listId, list: null, loading: false }))
  }, [listId])

  useEffect(() => {
    const previous = document.title
    document.title = 'Wish list · Family'
    return () => { document.title = previous }
  }, [])

  const loading = state.id !== listId || state.loading
  return <main className="shared-wish-page">
    <div className="shared-wish-shell">
      <div className="wish-brand"><Gift aria-hidden="true" /> Family wishes</div>
      {loading ? <p role="status">Opening wish list…</p> : state.list ? <SharedWishes key={listId} list={state.list} /> : <div className="wish-empty card">
        <Gift aria-hidden="true" /><h1>This list isn’t available</h1><p>The link may be incomplete, or sharing may be turned off. Ask the family for a current link.</p>
      </div>}
    </div>
  </main>
}
