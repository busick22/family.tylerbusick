import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no layout engine, so getClientRects() is empty for every element.
// Modal.jsx uses `node.getClientRects().length` to skip controls that are
// hidden, which under jsdom would mean "every control is hidden" and the focus
// trap would find nothing to focus. Report a box for anything not explicitly
// display:none, which is the distinction the component actually cares about.
//
// Caveat: this means the tests exercise the trap's ordering and wrapping, not
// its real visibility filtering — that still needs a browser.
Element.prototype.getClientRects = function getClientRects() {
  const style = window.getComputedStyle(this)
  if (style.display === 'none' || style.visibility === 'hidden' || this.hidden) return []
  return [{ width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0 }]
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
