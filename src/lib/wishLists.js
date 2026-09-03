// Public wish fields only. Purchase details never belong in these documents.
export const WISH_LIMITS = { listName: 80, name: 120, link: 2000, notes: 1000, purchaser: 100 }

export function storeLink(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) {
    throw new Error('Use a store link starting with https:// or http://.')
  }
  if (url.href.length > WISH_LIMITS.link) throw new Error('That store link is too long.')
  return url.href
}

export function safeStoreLink(value) {
  try { return storeLink(value) } catch { return '' }
}

export function wishPrice(value) {
  if (value === '' || value == null) return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999.99) {
    throw new Error('Enter a price between $0 and $999,999.99, or leave it blank.')
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function wishFields(input) {
  const name = String(input.name || '').trim()
  const notes = String(input.notes || '').trim()
  if (!name || name.length > WISH_LIMITS.name) throw new Error('Give your wish a name (up to 120 characters).')
  if (notes.length > WISH_LIMITS.notes) throw new Error('Keep notes to 1,000 characters.')
  return { name, notes, link: storeLink(input.link), price: wishPrice(input.price) }
}

export function formatWishPrice(price) {
  return price == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

export function wishListName(value) {
  const name = String(value || '').trim()
  if (!name || name.length > WISH_LIMITS.listName) throw new Error('Give your list a name (up to 80 characters).')
  return name
}

export function sharedWishUrl(id) {
  return `${window.location.origin}/wish-lists/${encodeURIComponent(id)}`
}

export function isParentAccount(user) {
  return user?.emailVerified === true && user.email?.toLowerCase() === 'busick22@gmail.com'
}
