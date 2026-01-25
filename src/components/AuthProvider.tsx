/**
 * Authentication Provider for Fan Canvas
 * Wraps the app with authentication context
 * Sessions are shared with fan_consulting via Supabase
 */

import type { ReactNode } from 'react';
import { AuthContext, useAuthState } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthState();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
