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
  trimRange: {
    start: number | null;
    end: number | null;
  };
  meta: {
    duration: number;
    keepSegmentCount: number;
    removeSegmentCount: number;
    hasTrimRange: boolean;
    trimDuration: number | null;
  };
}

export function buildEditorJobPayload(
  video: VideoAsset,
  segments: TimelineSegment[],
  trimStart: number | null,
  trimEnd: number | null
): EditorJobPayload {
  const roundedTimeline = segments.map((segment) => ({
    id: segment.id,
    start: Number(segment.start.toFixed(3)),
    end: Number(segment.end.toFixed(3)),
    disposition: segment.disposition,
  }));

  const hasTrimRange = trimStart !== null && trimEnd !== null;
  const trimDuration = hasTrimRange ? trimEnd - trimStart : null;

  return {
    source: {
      fileName: video.fileName,
      mimeType: video.mimeType,
      size: video.size,
      uploadId: video.uploadId,
    },
    timeline: roundedTimeline,
    trimRange: {
      start: trimStart !== null ? Number(trimStart.toFixed(3)) : null,
      end: trimEnd !== null ? Number(trimEnd.toFixed(3)) : null,
    },
    meta: {
      duration: Number(video.duration.toFixed(3)),
      keepSegmentCount: roundedTimeline.filter((segment) => segment.disposition === 'keep').length,
      removeSegmentCount: roundedTimeline.filter((segment) => segment.disposition === 'remove').length,
      hasTrimRange,
      trimDuration: trimDuration !== null ? Number(trimDuration.toFixed(3)) : null,
    },
  };
}
