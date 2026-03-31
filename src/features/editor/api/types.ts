export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface StartJobResponse {
  jobId: string;
  status: ProcessingStatus;
  message?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: ProcessingStatus;
  progress?: number;
  resultUrl?: string;
  error?: string;
  message?: string;
}
