import type { EditorJobPayload } from '../model/projectPayload';

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
  /** Folder name inside the ZIP (e.g. "01 - Primer corte y capturas") */
  folderName: string;
  /** Audio filename already stored on the server (optional) */
  audioFilename?: string;
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
