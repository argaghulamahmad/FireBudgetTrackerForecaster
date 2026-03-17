/**
 * src/hooks/useAuth.ts
 * 
 * React Hook for Firebase Auth State
 * 
 * Provides convenient access to current user and auth loading state
 * throughout the component tree.
 * 
 * Usage:
 * ```tsx
 * const { user, loading } = useAuth();
 * 
 * if (loading) return <LoadingScreen />;
 * if (!user) return <LoginPage />;
 * 
 * return <App user={user} />;
 * ```
 */

import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

/**
 * Auth context type definition
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

/**
 * Create the auth context
 * Initialized with null to prevent usage without provider
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access auth state anywhere in the component tree
 * 
 * Must be used within an AuthProvider.
 * 
 * @returns { user, loading } - Current user and Firebase initialization state
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * function MyComponent() {
 *   const { user, loading } = useAuth();
 *   
 *   if (loading) return <span>Initializing...</span>;
 *   if (!user) return null;
 *   
 *   return <div>Welcome {user.email}</div>;
 * }
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth() must be used within an <AuthProvider>. ' +
        'Make sure your App is wrapped with AuthProvider.'
    );
  }

  return context;
}

/**
 * Type export for use in component props
 * 
 * @example
 * interface MyComponentProps {
 *   auth: AuthContextValue;
 * }
 */
export type AuthContextValue = AuthContextType;
