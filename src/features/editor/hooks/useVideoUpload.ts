import { useEffect, useMemo, useState } from 'react';

import Uppy, { type Body, type Meta, type UppyFile } from '@uppy/core';
import Tus from '@uppy/tus';

const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const TUS_CHUNK_SIZE = 5 * 1024 * 1024;

type UppyAnyFile = UppyFile<Meta, Body>;

interface UseVideoUploadOptions {
  onVideoSelected: (file: File) => void;
  onUploadIdReceived: (uploadId: string) => void;
  onUploadStateChange: (status: 'idle' | 'uploading' | 'uploaded' | 'error', message: string | null) => void;
}

interface UseVideoUploadResult {
  uppy: Uppy<Meta, Body>;
  isDashboardOpen: boolean;
  setDashboardOpen: (open: boolean) => void;
  isTusEnabled: boolean;
  uploadProgress: number;
  uploadError: string | null;
}

export function useVideoUpload({
  onVideoSelected,
  onUploadIdReceived,
  onUploadStateChange,
}: UseVideoUploadOptions): UseVideoUploadResult {
  const tusEndpoint = import.meta.env.VITE_TUS_ENDPOINT?.trim();
  const isTusEnabled = Boolean(tusEndpoint);
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uppy = useMemo(() => {
    const instance = new Uppy<Meta, Body>({
      id: 'videoUploader',
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ['video/*'],
        maxFileSize: MAX_VIDEO_SIZE_BYTES,
      },
      autoProceed: false,
      allowMultipleUploadBatches: false,
    });

    if (isTusEnabled && tusEndpoint) {
      instance.use(Tus, {
        endpoint: tusEndpoint,
        chunkSize: TUS_CHUNK_SIZE,
        retryDelays: [0, 1000, 3000, 5000],
        removeFingerprintOnSuccess: true,
      });
    }

    return instance;
  }, []); // Solo crear una vez

  useEffect(() => {
    function handleFileAdded(file: UppyAnyFile): void {
      if (!(file.data instanceof File)) {
        setUploadError('El archivo seleccionado no es valido para edicion.');
        onUploadStateChange('error', 'Archivo no valido.');
        return;
      }

      setUploadError(null);
      setUploadProgress(0);
      onVideoSelected(file.data);

      if (isTusEnabled) {
        onUploadStateChange('uploading', 'Subiendo con Tus en modo reanudable.');
        void uppy.upload();
      } else {
        onUploadStateChange('idle', 'Carga local lista. Define VITE_TUS_ENDPOINT para habilitar subida reanudable.');
      }
    }

    function handleRestrictionFailed(_file: UppyAnyFile | undefined, error: Error): void {
      setUploadError(error.message);
      onUploadStateChange('error', error.message);
    }

    function handleUploadProgress(
      _file: UppyAnyFile | undefined,
      progress: { bytesUploaded: number; bytesTotal: number | null },
    ): void {
      if (!progress.bytesTotal) {
        return;
      }

      const percentage = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
      setUploadProgress(percentage);
    }

    function handleUploadSuccess(_file: UppyAnyFile | undefined, response: { uploadURL?: string }): void {
      const uploadURL = response.uploadURL ?? '';
      const uploadId = uploadURL.split('/').filter(Boolean).pop() ?? uploadURL;

      setUploadProgress(100);
      onUploadStateChange('uploaded', 'Subida reanudable completada.');

      if (uploadId) {
        onUploadIdReceived(uploadId);
      }
    }

    function handleError(error: Error): void {
      setUploadError(error.message);
      onUploadStateChange('error', error.message);
    }

    uppy.on('file-added', handleFileAdded);
    uppy.on('restriction-failed', handleRestrictionFailed);
    uppy.on('upload-progress', handleUploadProgress);
    uppy.on('upload-success', handleUploadSuccess);
    uppy.on('error', handleError);

    return () => {
      uppy.off('file-added', handleFileAdded);
      uppy.off('restriction-failed', handleRestrictionFailed);
      uppy.off('upload-progress', handleUploadProgress);
      uppy.off('upload-success', handleUploadSuccess);
      uppy.off('error', handleError);
    };
  }, [isTusEnabled, onUploadIdReceived, onUploadStateChange, onVideoSelected, uppy]);

  // Cleanup solo al desmontar
  useEffect(() => {
    return () => {
      uppy.cancelAll();
      uppy.close();
    };
  }, [uppy]);

  return {
    uppy,
    isDashboardOpen,
    setDashboardOpen,
    isTusEnabled,
    uploadProgress,
    uploadError,
  };
}
