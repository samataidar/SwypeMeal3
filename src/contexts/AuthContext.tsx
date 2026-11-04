import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../api';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  nickname?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: 'user' | 'admin' | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Profiles are synced once per user per page load (name/email/avatar/nickname).
const syncedProfiles = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const syncProfile = async (userId: string) => {
    if (syncedProfiles.has(userId)) return;
    syncedProfiles.add(userId);
    try {
      const data = await api.syncProfile();
      setProfile(data);
    } catch (error) {
      console.warn('[AuthContext] Profile sync failed:', error);
      syncedProfiles.delete(userId);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Load user role if authenticated
      if (session?.user) {
        api.setUserId(session.user.id);
        syncProfile(session.user.id);
        loadUserRole();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        api.setUserId(session.user.id);
        syncProfile(session.user.id);
        loadUserRole();
      } else {
        setUserRole(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async () => {
    try {
      const result = await api.getUserRole();
      setUserRole(result.role as 'user' | 'admin');
    } catch (error) {
      console.error('[AuthContext] Error loading user role:', error);
      setUserRole('user'); // Default to user role
    }
  };

  const signInWithGoogle = async () => {
    // Используем production URL для OAuth redirect
    const redirectTo = import.meta.env.VITE_SITE_URL 
      || (import.meta.env.PROD ? 'https://swype-meal3.vercel.app' : window.location.origin);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    setUserRole(null);
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    profile,
    setProfile,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
