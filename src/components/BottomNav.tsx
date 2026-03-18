import { Home, Settings } from 'lucide-react';
import { TranslationKeys } from '../utils/i18n';
import { cn } from '../utils/cn';

interface BottomNavProps {
  activeTab: 'home' | 'settings';
  onChange: (tab: 'home' | 'settings') => void;
  t: Record<TranslationKeys, string>;
}

export function BottomNav({ activeTab, onChange, t }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-[640px] mx-auto">
        <div className="bg-white/85 backdrop-blur-xl border-t border-health-separator pb-safe">
          <div className="flex justify-around items-center h-16 px-6">
            <button
              type="button"
              onClick={() => onChange('home')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-xl transition-all',
                activeTab === 'home'
                  ? 'text-indigo-600'
                  : 'text-health-tertiary hover:text-health-secondary'
              )}
            >
              <Home className={cn('w-6 h-6 transition-transform', activeTab === 'home' && 'scale-110')} />
              <span className={cn(
                'text-[10px] font-semibold transition-all',
                activeTab === 'home' ? 'opacity-100' : 'opacity-60'
              )}>
                {t.home}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChange('settings')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-xl transition-all',
                activeTab === 'settings'
                  ? 'text-indigo-600'
                  : 'text-health-tertiary hover:text-health-secondary'
              )}
            >
              <Settings className={cn('w-6 h-6 transition-transform', activeTab === 'settings' && 'scale-110')} />
              <span className={cn(
                'text-[10px] font-semibold transition-all',
                activeTab === 'settings' ? 'opacity-100' : 'opacity-60'
              )}>
                {t.settings}
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
