// Firebase's documented mock-IDP flow, restricted to the local demo emulator:
// https://firebase.google.com/docs/emulator-suite/connect_auth#non-interactive_testing_3
// This entry is not imported by the application or included in Vite's build.
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../src/firebase.js'

document.querySelector('#demo-sign-in').addEventListener('click', async () => {
  const status = document.querySelector('#result')
  if (
    !import.meta.env.DEV ||
    import.meta.env.VITE_FIREBASE_EMULATORS !== 'true' ||
    auth.app.options.projectId !== 'demo-family-wishes' ||
    !auth.emulatorConfig
  ) {
    status.textContent = 'Start the local demo emulators and enable VITE_FIREBASE_EMULATORS first.'
    return
  }
  try {
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(
        JSON.stringify({
          sub: 'demo-parent',
          email: 'busick22@gmail.com',
          email_verified: true,
          name: 'Demo parent',
        }),
      ),
    )
    window.location.assign('/kids?kid=Liam')
  } catch (error) {
    status.textContent = error.message
  }
})
