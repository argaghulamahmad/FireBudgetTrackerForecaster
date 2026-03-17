import { Home, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

interface BottomNavProps {
  activeTab: 'home' | 'settings';
  onChange: (tab: 'home' | 'settings') => void;
  t: Record<string, string>;
}

export function BottomNav({ activeTab, onChange, t }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        <button 
          onClick={() => onChange('home')}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            activeTab === 'home' ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium">{t.home}</span>
        </button>
        <button 
          onClick={() => onChange('settings')}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            activeTab === 'settings' ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">{t.settings}</span>
        </button>
      </div>
    </div>
  );
}
