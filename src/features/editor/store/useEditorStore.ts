import { create } from 'zustand';

import { formatTime } from '../../../shared/lib/formatTime';
import { createId } from '../../../shared/lib/id';
import { clampTime, createInitialSegment, normalizeSegmentsForDuration, splitSegmentAtTime } from '../model/segments';
import type {
  EditorSnapshot,
  HistoryRecord,
  MediaTrack,
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
  audioExtracted: boolean;

  setVideo: (video: VideoAsset) => void;
  setVideoDuration: (duration: number) => void;
  setVideoUploadId: (uploadId: string) => void;
  setUploadState: (state: UploadState, message?: string | null) => void;
  setPlayheadTime: (time: number) => void;
  seekTo: (time: number) => void;
  selectSegment: (segmentId: string | null) => void;
  toggleTrackMute: (trackId: string) => void;
  selectTrack: (trackId: string, multi?: boolean) => void;
  clearTrackSelection: () => void;
  addCutAt: (time: number) => void;
  addCutAtPlayhead: () => void;
  setSegmentDisposition: (segmentId: string, disposition: SegmentDisposition) => void;
  setSelectedSegmentDisposition: (disposition: SegmentDisposition) => void;
  toggleSegmentDisposition: (segmentId: string) => void;
  setTrimStart: (time: number | null) => void;
  setTrimEnd: (time: number | null) => void;
  setTrimRange: (start: number | null, end: number | null) => void;
  setTrimStartAtPlayhead: () => void;
  setTrimEndAtPlayhead: () => void;
  clearTrimRange: () => void;
  validateTrimRange: () => boolean;
  /**
   * Locally extract audio: creates a dedicated audio track from the same video source.
   * The video track is muted. Both tracks are shown in the timeline.
   * Returns true if extraction succeeded, false if conditions are not met.
   */
  extractAudioLocally: () => boolean;
  /** Associate a PNG capture (dataUrl) with the given segment. */
  addCaptureToSegment: (segmentId: string, dataUrl: string, videoTime: number) => void;
  /** Remove a specific capture from a segment. */
  removeCaptureFromSegment: (segmentId: string, captureId: string) => void;
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
    tracks: state.tracks.map((t) => ({ ...t })),
    segments: state.segments.map((segment) => ({
      ...segment,
      captures: segment.captures.map((c) => ({ ...c })),
    })),
    selectedSegmentId: state.selectedSegmentId,
    selectedTrackIds: [...state.selectedTrackIds],
    playheadTime: state.playheadTime,
    trimStart: state.trimStart,
    trimEnd: state.trimEnd,
  };
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    video: snapshot.video ? { ...snapshot.video } : null,
    tracks: snapshot.tracks.map((t) => ({ ...t })),
    segments: snapshot.segments.map((segment) => ({
      ...segment,
      captures: segment.captures.map((c) => ({ ...c })),
    })),
    selectedSegmentId: snapshot.selectedSegmentId,
    selectedTrackIds: [...snapshot.selectedTrackIds],
    playheadTime: snapshot.playheadTime,
    trimStart: snapshot.trimStart,
    trimEnd: snapshot.trimEnd,
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

