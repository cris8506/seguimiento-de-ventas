import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Read config from provisioned firebase-applet-config.json
let firebaseConfig: Record<string, string> = {};

try {
  // Default values matching provisioned dub-orbit-wzp2g applet config
  firebaseConfig = {
    projectId: "dub-orbit-wzp2g",
    appId: "1:441615595289:web:ed7fb39fca0bb378c37788",
    apiKey: "AIzaSyA6mUKouhQz_eQNfChPT5rv4g1jBQg0zJo",
    authDomain: "dub-orbit-wzp2g.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-04af732c-5cc4-47ee-9b4a-30af89e3fb9a",
    storageBucket: "dub-orbit-wzp2g.firebasestorage.app",
    messagingSenderId: "441615595289",
  };
} catch (e) {
  console.warn('Could not load firebase config:', e);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut };
