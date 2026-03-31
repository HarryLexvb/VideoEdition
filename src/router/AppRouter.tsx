import { Suspense, lazy } from 'react';

import { Navigate, Route, Routes } from 'react-router-dom';

const EditorPage = lazy(() => import('../features/editor/pages/EditorPage').then((module) => ({ default: module.EditorPage })));

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-app px-4 py-10 text-slate-700 dark:text-slate-300">
          <div className="mx-auto max-w-[1600px] rounded-2xl border border-white/60 bg-white/70 p-6 text-sm shadow-sm dark:border-slate-700/50 dark:bg-slate-800/70">
            Cargando editor...
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
