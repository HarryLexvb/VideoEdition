import type { TimelineSegment, VideoAsset } from './types';

export interface EditorJobPayload {
  source: {
    fileName: string;
    mimeType: string;
    size: number;
    uploadId?: string;
  };
  timeline: Array<{
    id: string;
    start: number;
    end: number;
    disposition: 'keep' | 'remove';
  }>;
  meta: {
    duration: number;
    keepSegmentCount: number;
    removeSegmentCount: number;
  };
}

export function buildEditorJobPayload(video: VideoAsset, segments: TimelineSegment[]): EditorJobPayload {
  const roundedTimeline = segments.map((segment) => ({
    id: segment.id,
    start: Number(segment.start.toFixed(3)),
    end: Number(segment.end.toFixed(3)),
    disposition: segment.disposition,
  }));

  return {
    source: {
      fileName: video.fileName,
      mimeType: video.mimeType,
      size: video.size,
      uploadId: video.uploadId,
    },
    timeline: roundedTimeline,
    meta: {
      duration: Number(video.duration.toFixed(3)),
      keepSegmentCount: roundedTimeline.filter((segment) => segment.disposition === 'keep').length,
      removeSegmentCount: roundedTimeline.filter((segment) => segment.disposition === 'remove').length,
    },
  };
}
