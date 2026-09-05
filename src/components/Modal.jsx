import { useEffect, useId, useRef } from 'react'

// Keep keyboard navigation inside the active dialog and return to its opener.
export default function Modal({ onClose, children, width }) {
  const dialog = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    const heading = element.querySelector('h1, h2, h3')
    if (heading) { heading.id ||= titleId; element.setAttribute('aria-labelledby', heading.id) }
    const focusable = () => [...element.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter(node => node.getClientRects().length)
    if (!element.contains(document.activeElement)) (focusable()[0] || element).focus()
    function onKey(event) {
      // Nested dialogs leave their parent mounted; only the top one handles keys.
      if ([...document.querySelectorAll('[aria-modal="true"]')].at(-1) !== element) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current() }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0], last = items.at(-1)
      if (!first) { event.preventDefault(); element.focus() }
      else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('keydown', onKey, true); if (opener?.isConnected) opener.focus() }
  }, [titleId])
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div ref={dialog} className="modal" role="dialog" aria-modal="true" aria-label="Family dialog" tabIndex={-1} style={width ? { width } : undefined}>{children}</div>
  </div>
}
