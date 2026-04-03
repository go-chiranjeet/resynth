import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileData, AnalysisState, AnalysisStatus } from '../types';
import { Spinner } from './Spinner';
import { Check, Copy, RefreshCw, AlertTriangle, FileText, ChevronRight, Share, Download, Play, Pause } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface AnalysisViewProps {
  filesData: FileData[];
  analysisState: AnalysisState;
  onReset: () => void;
  onRetry: () => void;
  estimatedTimeMs?: number;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  filesData, 
  analysisState, 
  onReset,
  onRetry,
  estimatedTimeMs = 60000
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const isProcessing = analysisState.status === AnalysisStatus.PROCESSING;
  const isCompleted = analysisState.status === AnalysisStatus.COMPLETED;
  const isError = analysisState.status === AnalysisStatus.ERROR;

  useEffect(() => {
    if (isProcessing) {
      const startTime = Date.now();
      const timer = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(timer);
    } else if (isCompleted) {
      setProgress(100);
    } else {
      setElapsedMs(0);
      setProgress(0);
    }
  }, [isProcessing, isCompleted]);

  useEffect(() => {
    if (isProcessing && estimatedTimeMs > 0) {
      // Calculate progress based on elapsed time vs estimated time, capped at 95%
      const rawProgress = (elapsedMs / estimatedTimeMs) * 100;
      // Slow down the progress as it gets closer to 95% to avoid jumping and sticking
      const boundedProgress = Math.min(rawProgress, 95);
      setProgress(boundedProgress);
    }
  }, [elapsedMs, estimatedTimeMs, isProcessing]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleCopy = () => {
    if (analysisState.result) {
      navigator.clipboard.writeText(analysisState.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (analysisState.result) {
        const blob = new Blob([analysisState.result], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research_synthesis_${new Date().toISOString().slice(0,10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      {/* Left Column: Media Preview & Status (4 columns) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Media Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Source Recordings ({filesData.length})
            </h3>
            <button 
              onClick={onReset}
              className="text-xs font-semibold text-slate-400 hover:text-orange-500 transition-colors px-3 py-1 rounded-full bg-slate-50 hover:bg-orange-50"
            >
              Replace
            </button>
          </div>
          
          <div className="flex flex-col max-h-[60vh] overflow-y-auto">
            {filesData.map((fileData, index) => (
              <div key={index} className="relative bg-slate-50 aspect-video flex items-center justify-center border-b border-slate-100 last:border-b-0">
                {fileData.type === 'video' ? (
                  <video 
                    src={fileData.previewUrl} 
                    controls 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-400 w-full p-8">
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-slate-100 shadow-sm">
                      <FileText size={36} className="text-slate-300" />
                    </div>
                    <audio src={fileData.previewUrl} controls className="w-full mt-2 accent-orange-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Processing State Card */}
        {isProcessing && (
          <div className="bg-white border border-orange-100 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-sm relative overflow-hidden">
             {/* Decorative blob */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-2xl -mr-16 -mt-16"></div>
            
            <Spinner className="w-10 h-10 text-orange-500 relative z-10" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900">Synthesizing...</h3>
              <p className="text-slate-500 mt-2 font-medium">
                {analysisState.step || "Identifying speakers, friction points, and recurring themes."}
              </p>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative z-10">
               <div 
                 className="h-full bg-orange-500 transition-all duration-1000 ease-linear bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400"
                 style={{ width: `${progress}%` }}
               ></div>
            </div>
            <div className="flex justify-between w-full text-xs text-slate-400 font-medium relative z-10 px-1">
              <span>Elapsed: {formatTime(elapsedMs)}</span>
              <span>Est. Total: ~{formatTime(estimatedTimeMs)}</span>
            </div>
          </div>
        )}

        {/* Error State Card */}
        {isError && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white rounded-full text-red-500 shadow-sm">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700">Analysis Failed</h3>
              <p className="text-sm text-red-600/80 mt-1 font-medium">
                {analysisState.error || "An unexpected error occurred during synthesis."}
              </p>
            </div>
            <button 
              type="button"
              onClick={onRetry}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-200"
            >
              Retry Analysis
            </button>
          </div>
        )}
        
        {/* Tips / Instructions */}
        {!isCompleted && !isProcessing && !isError && (
           <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Capabilities</span>
             </div>
             <ul className="space-y-4 text-sm font-medium text-slate-600">
               <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                 <div className="mt-0.5 bg-indigo-100 p-1 rounded-md text-indigo-600">
                    <ChevronRight size={14} strokeWidth={3} />
                 </div>
                 <span><b>Speaker Diarization:</b> Automatically distinguishes between Interviewer and User.</span>
               </li>
               <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                 <div className="mt-0.5 bg-pink-100 p-1 rounded-md text-pink-600">
                    <ChevronRight size={14} strokeWidth={3} />
                 </div>
                 <span><b>Thematic Analysis:</b> Summarizes overarching patterns and recurring topics.</span>
               </li>
               <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                 <div className="mt-0.5 bg-green-100 p-1 rounded-md text-green-600">
                    <ChevronRight size={14} strokeWidth={3} />
                 </div>
                 <span><b>Friction Mapping:</b> Exact quotes and timestamps mapped to Usability Heuristics.</span>
               </li>
             </ul>
           </div>
        )}
      </div>

      {/* Right Column: Analysis Output (7 columns) */}
      <div className="lg:col-span-7 flex flex-col h-[600px] lg:h-auto min-h-[500px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-orange-100 p-2 rounded-xl">
                 <FileText className="text-orange-600" size={20} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">
                Research Insights
             </h2>
          </div>
          
          {isCompleted && (
            <div className="flex items-center gap-3">
                <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 transform hover:-translate-y-0.5"
                >
                <Share size={16} strokeWidth={2.5} /> Export
                </button>
                <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Download Markdown"
                    >
                        <Download size={18} />
                    </button>
                    <div className="w-px bg-slate-200 mx-1 my-1"></div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`
                        p-2 rounded-lg transition-colors flex items-center gap-1
                        ${copied 
                            ? "text-green-600 bg-green-50" 
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }
                        `}
                        title="Copy to Clipboard"
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>
            </div>
          )}
        </div>

        <div className={`
          flex-1 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden relative
          ${!isCompleted ? "flex items-center justify-center" : ""}
        `}>
          {isCompleted ? (
            <div className="h-full overflow-y-auto p-8 custom-scrollbar">
              <div className="markdown-body">
                <ReactMarkdown>{analysisState.result || ''}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl rotate-3 flex items-center justify-center mx-auto mb-6 border-2 border-slate-100 text-slate-300 shadow-sm">
                <FileText size={40} />
              </div>
              <h4 className="text-slate-900 font-bold text-lg mb-2">Ready to Analyze</h4>
              <p className="text-slate-500 font-medium">
                {isProcessing ? "Synthesizing themes & separating speakers..." : "Upload a session recording to generate a detailed report."}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        content={analysisState.result || ''} 
      />
    </div>
  );
};