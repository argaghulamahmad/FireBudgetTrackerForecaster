import { useRef, useState } from 'react';
import { Currency } from '../utils/currency';
import { Language } from '../utils/i18n';
import { Globe, DollarSign, Database, Trash2, Download, Upload, FileArchive, LayoutTemplate } from 'lucide-react';
import { db } from '../db/db';
import { ConfirmModal } from '../components/ConfirmModal';

interface SettingsProps {
  currency: Currency;
  language: Language;
  viewMode: 'compact' | 'detailed';
  t: any;
  onCurrencyChange: (c: Currency) => void;
  onLanguageChange: (l: Language) => void;
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
  onLoadSampleData: () => void;
  onClearData: () => void;
}

export function Settings({ currency, language, viewMode, t, onCurrencyChange, onLanguageChange, onViewModeChange, onLoadSampleData, onClearData }: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    try {
      const data = await db.budgets.toArray();
      const jsonString = JSON.stringify(data);
      
      const stream = new Blob([jsonString], { type: 'application/json' }).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedResponse = new Response(compressedStream);
      const blob = await compressedResponse.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'budget_backup.json.gz';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    event.target.value = '';
  };

  const processImport = async () => {
    if (!importFile) return;
    
    try {
      const stream = importFile.stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const decompressedResponse = new Response(decompressedStream);
      const jsonString = await decompressedResponse.text();
      const data = JSON.parse(jsonString);
      
      await db.budgets.clear();
      await db.budgets.bulkAdd(data);
      
      alert(t.importSuccess);
    } catch (error) {
      console.error('Import failed:', error);
      alert(t.importFailed);
    } finally {
      setImportFile(null);
    }
  };

  return (
    <div className="px-4 pt-8 pb-24 max-w-md mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.settings}</h1>
      </header>

      <div className="space-y-6">
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
              onClick={onLoadSampleData}
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
        isOpen={isClearModalOpen}
        title={t.confirmClearTitle}
        message={t.confirmClearMessage}
        confirmText={t.clear}
        cancelText={t.cancel}
        onConfirm={onClearData}
        onCancel={() => setIsClearModalOpen(false)}
      />

      <ConfirmModal
        isOpen={importFile !== null}
        title={t.confirmImportTitle}
        message={t.confirmImportMessage || t.confirmImport}
        confirmText={t.import}
        cancelText={t.cancel}
        onConfirm={processImport}
        onCancel={() => setImportFile(null)}
        isDestructive={false}
      />
    </div>
  );
}
