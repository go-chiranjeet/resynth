export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisState {
  status: AnalysisStatus;
  result: string | null;
  error: string | null;
  step?: string;
}

export interface FileData {
  file: File;
  previewUrl: string;
  type: 'video' | 'audio';
}

export interface GeminiFileInfo {
  uri: string;
  name: string;
  mimeType: string;
}

export interface TimelineEvent {
  time: string;
  label: string;
}