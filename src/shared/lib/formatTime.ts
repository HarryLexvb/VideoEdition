const TWO_DIGITS = 2;

/**
 * Formatea segundos a formato MM:SS o HH:MM:SS
 * @param seconds - Tiempo en segundos
 * @param showMilliseconds - Si true, muestra centésimas de segundo (.XX)
 * @returns Tiempo formateado
 */
export function formatTime(seconds: number, showMilliseconds: boolean = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return showMilliseconds ? '00:00.00' : '00:00';
  }

  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  
  let timeStr = '';
  
  if (hours > 0) {
    timeStr = `${String(hours).padStart(TWO_DIGITS, '0')}:${String(minutes).padStart(TWO_DIGITS, '0')}:${String(secs).padStart(TWO_DIGITS, '0')}`;
  } else {
    timeStr = `${String(minutes).padStart(TWO_DIGITS, '0')}:${String(secs).padStart(TWO_DIGITS, '0')}`;
  }
  
  if (showMilliseconds) {
    const centiseconds = Math.floor((seconds - rounded) * 100);
    timeStr += `.${String(centiseconds).padStart(TWO_DIGITS, '0')}`;
  }
  
  return timeStr;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
