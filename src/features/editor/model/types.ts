export type SegmentDisposition = 'keep' | 'remove';

export type TrackKind = 'video' | 'audio';

export interface VideoAsset {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  localUrl: string;
  duration: number;
  uploadId?: string;
}

/**
 * A media track on the timeline.
 * - kind 'video': shows thumbnail strip from canvas frames. muted = true after audio extraction.
 * - kind 'audio': shows waveform from Web Audio API. carries extracted audio.
 */
export interface MediaTrack {
  id: string;
  kind: TrackKind;
  label: string;
  /** Object URL pointing to the media source for this track */
  sourceUrl: string;
  duration: number;
  /** true = this track's audio output is muted in the preview */
  muted: boolean;
}

export interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  disposition: SegmentDisposition;
}

export interface EditorSnapshot {
  video: VideoAsset | null;
  tracks: MediaTrack[];
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  selectedTrackIds: string[];
  playheadTime: number;
  trimStart: number | null;
  trimEnd: number | null;
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
