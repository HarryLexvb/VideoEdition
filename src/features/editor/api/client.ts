import type { EditorJobPayload } from '../model/projectPayload';
import JSZip from 'jszip';

import type { JobStatusResponse, StartJobResponse } from './types';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getApiBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error('Configura VITE_API_BASE_URL para habilitar exportaciones y extraccion de audio.');
  }

  return apiBaseUrl.replace(/\/$/, '');
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Error de red (${response.status})`;

    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      message = errorBody.message ?? errorBody.error ?? message;
    } catch {
      // If backend does not provide JSON, keep generic error.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function startExportJob(payload: EditorJobPayload): Promise<StartJobResponse> {
  return request<StartJobResponse>('/jobs/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function startExtractAudioJob(payload: EditorJobPayload): Promise<StartJobResponse> {
  return request<StartJobResponse>('/jobs/extract-audio', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/jobs/${jobId}`, {
    method: 'GET',
  });
}

export interface SegmentZipEntry {
  /** Folder name inside the ZIP (e.g. "segmento1") */
  folderName: string;
  /** Audio filename already stored on the server (optional) */
  audioFilename?: string;
  /** Optional absolute URL to download audio for client-side ZIP fallback */
  audioUrl?: string;
  /** Segment start time in seconds (used to build deterministic capture names) */
  segmentStart?: number;
  /** Segment end time in seconds (used to build deterministic capture names) */
  segmentEnd?: number;
  /** PNG captures as data URLs to embed in the ZIP */
  captures: Array<{ name: string; data: string }>;
}

/**
 * Solicita al backend crear un ZIP organizado por segmentos/carpetas,
 * incluyendo audios del servidor y capturas en base64.
 */
export async function downloadSegmentsZip(segments: SegmentZipEntry[]): Promise<Blob> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/results/zip-segments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments }),
  });

  if (!response.ok) {
    let message = `Error al crear ZIP de segmentos (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      message = errorBody.message ?? errorBody.error ?? message;
    } catch {
      // keep generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}

function decodeBase64(base64: string): Uint8Array {
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

/**
 * Fallback local ZIP generation. Useful when backend ZIP endpoint is unavailable
 * or when app is running without VITE_API_BASE_URL but still needs captures download.
 */
export async function buildSegmentsZipLocally(segments: SegmentZipEntry[]): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const folderName = (seg.folderName || `segmento${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '') || `segmento${i + 1}`;
    const folder = zip.folder(folderName);
    if (!folder) continue;

    if (seg.audioUrl) {
      try {
        const response = await fetch(seg.audioUrl);
        if (response.ok) {
          const audioBlob = await response.blob();
          folder.file(seg.audioFilename ?? `audio_${i + 1}.mp3`, audioBlob);
        }
      } catch {
        // Continue ZIP creation even if an audio file cannot be fetched.
      }
    }

    for (let ci = 0; ci < seg.captures.length; ci += 1) {
      const capture = seg.captures[ci];
      const safeName = (capture.name || `captura_${ci + 1}.png`).replace(/[^a-zA-Z0-9.\-_]/g, '');
      const base64 = String(capture.data).replace(/^data:image\/[^;]+;base64,/, '');
      folder.file(safeName || `captura_${ci + 1}.png`, decodeBase64(base64));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Solicita al backend empaquetar los filenames indicados en un ZIP y devuelve el Blob.
 * Lanza ApiError si el servidor responde con error.
 */
export async function downloadZipFile(filenames: string[]): Promise<Blob> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/results/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filenames }),
  });

  if (!response.ok) {
    let message = `Error al crear ZIP (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      message = errorBody.message ?? errorBody.error ?? message;
    } catch {
      // keep generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}
