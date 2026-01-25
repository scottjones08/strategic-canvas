/**
 * Authentication Hook for Fan Canvas
 * Integrates with the same Supabase auth as fan_consulting project
 * Sessions are shared between both applications
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// User type matching fan_consulting's users table
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  organization_id?: string;
  role: 'admin' | 'member' | 'viewer';
  is_fan_works_team: boolean;
  is_active: boolean;
  deactivated_at?: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<{ error: Error | null }>;
  isFanWorksTeam: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Safe hook that doesn't throw if not in provider (for optional auth scenarios)
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuthState() {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // User profile might not exist yet - this is okay
        if (error.code !== 'PGRST116') {
          console.warn('Could not fetch user profile:', error.message);
        }
        return null;
      }

      return data as User;
    } catch (error) {
      // Silently handle - profile is optional
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;

      if (error) {
        // Ignore abort errors - they're expected during fast remounts
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          return;
        }
        console.error('Session error:', error);
        // Clear potentially corrupted session
        supabase?.auth.signOut();
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id).then((profile) => {
          if (isMounted) setUser(profile);
        });
      }
      setLoading(false);
    }).catch((err) => {
      // Ignore abort errors
      if (err?.name === 'AbortError') return;
      console.error('Session fetch error:', err);
      if (isMounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.error('Token refresh failed');
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (isMounted) setUser(profile);
      } else {
        setUser(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role: 'member',
          is_fan_works_team: false,
        });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const updateProfile = useCallback(async (data: { full_name?: string; avatar_url?: string }) => {
    if (!user || !supabase) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      // Update local user state
      setUser((prev) => prev ? { ...prev, ...data } : null);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [user]);

  return {
    user,
    supabaseUser,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isFanWorksTeam: user?.is_fan_works_team ?? false,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!session,
  };
}
