import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileAudio, FileVideo, AlertCircle, Cloud, X, Loader2 } from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../constants';

declare global {
  interface Window {
    google?: any;
  }
}

interface UploadSectionProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onFileSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null | File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit for this demo.`);
      return;
    }

    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      setError("Please upload a valid Video (MP4) or Audio (MP3) file.");
      return;
    }

    setError(null);
    onFileSelected(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const fetchDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    setIsDriveModalOpen(true);
    setError(null);
    try {
      const query = "trashed = false and (mimeType contains 'video/' or mimeType contains 'audio/')";
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch files from Google Drive");
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch files from Google Drive");
      setIsDriveModalOpen(false);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDriveFileSelect = async (file: any) => {
    if (!driveToken) return;
    setIsDriveModalOpen(false);
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${driveToken}` }
      });
      if (!response.ok) throw new Error("Failed to download file from Google Drive");
      const blob = await response.blob();
      const downloadedFile = new File([blob], file.name, { type: file.mimeType });
      handleFiles([downloadedFile]);
    } catch (err: any) {
      setError(err.message || "Failed to download file from Google Drive");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDriveUpload = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      setError("Google Drive integration is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.");
      return;
    }

    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      setError("The VITE_GOOGLE_CLIENT_ID appears to be invalid. It should end with '.apps.googleusercontent.com'.");
      return;
    }

    if (!window.google) {
      setError("Google Identity Services script not loaded yet. Please try again in a moment or refresh the page.");
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.error !== undefined) {
            setError("Google Drive authentication failed: " + response.error);
            return;
          }
          setDriveToken(response.access_token);
          fetchDriveFiles(response.access_token);
        },
      });
      client.requestAccessToken();
    } catch (err: any) {
      setError("Failed to initialize Google Auth: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 p-4">
      <div 
        className={`
          relative flex flex-col items-center justify-center w-full min-h-[20rem] py-8
          rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out bg-white
          shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
          ${dragActive 
            ? "border-orange-500 bg-orange-50 scale-[1.01]" 
            : "border-slate-200 hover:border-orange-300 hover:shadow-lg"
          }
          ${isLoading || isDownloading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="video/*,audio/*"
          onChange={handleChange}
          disabled={isLoading || isDownloading}
        />
        
        <div className="flex flex-col items-center text-center p-8 space-y-5">
          <div className={`
            p-5 rounded-2xl transition-colors
            ${dragActive ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-orange-500"}
          `}>
            <Upload size={36} strokeWidth={2} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              Upload Session Recording
            </h3>
            <p className="text-slate-500 font-medium">
              Drag & drop or click to browse
            </p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
              Max file size: 1GB. Large files may take several minutes to upload and process. Please ensure a stable connection and keep this tab open.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <FileVideo size={14} className="text-purple-500" /> MP4, WEBM
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <FileAudio size={14} className="text-pink-500" /> MP3, WAV
            </span>
          </div>
        </div>

        {dragActive && (
          <div className="absolute inset-0 rounded-3xl bg-orange-500/5 flex items-center justify-center backdrop-blur-[1px]">
            <p className="text-xl font-bold text-orange-600 bg-white/90 px-6 py-3 rounded-xl shadow-sm">
              Drop to analyze!
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleDriveUpload}
          disabled={isLoading || isDownloading}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:shadow-md transition-all text-slate-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Cloud size={20} className="text-blue-500" />
          {isDownloading ? "Downloading from Drive..." : "Import from Google Drive"}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm animate-fade-in">
          <AlertCircle size={20} />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Cloud className="text-blue-500" size={20} />
                Select from Google Drive
              </h3>
              <button onClick={() => setIsDriveModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
              {isLoadingDrive ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                  <p>Loading your files...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No video or audio files found in your Google Drive.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {driveFiles.map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleDriveFileSelect(file)}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                        {file.mimeType.startsWith('video/') ? (
                          <FileVideo size={20} className="text-purple-500" />
                        ) : (
                          <FileAudio size={20} className="text-pink-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 truncate">{file.name}</p>
                        {file.size && (
                          <p className="text-xs text-slate-400">{(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};