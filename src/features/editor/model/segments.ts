import { createId } from '../../../shared/lib/id';

import type { SegmentDisposition, TimelineSegment } from './types';

const EPSILON = 0.02;

export function createInitialSegment(duration: number): TimelineSegment {
  return {
    id: createId('segment'),
    start: 0,
    end: Math.max(duration, 0),
    disposition: 'keep',
  };
}

export function clampTime(time: number, maxDuration: number): number {
  if (!Number.isFinite(time) || time < 0) {
    return 0;
  }

  if (!Number.isFinite(maxDuration) || maxDuration <= 0) {
    return 0;
  }

  return Math.min(time, maxDuration);
}

export function splitSegmentAtTime(
  segments: TimelineSegment[],
  time: number,
): { segments: TimelineSegment[]; created: boolean; newSelectedSegmentId: string | null } {
  if (segments.length === 0) {
    return { segments, created: false, newSelectedSegmentId: null };
  }

  const targetIndex = segments.findIndex((segment) => time > segment.start + EPSILON && time < segment.end - EPSILON);

  if (targetIndex === -1) {
    return { segments, created: false, newSelectedSegmentId: null };
  }

  const target = segments[targetIndex];

  const leftSegment: TimelineSegment = {
    id: createId('segment'),
    start: target.start,
    end: time,
    disposition: target.disposition,
  };

  const rightSegment: TimelineSegment = {
    id: createId('segment'),
    start: time,
    end: target.end,
    disposition: target.disposition,
  };

  return {
    segments: [...segments.slice(0, targetIndex), leftSegment, rightSegment, ...segments.slice(targetIndex + 1)],
    created: true,
    newSelectedSegmentId: rightSegment.id,
  };
}

export function normalizeSegmentsForDuration(
  segments: TimelineSegment[],
  duration: number,
  fallbackDisposition: SegmentDisposition = 'keep',
): TimelineSegment[] {
  if (duration <= 0) {
    return [createInitialSegment(0)];
  }

  if (segments.length === 0) {
    return [createInitialSegment(duration)];
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const normalized: TimelineSegment[] = [];
  let cursor = 0;

  for (const segment of sorted) {
    if (cursor >= duration - EPSILON) {
      break;
    }

    const start = cursor;
    const cappedEnd = Math.min(duration, Math.max(segment.end, start + EPSILON));

    normalized.push({
      ...segment,
      start,
      end: cappedEnd,
    });

    cursor = cappedEnd;
  }

  if (normalized.length === 0) {
    return [createInitialSegment(duration)];
  }

  const lastIndex = normalized.length - 1;
  normalized[lastIndex] = {
    ...normalized[lastIndex],
    end: duration,
  };

  const first = normalized[0];
  if (first.start !== 0) {
    normalized[0] = { ...first, start: 0 };
  }

  for (let index = 1; index < normalized.length; index += 1) {
    normalized[index] = {
      ...normalized[index],
      start: normalized[index - 1].end,
      end: Math.max(normalized[index - 1].end + EPSILON, normalized[index].end),
    };
  }

  const fixedLast = normalized[normalized.length - 1];
  normalized[normalized.length - 1] = {
    ...fixedLast,
    end: duration,
  };

  return normalized.map((segment) => ({
    ...segment,
    disposition: segment.disposition ?? fallbackDisposition,
  }));
}

export function getSegmentDuration(segment: TimelineSegment): number {
  return Math.max(segment.end - segment.start, 0);
}

export function findSegmentById(segments: TimelineSegment[], segmentId: string | null): TimelineSegment | null {
  if (!segmentId) {
    return null;
  }

  return segments.find((segment) => segment.id === segmentId) ?? null;
}
