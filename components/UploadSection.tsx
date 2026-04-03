import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileAudio, FileVideo, AlertCircle, Cloud, X, Loader2, Folder, ArrowLeft, HardDrive } from 'lucide-react';
import { MAX_FILE_SIZE_MB, BULK_MAX_TOTAL_SIZE_MB, BULK_MAX_FILES_500MB, BULK_MAX_FILES_300MB } from '../constants';

declare global {
  interface Window {
    google?: any;
  }
}

interface UploadSectionProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onFilesSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState({ id: 'locations', name: 'Locations' });
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null | File[]) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Check individual file types
    for (const file of fileArray) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        setError("Please upload valid Video (MP4) or Audio (MP3) files.");
        return;
      }
    }

    // Check limits
    if (fileArray.length === 1) {
      const fileSizeMB = fileArray[0].size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit for single file uploads.`);
        return;
      }
    } else {
      const totalSizeMB = fileArray.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
      if (totalSizeMB > BULK_MAX_TOTAL_SIZE_MB) {
        setError(`Total file size exceeds ${BULK_MAX_TOTAL_SIZE_MB}MB limit for bulk uploads.`);
        return;
      }

      const allBelow300 = fileArray.every(f => (f.size / (1024 * 1024)) < 300);
      const allBelow500 = fileArray.every(f => (f.size / (1024 * 1024)) < 500);

      if (allBelow300) {
        if (fileArray.length > BULK_MAX_FILES_300MB) {
          setError(`You can only upload up to ${BULK_MAX_FILES_300MB} files when all files are below 300MB.`);
          return;
        }
      } else if (allBelow500) {
        if (fileArray.length > BULK_MAX_FILES_500MB) {
          setError(`You can only upload up to ${BULK_MAX_FILES_500MB} files when files are below 500MB.`);
          return;
        }
      } else {
        setError(`Individual files in bulk upload must be below 500MB.`);
        return;
      }
    }

    setError(null);
    onFilesSelected(fileArray);
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

  const fetchDriveFiles = async (token: string, folderId: string = 'locations', searchQuery: string = "") => {
    setIsLoadingDrive(true);
    setIsDriveModalOpen(true);
    setError(null);
    try {
      if (!searchQuery && folderId === 'locations') {
        const response = await fetch(`https://www.googleapis.com/drive/v3/drives?pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch shared drives");
        const data = await response.json();
        
        const locations = [
          { id: 'root', name: 'My Drive', mimeType: 'application/vnd.google-apps.folder', isDrive: true },
          ...(data.drives || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            mimeType: 'application/vnd.google-apps.folder',
            isDrive: true
          }))
        ];
        setDriveFiles(locations);
      } else {
        let query = "trashed = false and (mimeType contains 'video/' or mimeType contains 'audio/' or mimeType = 'application/vnd.google-apps.folder')";
        if (searchQuery) {
          query += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
        } else {
          query += ` and '${folderId}' in parents`;
        }
        
        let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=folder,name`;
        
        if (searchQuery || folderId !== 'root') {
          url += '&corpora=allDrives';
        }

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch files from Google Drive");
        const data = await response.json();
        setDriveFiles(data.files || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch files from Google Drive");
      setIsDriveModalOpen(false);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleDriveFileSelect = async (file: any) => {
    if (file.mimeType === 'application/vnd.google-apps.folder' || file.isDrive) {
      setFolderHistory(prev => [...prev, currentFolder]);
      setCurrentFolder({ id: file.id, name: file.name });
      if (driveToken) fetchDriveFiles(driveToken, file.id);
      return;
    }

    if (!driveToken) return;
    setIsDriveModalOpen(false);
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${driveToken}` }
      });
      if (!response.ok) throw new Error("Failed to download file from Google Drive");
      if (!response.body) throw new Error("Response body is empty");

      let downloadedFile: File;

      // Try to use Origin Private File System (OPFS) to stream the file to disk
      // This prevents Out-Of-Memory (OOM) crashes for large files (e.g., 2GB videos)
      if (navigator.storage && navigator.storage.getDirectory) {
        try {
          const root = await navigator.storage.getDirectory();
          // Create a unique filename to avoid conflicts
          const uniqueName = `${Date.now()}_${file.name}`;
          const fileHandle = await root.getFileHandle(uniqueName, { create: true });
          const writable = await fileHandle.createWritable();
          
          // Stream the download directly to disk
          await response.body.pipeTo(writable);
          
          // Get the File object backed by the disk
          const opfsFile = await fileHandle.getFile();
          
          // We need to override the type since OPFS might not set it correctly
          downloadedFile = new File([opfsFile], file.name, { type: file.mimeType });
        } catch (opfsError) {
          console.warn("OPFS streaming failed, falling back to RAM blob:", opfsError);
          // Fallback to RAM if OPFS fails (e.g., in incognito mode or unsupported browsers)
          const blob = await response.blob();
          downloadedFile = new File([blob], file.name, { type: file.mimeType });
        }
      } else {
        // Fallback for older browsers
        const blob = await response.blob();
        downloadedFile = new File([blob], file.name, { type: file.mimeType });
      }

      handleFiles([downloadedFile]);
    } catch (err: any) {
      setError(err.message || "Failed to download file from Google Drive");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackFolder = () => {
    const newHistory = [...folderHistory];
    const prevFolder = newHistory.pop();
    if (prevFolder) {
      setFolderHistory(newHistory);
      setCurrentFolder(prevFolder);
      if (driveToken) fetchDriveFiles(driveToken, prevFolder.id);
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
          fetchDriveFiles(response.access_token, 'locations');
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
          multiple
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
              Max file size: {MAX_FILE_SIZE_MB}MB. Please compress your files to keep within this limit. Large files may take several minutes to upload and process. Please ensure a stable connection and keep this tab open.
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
              <div className="flex items-center gap-2">
                {folderHistory.length > 0 && (
                  <button type="button" onClick={handleBackFolder} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mr-1">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Cloud className="text-blue-500" size={20} />
                  {currentFolder.name}
                </h3>
              </div>
              <button type="button" onClick={() => {
                setIsDriveModalOpen(false);
                setCurrentFolder({ id: 'locations', name: 'Locations' });
                setFolderHistory([]);
              }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="Search files across all drives..." 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    if (driveToken) fetchDriveFiles(driveToken, currentFolder.id, e.target.value);
                  }}
                />
              </div>
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
                      type="button"
                      onClick={() => handleDriveFileSelect(file)}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                        {file.isDrive ? (
                          <HardDrive size={20} className="text-blue-600" />
                        ) : file.mimeType === 'application/vnd.google-apps.folder' ? (
                          <Folder size={20} className="text-blue-500" />
                        ) : file.mimeType.startsWith('video/') ? (
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