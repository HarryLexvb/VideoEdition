import { useMutation, useQuery } from '@tanstack/react-query';

import type { EditorJobPayload } from '../model/projectPayload';

import { getJobStatus, startExportJob, startExtractAudioJob } from './client';
import type { JobStatusResponse, StartJobResponse } from './types';

const POLLING_INTERVAL_MS = 2500;

export function useStartExportJob() {
  return useMutation<StartJobResponse, Error, EditorJobPayload>({
    mutationFn: startExportJob,
  });
}

export function useStartExtractAudioJob() {
  return useMutation<StartJobResponse, Error, EditorJobPayload>({
    mutationFn: startExtractAudioJob,
  });
}

export function useProcessingJob(jobId: string | null) {
  return useQuery<JobStatusResponse, Error>({
    queryKey: ['processing-job', jobId],
    queryFn: () => getJobStatus(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'queued' || status === 'processing') {
        return POLLING_INTERVAL_MS;
      }

      return false;
    },
    retry: 1,
  });
}
