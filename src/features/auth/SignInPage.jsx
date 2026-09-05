import { useState } from 'react'
import { useAuth } from '../../state/AuthContext.jsx'
import { BrandMark } from '../../app/Brand.jsx'
import './auth.css'

export default function SignInPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin">
      <div className="signin-scene" aria-hidden="true" />

      <div className="signin-card page-enter">
        <div className="signin-brand">
          <BrandMark size={48} />
          <h1>Family</h1>
          <p>Plan the week together.</p>
        </div>

        <button className="btn signin-google" onClick={handleSignIn} disabled={busy}>
          <GoogleGlyph />
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="error-note signin-error">{error}</p>}

        <p className="signin-foot">Family sign-in only</p>
      </div>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-6.9-5.1L1.2 17C3.1 21.1 7.2 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.1 14.3c-.3-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.2 6.7C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c2.3 0 3.8 1 4.7 1.8L20 3.2C18 1.2 15.2 0 12 0 7.2 0 3.1 2.9 1.2 6.7l3.9 3c.9-2.9 3.7-5 6.9-5z"
      />
    </svg>
  )
}
