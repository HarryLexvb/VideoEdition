export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  disposition: 'keep' | 'remove';
}

export interface JobPayload {
  source: {
    fileName: string;
    mimeType: string;
    size: number;
    uploadId?: string;
  };
  timeline: TimelineSegment[];
  meta: {
    duration: number;
    keepSegmentCount: number;
    removeSegmentCount: number;
  };
}

export interface Job {
  id: string;
  type: 'export' | 'extract-audio';
  status: ProcessingStatus;
  progress: number;
  resultUrl?: string;
  /** URLs de cada segmento de audio exportado (extract-audio con múltiples segmentos) */
  resultUrls?: string[];
  error?: string;
  payload: JobPayload;
  createdAt: Date;
}
