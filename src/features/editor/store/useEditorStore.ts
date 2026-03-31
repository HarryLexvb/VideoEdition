import { create } from 'zustand';

import { formatTime } from '../../../shared/lib/formatTime';
import { createId } from '../../../shared/lib/id';
import { clampTime, createInitialSegment, normalizeSegmentsForDuration, splitSegmentAtTime } from '../model/segments';
import type {
  EditorSnapshot,
  HistoryRecord,
  SegmentDisposition,
  SnapshotRecord,
  TimelineSegment,
  UploadState,
  VideoAsset,
} from '../model/types';

interface EditorStore extends EditorSnapshot {
  past: SnapshotRecord[];
  future: SnapshotRecord[];
  uploadState: UploadState;
  uploadMessage: string | null;
  setVideo: (video: VideoAsset) => void;
  setVideoDuration: (duration: number) => void;
  setVideoUploadId: (uploadId: string) => void;
  setUploadState: (state: UploadState, message?: string | null) => void;
  setPlayheadTime: (time: number) => void;
  seekTo: (time: number) => void;
  selectSegment: (segmentId: string | null) => void;
  addCutAt: (time: number) => void;
  addCutAtPlayhead: () => void;
  setSegmentDisposition: (segmentId: string, disposition: SegmentDisposition) => void;
  setSelectedSegmentDisposition: (disposition: SegmentDisposition) => void;
  toggleSegmentDisposition: (segmentId: string) => void;
  resetProject: () => void;
  undo: () => void;
  redo: () => void;
}

function createHistoryRecord(label: string): HistoryRecord {
  return {
    id: createId('history'),
    label,
    timestamp: new Date().toISOString(),
  };
}

function snapshotFromState(state: EditorStore): EditorSnapshot {
  return {
    video: state.video ? { ...state.video } : null,
    segments: state.segments.map((segment) => ({ ...segment })),
    selectedSegmentId: state.selectedSegmentId,
    playheadTime: state.playheadTime,
  };
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    video: snapshot.video ? { ...snapshot.video } : null,
    segments: snapshot.segments.map((segment) => ({ ...segment })),
    selectedSegmentId: snapshot.selectedSegmentId,
    playheadTime: snapshot.playheadTime,
  };
}

function updateWithHistory(
  state: EditorStore,
  label: string,
  updater: (snapshot: EditorSnapshot) => EditorSnapshot | null,
): EditorStore {
  const currentSnapshot = snapshotFromState(state);
  const nextSnapshot = updater(cloneSnapshot(currentSnapshot));

  if (!nextSnapshot) {
    return state;
  }

  return {
    ...state,
    ...nextSnapshot,
    past: [...state.past, { snapshot: currentSnapshot, history: createHistoryRecord(label) }],
    future: [],
  };
}

function getDurationFromVideo(video: VideoAsset | null): number {
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    return 0;
  }

  return video.duration;
}

