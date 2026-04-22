/**
 * Constantes compartidas del proyecto
 */

/**
 * Threshold de sincronización entre video y timeline (en segundos).
 * Solo se ejecuta un seek si la diferencia entre tiempo solicitado y actual
 * es mayor a este valor. Previene seeks innecesarios mientras mantiene
 * precisión visual.
 * 
 * Valor: 50ms (0.05s) - Balance entre precisión y eficiencia
 */
export const SYNC_THRESHOLD = 0.05;
