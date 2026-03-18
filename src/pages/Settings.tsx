import { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { TranslationKeys } from '../utils/i18n';
import { useBudget } from '../context/BudgetContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { Globe, DollarSign, Database, Trash2, Download, Upload, FileArchive, LayoutTemplate, LogOut, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { signOutUser } from '../services/authActions';
import { exportBudgets, importBudgets } from '../utils/backupUtils';
import { cn } from '../utils/cn';
import { getLogger } from '../utils/logger';

const logger = getLogger('Settings');

interface SettingsProps {
  user: User;
  t: Record<TranslationKeys, string>;
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <Icon className="w-3.5 h-3.5 text-health-secondary" />
      <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">{label}</span>
    </div>
  );
}

function OptionRow({
  label,
  active,
  onClick,
  isLast = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3.5 text-left flex items-center justify-between transition-colors',
        active ? 'bg-white' : 'bg-white hover:bg-health-bg',
        !isLast && 'border-b border-health-separator'
      )}
    >
      <span className={cn('text-[15px]', active ? 'font-semibold text-indigo-600' : 'text-health-text')}>{label}</span>
      {active && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
    </button>
  );
}

export function Settings({ user, t }: SettingsProps) {
  const { currency, language, viewMode, onCurrencyChange, onLanguageChange, onViewModeChange } = usePreferences();
  const { loadSampleData, clearAllData } = useBudget();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isLoadSampleModalOpen, setIsLoadSampleModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleExport = async () => {
    try {
      await exportBudgets(user);
      showToast(t.exportSuccess || 'Budget backup downloaded successfully!', 'success');
    } catch (error) {
      logger.error('Export failed', error);
      showToast(t.exportFailed || 'Failed to export budgets', 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { event.target.value = ''; return; }
    if (!file.name.endsWith('.gz')) {
      showToast(t.invalidFileFormat || 'Please select a valid backup file (.gz)', 'error');
      event.target.value = '';
      return;
    }
    setImportFile(file);
  };

  const processImport = async () => {
    if (!importFile) return;
    try {
      const importedCount = await importBudgets(importFile, user);
      setImportFile(null);
      showToast(
        `${t.importSuccess || 'Successfully imported'} ${importedCount} ${importedCount === 1 ? 'budget' : 'budgets'}`,
        'success'
      );
    } catch (error) {
      logger.error('Import failed', error);
      showToast(t.importFailed || 'Failed to import budgets', 'error');
      setImportFile(null);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await signOutUser();
      if (!result.success) {
        showToast(result.error || 'Failed to sign out', 'error');
      } else {
        showToast(t.logout || 'Logged out successfully', 'success');
      }
      setIsSignOutModalOpen(false);
    } catch (error) {
      showToast('An unexpected error occurred while signing out', 'error');
      logger.error('Process import failed', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="px-4 pt-10 pb-28 min-h-screen bg-health-bg">
      {/* Page header */}
      <header className="mb-6">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary mb-1">
          {t.account || 'Account'}
        </p>
        <h1 className="font-display text-[34px] font-bold text-health-text leading-tight">{t.settings}</h1>
      </header>

      <div className="space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-health-separator shadow-sm p-5">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display text-[17px] font-bold text-health-text truncate">
                {user.displayName || user.email || 'User'}
              </p>
              <p className="text-[13px] text-health-secondary truncate">{user.email || 'N/A'}</p>
              {user.metadata?.creationTime && (
                <p className="text-[11px] text-health-tertiary mt-0.5">
                  {t.memberSince || 'Member since'} {new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-health-separator">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-health-secondary mb-1.5">{t.userId || 'User ID'}</p>
            <p className="font-mono text-[11px] text-health-secondary break-all bg-health-bg px-3 py-2 rounded-xl">
              {user.uid}
            </p>
          </div>
        </div>

        {/* Language */}
        <div>
          <SectionLabel icon={Globe} label={t.language} />
          <div className="bg-white rounded-2xl border border-health-separator shadow-sm overflow-hidden">
            <OptionRow label={t.english} active={language === 'en'} onClick={() => onLanguageChange('en')} />
            <OptionRow label={t.indonesian} active={language === 'id'} onClick={() => onLanguageChange('id')} isLast />
          </div>
        </div>

        {/* Currency */}
        <div>
          <SectionLabel icon={DollarSign} label={t.currency} />
          <div className="bg-white rounded-2xl border border-health-separator shadow-sm overflow-hidden">
            <OptionRow label="USD — US Dollar ($)" active={currency === 'USD'} onClick={() => onCurrencyChange('USD')} />
            <OptionRow label="IDR — Indonesian Rupiah (Rp)" active={currency === 'IDR'} onClick={() => onCurrencyChange('IDR')} isLast />
          </div>
        </div>

        {/* View mode */}
        <div>
          <SectionLabel icon={LayoutTemplate} label={t.viewMode} />
          <div className="bg-white rounded-2xl border border-health-separator shadow-sm overflow-hidden">
            <OptionRow label={t.detailedView} active={viewMode === 'detailed'} onClick={() => onViewModeChange('detailed')} />
            <OptionRow label={t.compactView} active={viewMode === 'compact'} onClick={() => onViewModeChange('compact')} isLast />
          </div>
        </div>

        {/* Data management */}
        <div>
          <SectionLabel icon={Database} label={t.dataManagement} />
          <div className="bg-white rounded-2xl border border-health-separator shadow-sm overflow-hidden">
            {[
              { icon: FileArchive, label: t.exportBackup, color: 'text-indigo-500', onClick: handleExport, destructive: false },
              { icon: Upload,      label: t.importBackup, color: 'text-emerald-500', onClick: () => fileInputRef.current?.click(), destructive: false },
              { icon: Download,    label: t.loadSampleData, color: 'text-indigo-500', onClick: () => setIsLoadSampleModalOpen(true), destructive: false },
              { icon: Trash2,      label: t.clearAllData, color: 'text-rose-500', onClick: () => setIsClearModalOpen(true), destructive: true },
            ].map(({ icon: Icon, label, color, onClick, destructive }, i, arr) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={cn(
                  'w-full px-4 py-3.5 flex items-center justify-between transition-colors',
                  destructive ? 'hover:bg-rose-50' : 'hover:bg-health-bg',
                  i < arr.length - 1 && 'border-b border-health-separator'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className={cn('text-[15px]', destructive ? 'text-rose-500 font-medium' : 'text-health-text')}>{label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-health-tertiary" />
              </button>
            ))}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".gz"
            aria-label={t.importBackup}
            className="hidden"
          />
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => setIsSignOutModalOpen(true)}
          disabled={isSigningOut}
          className="w-full px-4 py-4 bg-white rounded-2xl border border-health-separator shadow-sm text-center font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4.5 h-4.5" />
          {isSigningOut ? (t.signingOut || 'Signing out...') : (t.logout || 'Sign Out')}
        </button>
      </div>

      <ConfirmModal
        isOpen={isLoadSampleModalOpen}
        title={t.confirmLoadSampleTitle || t.loadSampleData}
        message={t.confirmLoadSampleMessage || 'This will add example budgets to help you get started.'}
        confirmText={t.load || 'Load'}
        cancelText={t.cancel}
        onConfirm={async () => {
          try {
            await loadSampleData('USD');
            setIsLoadSampleModalOpen(false);
            showToast(t.loadSampleData || 'Sample data loaded successfully', 'success');
          } catch (error) {
            logger.error('Failed to load sample data', error);
            showToast(t.loadSampleDataFailed || 'Failed to load sample data', 'error');
          }
        }}
        onCancel={() => setIsLoadSampleModalOpen(false)}
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={isClearModalOpen}
        title={t.confirmClearTitle}
        message={t.confirmClearMessage}
        confirmText={t.clear}
        cancelText={t.cancel}
        onConfirm={async () => {
          try {
            await clearAllData();
            setIsClearModalOpen(false);
            showToast(t.clearAllData || 'All data cleared successfully', 'success');
          } catch (error) {
            logger.error('Failed to clear data', error);
            showToast(t.clearDataFailed || 'Failed to clear data', 'error');
          }
        }}
        onCancel={() => setIsClearModalOpen(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isSignOutModalOpen}
        title={t.confirmSignOut || 'Sign Out?'}
        message={t.confirmSignOutMessage || 'Are you sure you want to sign out of your account?'}
        confirmText={t.signOut || 'Sign Out'}
        cancelText={t.cancel}
        onConfirm={handleSignOut}
        onCancel={() => setIsSignOutModalOpen(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={importFile !== null}
        title={t.confirmImportTitle}
        message={t.confirmImportMessage || t.confirmImport}
        confirmText={t.import}
        cancelText={t.cancel}
        onConfirm={processImport}
        onCancel={() => setImportFile(null)}
        isDestructive={true}
      />
    </div>
  );
}
