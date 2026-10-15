import { ExternalLink, Pencil } from 'lucide-react'
import { formatWishPrice, safeStoreLink } from '../../lib/wishLists.js'

export default function WishItemCard({ item, onEdit, children }) {
  const link = safeStoreLink(item.link)
  return (
    <li className="wish-item card">
      <div className="wish-item-heading">
        <h3>{item.name}</h3>
        {item.price != null && <span className="wish-price">{formatWishPrice(item.price)}</span>}
        {onEdit && (
          <button className="icon-btn wish-edit" onClick={onEdit} aria-label={`Edit ${item.name}`}>
            <Pencil size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {item.notes && <p className="wish-notes">{item.notes}</p>}
      {link && (
        <div className="wish-actions">
          {link && (
            <a
              className="btn btn-ghost"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <ExternalLink size={16} aria-hidden="true" /> View in store
            </a>
          )}
        </div>
      )}
      {children}
    </li>
  )
}
