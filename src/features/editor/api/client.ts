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
