'use client';

export interface ToastState {
  message: string;
  type?: 'info' | 'error';
}

export default function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div className={`save-indicator no-print ${toast ? 'show' : ''} ${toast?.type === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
      {toast?.message ?? ''}
    </div>
  );
}
