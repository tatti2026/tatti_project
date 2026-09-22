import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/index';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data as Profile | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A secondary Supabase client that uses sessionStorage so the session is
// automatically cleared when the browser tab/window is closed.
// SECURITY: No passwords are ever stored — only the Supabase JWT session token.
const supabaseSession = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

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
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) getProfile(session.user.id).then(setProfile);
      })
      .finally(() => setLoading(false));

    // Do NOT use await inside onAuthStateChange callback — use .then() to avoid deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in with email/password.
   *
   * rememberMe = true  (default) → session persists in localStorage (survives browser restart).
   * rememberMe = false           → session stored in sessionStorage only; cleared on tab/window close.
   *
   * SECURITY: Passwords are NEVER stored. Only the Supabase JWT access/refresh token is
   * persisted, which is the standard approach used by OAuth2/PKCE flows.
   */
  const signInWithEmail = async (email: string, password: string, rememberMe = true) => {
    try {
      if (rememberMe) {
        // Default client — persists session to localStorage (cross-restart).
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Session-only client — persists to sessionStorage (tab-lifetime only).
        const { data, error } = await supabaseSession.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Mirror session into the main client so onAuthStateChange fires and
        // the rest of the app (getSession, onAuthStateChange) sees the user.
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          // Remove the key that setSession wrote to localStorage so the session
          // won't survive a browser restart (sessionStorage entry is the source of truth).
          const lsKey = Object.keys(localStorage).find(
            k => k.includes('supabase') && k.includes('auth-token')
          );
          if (lsKey) localStorage.removeItem(lsKey);
        }
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName ? { data: { full_name: fullName } } : undefined,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await supabaseSession.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  /**
   * Sends a password-reset email via Supabase.
   * The user receives an email with a secure link. On click, they land on
   * /reset-password where they can set a new password via supabase.auth.updateUser().
   *
   * SECURITY: We intentionally never expose whether an account with the given email
   * exists — the caller always receives { error: null }.
   */
  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) console.error('Password reset error (not exposed to user):', error);
    } catch (err) {
      console.error('Password reset exception:', err);
    }
    // Always return success to avoid leaking account existence
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error };
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role: profile?.role ?? null,
      loading, signInWithEmail, signUpWithEmail, signOut, refreshProfile,
      sendPasswordResetEmail, updatePassword,
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
