export type SegmentDisposition = 'keep' | 'remove';

export interface VideoAsset {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  localUrl: string;
  duration: number;
  uploadId?: string;
}

export interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  disposition: SegmentDisposition;
}

export interface EditorSnapshot {
  video: VideoAsset | null;
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  playheadTime: number;
}

export interface HistoryRecord {
  id: string;
  label: string;
  timestamp: string;
}

export interface SnapshotRecord {
  snapshot: EditorSnapshot;
  history: HistoryRecord;
}

export type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error';
