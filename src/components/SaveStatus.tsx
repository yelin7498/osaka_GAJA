'use client';

import { SaveStatus as SaveStatusType } from '@/lib/types';

const LABEL: Record<SaveStatusType, string> = {
  idle: '',
  saving: '저장 중...',
  saved: '저장 완료',
  error: '저장 실패',
};

export default function SaveStatusIndicator({ status }: { status: SaveStatusType }) {
  if (status === 'idle') return null;
  return (
    <span className="save-status no-print" role="status" aria-live="polite">
      {status === 'saving' && <span className="spin" aria-hidden />}
      <span style={{ color: status === 'error' ? 'var(--danger)' : undefined }}>{LABEL[status]}</span>
    </span>
  );
}
