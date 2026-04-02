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
}

export interface FileData {
  file: File;
  previewUrl: string;
  type: 'video' | 'audio';
}

export interface TimelineEvent {
  time: string;
  label: string;
}