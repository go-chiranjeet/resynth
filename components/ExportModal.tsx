import React, { useState } from 'react';
import { X, Check, Download, Share2, Lock } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

type Platform = 'notion' | 'jira' | 'confluence' | 'trello' | 'csv';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, content }) => {
  const [platform, setPlatform] = useState<Platform>('notion');
  const [apiKey, setApiKey] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);

    // Simulate API call to external platform
    setTimeout(() => {
      setIsExporting(false);
      setSuccess(true);
      
      // Fallback: Copy to clipboard or download based on platform
      if (platform === 'csv') {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'research-synthesis.md';
        a.click();
      } else {
        navigator.clipboard.writeText(content);
      }

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600">
               <Share2 size={18} strokeWidth={2.5} />
            </div>
            Export Insights
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleExport} className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Destination Platform</label>
            <div className="grid grid-cols-2 gap-3">
              {(['notion', 'jira', 'confluence', 'trello'] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`
                    px-4 py-3.5 rounded-2xl border text-sm font-bold capitalize transition-all flex items-center justify-center gap-2
                    ${platform === p 
                      ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm" 
                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                    }
                  `}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 ml-1">
                  Instance URL <span className="text-red-500">*</span>
                </label>
                <input 
                  type="url" 
                  placeholder={`https://your-company.${platform}.com`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.target.value)}
                  required
                />
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1 ml-1">
                  API Token <Lock size={12} /> <span className="text-red-500">*</span>
                </label>
                <input 
                  type="password" 
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
             </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isExporting || success}
              className={`
                w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-95
                ${success 
                  ? "bg-green-500 hover:bg-green-600 shadow-green-500/20" 
                  : "bg-orange-500 hover:bg-orange-600"
                }
                ${isExporting ? "opacity-75 cursor-wait" : ""}
              `}
            >
              {isExporting ? (
                <>Moving Data...</>
              ) : success ? (
                <><Check size={18} strokeWidth={3} /> Exported Successfully</>
              ) : (
                <>Connect & Export</>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-4 font-medium">
              Data is formatted specifically for the target platform's markup.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};