import { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { Currency } from '../utils/currency';
import { Language } from '../utils/i18n';
import { Globe, DollarSign, Database, Trash2, Download, Upload, FileArchive, LayoutTemplate, LogOut, Mail } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { signOutUser } from '../services/authActions';

interface SettingsProps {
  currency: Currency;
  language: Language;
  viewMode: 'compact' | 'detailed';
  user: User;
  t: any;
  onCurrencyChange: (c: Currency) => void;
  onLanguageChange: (l: Language) => void;
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
  onLoadSampleData: () => Promise<void>;
  onClearData: () => Promise<void>;
}

export function Settings({ currency, language, viewMode, user, t, onCurrencyChange, onLanguageChange, onViewModeChange, onLoadSampleData, onClearData }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isLoadSampleModalOpen, setIsLoadSampleModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleExport = async () => {
    // Export functionality will be implemented with Firestore backup
    alert(t.exportComingSoon || 'Export functionality coming soon');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Import functionality will be implemented with Firestore restore
    alert(t.importComingSoon || 'Import functionality coming soon');
    event.target.value = '';
  };

  const processImport = async () => {
    setImportFile(null);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await signOutUser();
      if (!result.success) {
        alert(result.error || 'Failed to sign out');
      }
      // onAuthStateChanged fires with user = null automatically
      // App component detects and redirects to login
      setIsSignOutModalOpen(false);
    } catch (error) {
      alert('An unexpected error occurred while signing out');
      console.error(error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="px-4 pt-8 pb-24 max-w-md mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.settings}</h1>
      </header>

      <div className="space-y-6">
        {/* Account Information Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Mail className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.account || 'Account'}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">{t.email || 'Email'}</p>
            <p className="font-semibold text-gray-900 mb-4 break-all">{user.email || 'N/A'}</p>
            
            <p className="text-sm text-gray-600 mb-1">{t.userId || 'User ID'}</p>
            <p className="font-mono text-xs text-gray-500 break-all mb-4">{user.uid}</p>

            {user.metadata?.creationTime && (
              <>
                <p className="text-sm text-gray-600 mb-1">{t.memberSince || 'Member Since'}</p>
                <p className="font-semibold text-gray-900">
                  {new Date(user.metadata.creationTime).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.language}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => onLanguageChange('en')}
              className={`w-full px-4 py-4 text-left border-b border-gray-50 transition-colors ${language === 'en' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {t.english}
            </button>
            <button 
              onClick={() => onLanguageChange('id')}
              className={`w-full px-4 py-4 text-left transition-colors ${language === 'id' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {t.indonesian}
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.currency}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => onCurrencyChange('USD')}
              className={`w-full px-4 py-4 text-left border-b border-gray-50 transition-colors ${currency === 'USD' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              USD ($)
            </button>
            <button 
              onClick={() => onCurrencyChange('IDR')}
              className={`w-full px-4 py-4 text-left transition-colors ${currency === 'IDR' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              IDR (Rp)
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <LayoutTemplate className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.viewMode}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => onViewModeChange('detailed')}
              className={`w-full px-4 py-4 text-left border-b border-gray-50 transition-colors ${viewMode === 'detailed' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {t.detailedView}
            </button>
            <button 
              onClick={() => onViewModeChange('compact')}
              className={`w-full px-4 py-4 text-left transition-colors ${viewMode === 'compact' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {t.compactView}
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Database className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.dataManagement}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <button 
              onClick={handleExport}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <FileArchive className="w-4 h-4 text-indigo-500" />
              {t.exportBackup}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              {t.importBackup}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".gz" 
              className="hidden" 
            />
            <button 
              onClick={() => setIsLoadSampleModalOpen(true)}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-500" />
              {t.loadSampleData}
            </button>
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t.clearAllData}
            </button>
          </div>
        </section>

        <section className="pt-4">
          <button 
            onClick={() => setIsSignOutModalOpen(true)}
            disabled={isSigningOut}
            className="w-full px-4 py-4 bg-white rounded-2xl border border-red-200 shadow-sm text-center font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            {isSigningOut ? t.signingOut || 'Signing out...' : (t.logout || 'Sign Out')}
          </button>
        </section>
      </div>

      <ConfirmModal
        isOpen={isLoadSampleModalOpen}
        title={t.confirmLoadSampleTitle || t.loadSampleData}
        message={t.confirmLoadSampleMessage || 'This will add example budgets to help you get started.'}
        confirmText={t.load || 'Load'}
        cancelText={t.cancel}
        onConfirm={async () => {
          try {
            await onLoadSampleData();
            setIsLoadSampleModalOpen(false);
          } catch (error) {
            console.error('Failed to load sample data:', error);
            alert(t.loadSampleDataFailed || 'Failed to load sample data');
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
            await onClearData();
            setIsClearModalOpen(false);
          } catch (error) {
            console.error('Failed to clear data:', error);
            alert(t.clearDataFailed || 'Failed to clear data');
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
            <button 
              onClick={() => onViewModeChange('compact')}
              className={`w-full px-4 py-4 text-left transition-colors ${viewMode === 'compact' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {t.compactView}
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <Database className="w-5 h-5" />
            <h2 className="text-lg font-semibold">{t.dataManagement}</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <button 
              onClick={handleExport}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <FileArchive className="w-4 h-4 text-indigo-500" />
              {t.exportBackup}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              {t.importBackup}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".gz" 
              className="hidden" 
            />
            <button 
              onClick={() => setIsLoadSampleModalOpen(true)}
              className="w-full px-4 py-4 text-left flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-500" />
              {t.loadSampleData}
            </button>
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t.clearAllData}
            </button>
          </div>
        </section>

        <section className="pt-4">
          <button 
            onClick={() => {
              localStorage.removeItem('budget_auth');
              window.location.reload();
            }}
            className="w-full px-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t.logout || 'Logout'}
          </button>
        </section>
      </div>

      <ConfirmModal
        isOpen={isLoadSampleModalOpen}
        title={t.confirmLoadSampleTitle || t.loadSampleData}
        message={t.confirmLoadSampleMessage || 'This will add example budgets to help you get started.'}
        confirmText={t.load || 'Load'}
        cancelText={t.cancel}
        onConfirm={async () => {
          try {
            await onLoadSampleData();
            setIsLoadSampleModalOpen(false);
          } catch (error) {
            console.error('Failed to load sample data:', error);
            alert(t.loadSampleDataFailed || 'Failed to load sample data');
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
            await onClearData();
            setIsClearModalOpen(false);
          } catch (error) {
            console.error('Failed to clear data:', error);
            alert(t.clearDataFailed || 'Failed to clear data');
          }
        }}
        onCancel={() => setIsClearModalOpen(false)}
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
