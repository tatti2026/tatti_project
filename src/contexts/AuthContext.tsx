import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, UserRole } from '@/types/index';

const isCapacitorAndroid = typeof window !== 'undefined' && (
  (window as any).Capacitor?.isNativePlatform?.() ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (window.location.protocol === 'https:' || window.location.protocol === 'capacitor:'))
);

// Determine if running against a production backend (non-native web production deployments)
const isProduction = !isCapacitorAndroid && Boolean(
  import.meta.env.VITE_API_URL?.startsWith('https://') ||
  (import.meta.env.PROD && !import.meta.env.DEV && import.meta.env.VITE_API_URL?.includes('railway.app'))
);

function getAndroidDevApiBase(): string {
  if (typeof window !== 'undefined') {
    // 1. Developer override if set in localStorage
    const devOverride = localStorage.getItem('psycare_dev_api_target');
    if (devOverride === 'physical' || devOverride === 'localhost') {
      return 'http://localhost:5000/api';
    }
    if (devOverride === 'emulator' || devOverride === '10.0.2.2') {
      return 'http://10.0.2.2:5000/api';
    }

    // 2. Auto-detect Android Emulator via userAgent and platform architecture
    const ua = navigator.userAgent || '';
    const isEmulator = /sdk_gphone|google_sdk|emulator|sdk built for|x86_64|i686|x86/i.test(ua);
    if (isEmulator) {
      return 'http://10.0.2.2:5000/api';
    }
  }

  // 3. Default for physical Android devices in development (connected via USB ADB reverse)
  return 'http://localhost:5000/api';
}

const API_BASE = isProduction
  ? (import.meta.env.VITE_API_URL || 'https://tattiproject-production-506b.up.railway.app/api')
  : (isCapacitorAndroid
      ? getAndroidDevApiBase()
      : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'));

async function fetchAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const tryUrls = isProduction
    ? [`${API_BASE}${endpoint}`]
    : [
        `${API_BASE}${endpoint}`,
        `http://localhost:5000/api${endpoint}`,
        `http://10.0.2.2:5000/api${endpoint}`,
      ];
  let lastRes: Response | null = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status === 400 || res.status === 401 || res.status === 403 || res.status === 409) {
        return res;
      }
      lastRes = res;
    } catch {
      // try next
    }
  }
  if (lastRes) return lastRes;
  throw new Error('Unable to connect to server. Please check your connection.');
}

export interface User {
  id: string;
  email: string;
  role?: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
    const res = await fetchAuth(`/profiles/${userId}`, {
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
  counsellorId?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null; user?: User; role?: UserRole }>;
  signUpWithEmail: (
    paramsOrEmail: string | SignUpParams,
    password?: string,
    fullName?: string
  ) => Promise<{ error: Error | null; studentId?: string }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (
    email: string
  ) => Promise<{ error: Error | null; message?: string; previewUrl?: string; devResetUrl?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
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
    // Check localStorage first, then sessionStorage
    const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchAuth('/auth/me', {
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
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const res = await fetchAuth('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const err: any = new Error(data.error || 'Invalid login credentials');
        err.status = res.status;
        err.data = data;
        throw err;
      }

      if (data.token) {
        localStorage.setItem('tatti_token', data.token);
      }

      const loggedInUser: User = data.user || {
        id: data.profile?.id || '',
        email: data.profile?.email || email,
        role: data.profile?.role || 'student',
      };

      setUser(loggedInUser);

      if (data.profile) {
        setProfile(data.profile);
      } else if (loggedInUser.id) {
        const prof = await getProfile(loggedInUser.id);
        setProfile(prof);
      }

      setProfile(prev => prev || {
        id: loggedInUser.id,
        email: loggedInUser.email,
        role: (loggedInUser.role as UserRole) || 'student',
        full_name: '',
        phone: '',
        created_at: new Date().toISOString()
      });

      const userRole = (data.profile?.role || loggedInUser.role || 'student') as UserRole;
      return { error: null, user: loggedInUser, role: userRole };
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

      const res = await fetchAuth('/auth/signup', {
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

  const sendPasswordResetEmail = async (
    email: string
  ): Promise<{ error: Error | null; message?: string; previewUrl?: string; devResetUrl?: string }> => {
    try {
      const cleanEmail = (email || '').trim();
      if (!cleanEmail) {
        throw new Error('Please enter your registered email address or Student ID.');
      }

      const res = await fetchAuth('/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unable to process reset request. Please try again.');
      }

      return {
        error: null,
        message: data.message,
        previewUrl: data.previewUrl,
        devResetUrl: data.devResetUrl,
      };
    } catch (error: any) {
      console.warn('sendPasswordResetEmail note:', error.message);
      return { error: error as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const token = localStorage.getItem('tatti_token') || sessionStorage.getItem('tatti_token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetchAuth('/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const userRole = (user ? (user.role || profile?.role || 'student') : null) as UserRole | null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: userRole,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        sendPasswordResetEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