function createVideoTrack(video: VideoAsset): MediaTrack {
  return {
    id: createId('track-video'),
    kind: 'video',
    label: video.fileName,
    sourceUrl: video.localUrl,
    duration: video.duration,
    muted: false,
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  video: null,
  tracks: [],
  segments: createDefaultSegmentsForVideo(null),
  selectedSegmentId: null,
  selectedTrackIds: [],
  playheadTime: 0,
  trimStart: null,
  trimEnd: null,
  past: [],
  future: [],
  uploadState: 'idle',
  uploadMessage: null,
  audioExtracted: false,

  setVideo: (video) => {
    set({
      video,
      tracks: [createVideoTrack(video)],
      segments: createDefaultSegmentsForVideo(video),
      selectedSegmentId: null,
      selectedTrackIds: [],
      playheadTime: 0,
      trimStart: null,
      trimEnd: null,
      past: [],
      future: [],
      uploadState: video.uploadId ? 'uploaded' : 'idle',
      uploadMessage: null,
      audioExtracted: false,
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

      // Update duration on the video track too
      const updatedTracks = state.tracks.map((t) =>
        t.kind === 'video' && t.sourceUrl === state.video!.localUrl
          ? { ...t, duration: safeDuration }
          : t,
      );

      const updatedSegments = normalizeSegmentsForDuration(state.segments, safeDuration);
      const updatedPlayhead = clampTime(state.playheadTime, safeDuration);

      return {
        ...state,
        video: updatedVideo,
        tracks: updatedTracks,
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

  toggleTrackMute: (trackId) => {
    set((state) => {
      const idx = state.tracks.findIndex((t) => t.id === trackId);
      if (idx === -1) return state;
      const updatedTracks = state.tracks.map((t, i) =>
        i === idx ? { ...t, muted: !t.muted } : t,
      );
      return { ...state, tracks: updatedTracks };
    });
  },

  selectTrack: (trackId, multi = false) => {
    set((state) => {
      if (multi) {
        const already = state.selectedTrackIds.includes(trackId);
        const next = already
          ? state.selectedTrackIds.filter((id) => id !== trackId)
          : [...state.selectedTrackIds, trackId];
        return { ...state, selectedTrackIds: next };
      }
      return { ...state, selectedTrackIds: [trackId] };
    });
  },

  clearTrackSelection: () => {
    set((state) => ({ ...state, selectedTrackIds: [] }));
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

  setTrimStart: (time) => {
    set((state) => {
      const duration = getDurationFromVideo(state.video);
      if (duration <= 0) {
        return state;
      }

      const clampedTime = time !== null ? clampTime(time, duration) : null;

      if (clampedTime !== null && state.trimEnd !== null && clampedTime >= state.trimEnd) {
        return state;
      }

      return {
        ...state,
        trimStart: clampedTime,
      };
    });
  },

  setTrimEnd: (time) => {
    set((state) => {
      const duration = getDurationFromVideo(state.video);
      if (duration <= 0) {
        return state;
      }

      const clampedTime = time !== null ? clampTime(time, duration) : null;

      if (clampedTime !== null && state.trimStart !== null && clampedTime <= state.trimStart) {
        return state;
      }

      return {
        ...state,
        trimEnd: clampedTime,
      };
    });
  },

  setTrimRange: (start, end) => {
    set((state) => {
      const duration = getDurationFromVideo(state.video);
      if (duration <= 0) {
        return state;
      }

      const clampedStart = start !== null ? clampTime(start, duration) : null;
      const clampedEnd = end !== null ? clampTime(end, duration) : null;

      if (clampedStart !== null && clampedEnd !== null && clampedStart >= clampedEnd) {
        return state;
      }

      return updateWithHistory(state, `Trim: ${formatTime(clampedStart ?? 0)} - ${formatTime(clampedEnd ?? duration)}`, (snapshot) => ({
        ...snapshot,
        trimStart: clampedStart,
        trimEnd: clampedEnd,
      }));
    });
  },

  setTrimStartAtPlayhead: () => {
    const state = get();
    state.setTrimStart(state.playheadTime);
  },

  setTrimEndAtPlayhead: () => {
    const state = get();
    state.setTrimEnd(state.playheadTime);
  },

  clearTrimRange: () => {
    set((state) =>
      updateWithHistory(state, 'Limpiar trim', (snapshot) => ({
        ...snapshot,
        trimStart: null,
        trimEnd: null,
      }))
    );
  },

  validateTrimRange: () => {
    const state = get();
    if (state.trimStart === null || state.trimEnd === null) {
      return false;
    }
    return state.trimStart < state.trimEnd;
  },

  extractAudioLocally: () => {
    const state = get();

    if (!state.video) {
      console.warn('[EditorStore] extractAudioLocally: no video loaded');
      return false;
    }

    if (state.audioExtracted) {
      console.warn('[EditorStore] extractAudioLocally: audio already extracted');
      return false;
    }

    const videoTrackIndex = state.tracks.findIndex((t) => t.kind === 'video');
    if (videoTrackIndex === -1) {
      console.warn('[EditorStore] extractAudioLocally: no video track found');
      return false;
    }

    const videoTrack = state.tracks[videoTrackIndex];

    // Mute the video track
    const mutedVideoTrack: MediaTrack = { ...videoTrack, muted: true };

    // Create an audio track using the same source URL
    // The browser will decode only the audio from the video file
    const audioTrack: MediaTrack = {
      id: createId('track-audio'),
      kind: 'audio',
      label: `Audio - ${state.video.fileName}`,
      sourceUrl: state.video.localUrl,
      duration: state.video.duration,
      muted: false,
    };

    const updatedTracks = [...state.tracks];
    updatedTracks[videoTrackIndex] = mutedVideoTrack;
    updatedTracks.push(audioTrack);

    set({
      ...state,
      tracks: updatedTracks,
      audioExtracted: true,
    });

    return true;
  },

  addCaptureToSegment: (segmentId, dataUrl, videoTime) => {
    set((state) => ({
      ...state,
      segments: state.segments.map((seg) =>
        seg.id === segmentId
          ? {
              ...seg,
              captures: [
                ...seg.captures,
                {
                  id: createId('capture'),
                  dataUrl,
                  videoTime,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : seg,
      ),
    }));
  },

  removeCaptureFromSegment: (segmentId, captureId) => {
    set((state) => ({
      ...state,
      segments: state.segments.map((seg) =>
        seg.id === segmentId
          ? { ...seg, captures: seg.captures.filter((c) => c.id !== captureId) }
          : seg,
      ),
    }));
  },

  resetProject: () => {
    set((state) => {
      if (!state.video) {
        return {
          ...state,
          tracks: [],
          segments: createDefaultSegmentsForVideo(null),
          selectedSegmentId: null,
          selectedTrackIds: [],
          playheadTime: 0,
          trimStart: null,
          trimEnd: null,
          past: [],
          future: [],
          audioExtracted: false,
        };
      }

      return {
        ...state,
        tracks: [createVideoTrack(state.video)],
        segments: createDefaultSegmentsForVideo(state.video),
        selectedSegmentId: null,
        selectedTrackIds: [],
        playheadTime: 0,
        trimStart: null,
        trimEnd: null,
        past: [],
        future: [],
        audioExtracted: false,
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
