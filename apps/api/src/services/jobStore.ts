import { Job } from '../types';

// In-memory job store para el MVP.
// Para producción avanzada reemplazar con BullMQ + Redis.
const store = new Map<string, Job>();

export const jobStore = {
  set(job: Job): void {
    store.set(job.id, job);
  },

  get(id: string): Job | undefined {
    return store.get(id);
  },

  update(id: string, updates: Partial<Job>): void {
    const job = store.get(id);
    if (job) {
      store.set(id, { ...job, ...updates });
    }
  },

  delete(id: string): void {
    store.delete(id);
  },
};
