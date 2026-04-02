import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { AnalysisView } from './components/AnalysisView';
import { analyzeUserSession } from './services/gemini';
import { AnalysisState, AnalysisStatus, FileData } from './types';
import { BrainCircuit, Sparkles, Smile } from 'lucide-react';

const App: React.FC = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: AnalysisStatus.IDLE,
    result: null,
    error: null,
  });

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileData({
      file,
      previewUrl: url,
      type: file.type.startsWith('video') ? 'video' : 'audio',
    });
    
    // Auto-start analysis
    startAnalysis(file);
  };

  const startAnalysis = async (file: File) => {
    setAnalysisState({
      status: AnalysisStatus.PROCESSING,
      result: null,
      error: null,
    });

    try {
      const result = await analyzeUserSession(file);
      setAnalysisState({
        status: AnalysisStatus.COMPLETED,
        result,
        error: null,
      });
    } catch (error: any) {
      setAnalysisState({
        status: AnalysisStatus.ERROR,
        result: null,
        error: error.message || "An error occurred during analysis.",
      });
    }
  };

  const handleReset = () => {
    if (fileData?.previewUrl) {
      URL.revokeObjectURL(fileData.previewUrl);
    }
    setFileData(null);
    setAnalysisState({
      status: AnalysisStatus.IDLE,
      result: null,
      error: null,
    });
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (fileData?.previewUrl) {
        URL.revokeObjectURL(fileData.previewUrl);
      }
    };
  }, [fileData]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20 rotate-3 transition-transform hover:rotate-6">
              <BrainCircuit className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                research<span className="text-orange-500">synthesizer</span>
              </h1>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <Sparkles size={14} className="text-orange-500" />
            <span>Powered by Gemini 3.0 Pro</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {!fileData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
            
            {/* Background decorations matching Droplist style */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-100/60 rounded-full blur-3xl -z-10"></div>

            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-block mb-6 relative">
                 <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm rotate-2 inline-block">
                    UX Research Tool
                 </span>
                 <svg className="absolute -top-6 -right-12 w-12 h-12 text-orange-400 rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M10,50 Q30,10 50,30 T90,30" />
                    <path d="M85,25 L90,30 L85,35" />
                 </svg>
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
                turn interviews into insights <br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
                  in seconds
                </span>
              </h2>
              <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Upload your raw user testing video or audio. Get a structured friction report, 
                sentiment map, and heuristic analysis instantly.
              </p>
            </div>
            
            <UploadSection 
              onFileSelected={handleFileSelected} 
              isLoading={false} 
            />

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Smile size={64} className="text-purple-500 rotate-12" />
                </div>
                <div className="text-purple-500 bg-purple-50 w-fit p-3 rounded-2xl mb-4">
                     <span className="font-bold text-2xl">40%</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Time Saved</h3>
                <p className="text-slate-500 text-sm">Cut synthesis time dramatically per study.</p>
              </div>
              
              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BrainCircuit size={64} className="text-pink-500 -rotate-12" />
                </div>
                <div className="text-pink-500 bg-pink-50 w-fit p-3 rounded-2xl mb-4">
                     <span className="font-bold text-2xl">0%</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Bias Reduced</h3>
                <p className="text-slate-500 text-sm">Objective analysis free from subjective filters.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={64} className="text-orange-500 rotate-6" />
                </div>
                <div className="text-orange-500 bg-orange-50 w-fit p-3 rounded-2xl mb-4">
                     <span className="font-bold text-2xl">100%</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Verifiable</h3>
                <p className="text-slate-500 text-sm">Every insight is linked to a timestamped quote.</p>
              </div>
            </div>
          </div>
        ) : (
          <AnalysisView 
            fileData={fileData} 
            analysisState={analysisState} 
            onReset={handleReset}
            onRetry={() => startAnalysis(fileData.file)}
          />
        )}
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100 bg-white">
        <p className="font-medium">&copy; {new Date().getFullYear()} ResearchSynthesizer AI. <span className="text-slate-300 mx-2">|</span> Designed for Senior UX Researchers.</p>
      </footer>
    </div>
  );
};

export default App;