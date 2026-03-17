/**
 * src/pages/Login.tsx
 * 
 * Firebase Auth Login Page
 * 
 * Supports:
 * - Email/Password sign-in
 * - Email/Password sign-up
 * - Google OAuth
 * 
 * Error handling:
 * - Maps Firebase error codes to user-friendly messages
 * - Handles account-exists-with-different-credential scenario
 * - Shows loading states during auth operations
 */

import { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  mapAuthError,
} from '../services/authActions';

interface LoginProps {
  t: any;
}

export function Login({ t }: LoginProps) {
  // ==================== Form State ====================
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ==================== Event Handlers ====================

  /**
   * Handle email/password form submission
   * 
   * Validates inputs, calls auth action, handles errors
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError(t.emailRequired || 'Email is required');
      return;
    }
    if (!password.trim()) {
      setError(t.passwordRequired || 'Password is required');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError(t.passwordsMustMatch || 'Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError(t.passwordTooShort || 'Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Call Firebase Auth action
      const result = mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
      // On success, onAuthStateChanged fires automatically
      // and App component redirects (no manual redirect needed)
    } catch (error) {
      // Should not reach here since authActions handle all errors
      setError(mapAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || (t.googleSignInFailed || 'Google sign-in failed'));
      }
      // On success, onAuthStateChanged fires automatically
    } catch (error) {
      setError(mapAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle mode toggle (between signin and signup)
   */
  const handleToggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  // ==================== Computed Values ====================
  const isFormValid =
    email.trim() &&
    password.trim() &&
    (mode === 'signin' || (confirmPassword.trim() && password === confirmPassword));

  // ==================== Render ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-lg border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'signin'
              ? t.login || 'Sign In'
              : t.signup || 'Create Account'}
          </h1>
          <p className="text-gray-500 mt-2">
            {t.budgetForecaster || 'Budget Forecaster'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center mb-6 break-words">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.email || 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 cursor-text"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.password || 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 cursor-text"
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {/* Confirm Password (Signup Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.confirmPassword || 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 cursor-text"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {isLoading
              ? t.loading || 'Loading...'
              : mode === 'signin'
                ? t.signIn || 'Sign In'
                : t.createAccount || 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{t.or || 'OR'}</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading
            ? t.loading || 'Loading...'
            : t.signInWithGoogle || 'Continue with Google'}
        </button>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            {mode === 'signin'
              ? t.dontHaveAccount || "Don't have an account? "
              : t.alreadyHaveAccount || 'Already have an account? '}
            <button
              type="button"
              onClick={handleToggleMode}
              disabled={isLoading}
              className="text-blue-600 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mode === 'signin' ? t.signUp : t.signIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