function createDefaultSegmentsForVideo(video: VideoAsset | null): TimelineSegment[] {
  return [createInitialSegment(video?.duration ?? 0)];
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  video: null,
  segments: createDefaultSegmentsForVideo(null),
  selectedSegmentId: null,
  playheadTime: 0,
  past: [],
  future: [],
  uploadState: 'idle',
  uploadMessage: null,

  setVideo: (video) => {
    set({
      video,
      segments: createDefaultSegmentsForVideo(video),
      selectedSegmentId: null,
      playheadTime: 0,
      past: [],
      future: [],
      uploadState: video.uploadId ? 'uploaded' : 'idle',
      uploadMessage: null,
    });
  },

  setVideoDuration: (duration) => {
    set((state) => {
      if (!state.video) {
        return state;
      }

      const safeDuration = Math.max(duration, 0);
      const updatedVideo: VideoAsset = {
        ...state.video,
        duration: safeDuration,
      };

      const updatedSegments = normalizeSegmentsForDuration(state.segments, safeDuration);
      const updatedPlayhead = clampTime(state.playheadTime, safeDuration);

      return {
        ...state,
        video: updatedVideo,
        segments: updatedSegments,
        playheadTime: updatedPlayhead,
      };
    });
  },

  setVideoUploadId: (uploadId) => {
    set((state) => {
      if (!state.video) {
        return state;
      }

      return {
        ...state,
        video: {
          ...state.video,
          uploadId,
        },
        uploadState: 'uploaded',
        uploadMessage: 'Subida completada con Tus.',
      };
    });
  },

  setUploadState: (uploadState, uploadMessage = null) => {
    set((state) => ({
      ...state,
      uploadState,
      uploadMessage,
    }));
  },

  setPlayheadTime: (time) => {
    set((state) => {
      const duration = getDurationFromVideo(state.video);
      const clampedTime = clampTime(time, duration);

      if (Math.abs(state.playheadTime - clampedTime) < 0.02) {
        return state;
      }

      return {
        ...state,
        playheadTime: clampedTime,
      };
    });
  },

  seekTo: (time) => {
    get().setPlayheadTime(time);
  },

  selectSegment: (segmentId) => {
    set((state) => ({
      ...state,
      selectedSegmentId: segmentId,
    }));
  },

  addCutAt: (time) => {
    set((state) =>
      updateWithHistory(state, `Corte en ${formatTime(time)}`, (snapshot) => {
        const duration = getDurationFromVideo(snapshot.video);
        if (duration <= 0) {
          return null;
        }

        const cutTime = clampTime(time, duration);
        const splitResult = splitSegmentAtTime(snapshot.segments, cutTime);
        if (!splitResult.created) {
          return null;
        }

        return {
          ...snapshot,
          segments: splitResult.segments,
          selectedSegmentId: splitResult.newSelectedSegmentId,
          playheadTime: cutTime,
        };
      }),
    );
  },

  addCutAtPlayhead: () => {
    const state = get();
    state.addCutAt(state.playheadTime);
  },

  setSegmentDisposition: (segmentId, disposition) => {
    set((state) =>
      updateWithHistory(state, disposition === 'keep' ? 'Segmento marcado para conservar' : 'Segmento marcado para eliminar', (snapshot) => {
        const targetIndex = snapshot.segments.findIndex((segment) => segment.id === segmentId);
        if (targetIndex === -1) {
          return null;
        }

        const target = snapshot.segments[targetIndex];
        if (target.disposition === disposition) {
          return null;
        }

        const updatedSegments = [...snapshot.segments];
        updatedSegments[targetIndex] = {
          ...target,
          disposition,
        };

        return {
          ...snapshot,
          segments: updatedSegments,
          selectedSegmentId: segmentId,
        };
      }),
    );
  },

  setSelectedSegmentDisposition: (disposition) => {
    const state = get();
    if (!state.selectedSegmentId) {
      return;
    }

    state.setSegmentDisposition(state.selectedSegmentId, disposition);
  },

  toggleSegmentDisposition: (segmentId) => {
    const state = get();
    const segment = state.segments.find((item) => item.id === segmentId);

    if (!segment) {
      return;
    }

    state.setSegmentDisposition(segmentId, segment.disposition === 'keep' ? 'remove' : 'keep');
  },

  resetProject: () => {
    set((state) => {
      if (!state.video) {
        return {
          ...state,
          segments: createDefaultSegmentsForVideo(null),
          selectedSegmentId: null,
          playheadTime: 0,
          past: [],
          future: [],
        };
      }

      return {
        ...state,
        segments: createDefaultSegmentsForVideo(state.video),
        selectedSegmentId: null,
        playheadTime: 0,
        past: [],
        future: [],
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1];
      const presentSnapshot = snapshotFromState(state);

      return {
        ...state,
        ...cloneSnapshot(previous.snapshot),
        past: state.past.slice(0, -1),
        future: [{ snapshot: presentSnapshot, history: previous.history }, ...state.future],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) {
        return state;
      }

      const next = state.future[0];
      const presentSnapshot = snapshotFromState(state);

      return {
        ...state,
        ...cloneSnapshot(next.snapshot),
        past: [...state.past, { snapshot: presentSnapshot, history: next.history }],
        future: state.future.slice(1),
      };
    });
  },
}));
