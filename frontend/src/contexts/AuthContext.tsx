import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/types/index';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  email: string;
  role?: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
    const res = await fetch(`${API_BASE}/profiles/${userId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in getProfile:', err);
    return null;
  }
}

export interface SignUpParams {
  email: string;
  password?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    paramsOrEmail: string | SignUpParams,
    password?: string,
    fullName?: string
  ) => Promise<{ error: Error | null; studentId?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    // Check localStorage first (remember me), then sessionStorage (session-only)
    const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUser({ id: data.profile.id, email: data.profile.email, role: data.profile.role });
            setProfile(data.profile);
          } else if (data.user) {
            setUser(data.user);
            getProfile(data.user.id).then(setProfile);
          }
        } else {
          localStorage.removeItem('tatti_token');
          sessionStorage.removeItem('tatti_token');
          setUser(null);
          setProfile(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('tatti_token');
        sessionStorage.removeItem('tatti_token');
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Sign in with email/password.
   *
   * rememberMe = true  (default) → JWT token stored in localStorage (survives browser restart).
   * rememberMe = false           → JWT token stored in sessionStorage only (cleared on tab/window close).
   *
   * SECURITY: Only the JWT token is persisted — passwords are NEVER stored on the client.
   */
  const signInWithEmail = async (email: string, password: string, rememberMe = true) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.token) {
        if (rememberMe) {
          localStorage.setItem('tatti_token', data.token);
          sessionStorage.removeItem('tatti_token');
        } else {
          sessionStorage.setItem('tatti_token', data.token);
          localStorage.removeItem('tatti_token');
        }
      }
      setUser(data.user);
      const prof = await getProfile(data.user.id);
      setProfile(prof || {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role || 'student',
        full_name: '',
        phone: '',
        created_at: new Date().toISOString()
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (
    paramsOrEmail: string | SignUpParams,
    password?: string,
    fullName?: string
  ) => {
    try {
      const payload = typeof paramsOrEmail === 'object'
        ? paramsOrEmail
        : { email: paramsOrEmail, password, fullName };

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      if (data.token) {
        localStorage.setItem('tatti_token', data.token);
      }
      setUser(data.user);
      const prof = await getProfile(data.user.id);
      setProfile(prof);

      return { error: null, studentId: data.studentId as string | undefined };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('tatti_token');
    sessionStorage.removeItem('tatti_token');
    setUser(null);
    setProfile(null);
  };

  /**
   * Sends a password reset request to the backend.
   * The backend will email the user a secure OTP or reset link.
   *
   * SECURITY: We never expose whether an account with the given email exists.
   * The caller always receives { error: null }.
   */
  const sendPasswordResetEmail = async (email: string) => {
    try {
      await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.error('Password reset request error (not exposed to user):', err);
    }
    // Always return success to avoid leaking account existence
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role: profile?.role ?? null,
      loading, signInWithEmail, signUpWithEmail, signOut, refreshProfile,
      sendPasswordResetEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
