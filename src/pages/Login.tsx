import { useState } from 'react';
import { Wallet, ShieldCheck, Wifi, BarChart3 } from 'lucide-react';
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
    } catch (error) {
      showToast(mapAuthError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: BarChart3,   label: t.budgets || 'Track recurring budgets' },
    { icon: Wifi,        label: t.dataManagement || 'Works offline, syncs automatically' },
    { icon: ShieldCheck, label: t.manageSpending || 'Your data, isolated and secure' },
  ];

  return (
    <div className="min-h-screen bg-health-bg flex flex-col items-center justify-between px-6 pt-20 pb-12">
      {/* App icon + wordmark */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[22px] flex items-center justify-center shadow-xl shadow-indigo-200 mb-6">
          <Wallet className="w-10 h-10 text-white" />
        </div>

        <h1 className="font-display text-[34px] font-bold text-health-text leading-tight mb-2">
          {t.appName}
        </h1>
        <p className="text-[16px] text-health-secondary max-w-[260px]">
          {t.signInDescription || 'Know exactly where your money goes, day by day.'}
        </p>
      </div>

      {/* Feature list */}
      <div className="w-full max-w-sm space-y-3 my-10">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-health-separator">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 text-zinc-900">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <span className="text-[14px] font-medium text-health-text">{label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white border-2 border-health-separator hover:border-indigo-300 text-health-text py-4 px-6 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-health-secondary">{t.signingIn || 'Signing in...'}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t.continueWithGoogle || 'Continue with Google'}
            </>
          )}
        </button>
        <p className="text-[12px] text-health-tertiary text-center mt-4">
          No password needed · Secure OAuth
        </p>
      </div>
    </div>
  );
}
