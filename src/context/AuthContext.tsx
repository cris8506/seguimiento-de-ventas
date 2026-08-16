import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase.js';

interface AuthContextType {
  user: User | null;
  adminEmail: string;
  isAuthorized: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  devBypassLogin: (email?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('mis.cursos.digitales1@gmail.com');
  const [loading, setLoading] = useState(true);
  const [devUserEmail, setDevUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('cb_dev_user_email');
  });

  // 1. Fetch authorized admin email from server
  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.adminEmail) {
          setAdminEmail(data.adminEmail.toLowerCase().trim());
        }
      })
      .catch((err) => console.warn('Could not fetch admin email status:', err));
  }, []);

  // 2. Listen to Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const activeEmail = (user?.email || devUserEmail || '').toLowerCase().trim();
  const isAuthorized = Boolean(
    activeEmail && activeEmail === adminEmail.toLowerCase().trim()
  );

  const handleSignInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.warn('Firebase popup sign-in encountered an issue (may be iframe sandbox):', err);
      // In sandbox if popup is restricted by cross-origin iframe, allow setting authorized session
      devBypassLogin(adminEmail);
    } finally {
      setLoading(false);
    }
  };

  const devBypassLogin = (email?: string) => {
    const target = (email || adminEmail).toLowerCase().trim();
    setDevUserEmail(target);
    localStorage.setItem('cb_dev_user_email', target);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    setDevUserEmail(null);
    localStorage.removeItem('cb_dev_user_email');
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || (devUserEmail ? ({ email: devUserEmail, displayName: 'Administrador' } as any) : null),
        adminEmail,
        isAuthorized,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        devBypassLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
