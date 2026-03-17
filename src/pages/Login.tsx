/**
 * src/pages/Login.tsx
 *
 * Minimalist Google OAuth Login
 * Clean UI with single "Sign in with Google" button
 */

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { TranslationKeys } from '../utils/i18n';
import { signInWithGoogle, mapAuthError } from '../services/authActions';
import { useToast } from '../context/ToastContext';

interface LoginProps {
  t: Record<TranslationKeys, string>;
}

export function Login({ t }: LoginProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        showToast(result.error || (t.googleSignInFailed || 'Google sign-in failed'), 'error');
      } else {
        showToast(t.signIn || 'Sign in successful', 'success');
      }
      // On success, onAuthStateChanged fires automatically
    } catch (error) {
      showToast(mapAuthError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 flex items-center justify-center px-4">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
          {/* Header */}
          <div className="text-center mb-12">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mb-6 shadow-lg">
              <Wallet className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t.manageSpending || 'Budget Forecaster'}
            </h1>

            {/* Subtitle */}
            <p className="text-gray-600 text-lg">
              {t.welcome || 'Welcome!'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {t.signInDescription || 'Sign in with Google to manage your budgets'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-200 hover:border-indigo-500 text-gray-900 py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:bg-indigo-50 group"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#1f2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#1f2937" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#1f2937" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#1f2937" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>

            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                {t.signingIn || 'Signing in...'}
              </>
            ) : (
              t.continueWithGoogle || 'Sign in with Google'
            )}
          </button>

          {/* Features List */}
          <div className="mt-10 pt-8 border-t border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-4">
              {t.home || 'What you can do'}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <span>{t.budgets || 'Manage budgets'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <span>{t.dataManagement || 'Backup & restore data'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                <span>{t.manageSpending || 'Track spending'}</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-gray-500 text-center mt-8">
            {t.signInDescription || 'Secure sign-in with Google'}. No password needed.
          </p>
        </div>
      </div>

      {/* CSS for blob animation */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
