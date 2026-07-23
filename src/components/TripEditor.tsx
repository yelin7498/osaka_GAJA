'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  TripData,
  TripDay,
  SaveStatus,
  BudgetItem,
  ExpenseItem,
  OutfitDay,
  ChecklistItem,
  PackingItem,
  Spot,
  emptyDay,
} from '@/lib/types';
import {
  getEditTokenLocally,
  addRecentTrip,
  getPasscodeLocally,
  savePasscodeLocally,
} from '@/lib/auth/editToken';
import DayCard from './DayCard';
import SaveStatusIndicator from './SaveStatus';
import Toast, { ToastState } from './Toast';
import ExcelImportModal from './ExcelImportModal';
import BudgetSection from './BudgetSection';
import ExpenseSection from './ExpenseSection';
import OutfitSection from './OutfitSection';
import SpotsSection from './SpotsSection';
import ChecklistSection from './ChecklistSection';
import PackingSection from './PackingSection';

const AUTOSAVE_DELAY_MS = 1000;

const TAB_DEFS = [
  { id: 'itinerary', label: '일정표' },
  { id: 'budget', label: '예산' },
  { id: 'expense', label: '지출내역' },
  { id: 'outfit', label: '코디' },
  { id: 'spots', label: '주요여행지' },
  { id: 'checklist', label: '체크리스트' },
  { id: 'packing', label: '준비물' },
] as const;
type TabId = (typeof TAB_DEFS)[number]['id'];

export default function TripEditor({ initialTrip, slug }: { initialTrip: TripData; slug: string }) {
  const [trip, setTrip] = useState<TripData>(initialTrip);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  // role: 'owner' = 이 브라우저가 만든 사람(editToken 보유), 'guest' = 공유 편집 암호로 참여한 사람
  const [role, setRole] = useState<'owner' | 'guest' | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('itinerary');
  // 편집 암호 설정/참여용 다이얼로그. window.prompt()는 카카오톡 등 인앱 브라우저에서
  // 아예 뜨지 않거나 무시되는 경우가 있어, 화면 안 모달로 직접 구현합니다.
  const [passcodeDialog, setPasscodeDialog] = useState<'manage' | 'join' | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [passcodeBusy, setPasscodeBusy] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const lastSavedRef = useRef(JSON.stringify(initialTrip));

  // 편집 권한(소유자 editToken 또는 공유 편집 암호) 확인 + 최근 방문 목록 기록
  useEffect(() => {
    addRecentTrip({ slug, title: initialTrip.title, visitedAt: new Date().toISOString() });

    const token = getEditTokenLocally(slug);
    const passcode = getPasscodeLocally(slug);
    if (!token && !passcode) {
      setRole(null);
      return;
    }
    fetch(`/api/trips/${slug}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editToken: token ?? undefined, passcode: token ? undefined : passcode ?? undefined }),
    })
      .then((res) => res.json())
      .then((data) => setRole(data.valid ? (data.role === 'guest' ? 'guest' : 'owner') : null))
      .catch(() => setRole(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function getEditCredential(): { editToken?: string; passcode?: string } | null {
    const token = getEditTokenLocally(slug);
    if (token) return { editToken: token };
    const passcode = getPasscodeLocally(slug);
    if (passcode) return { passcode };
    return null;
  }

  function openJoinPasscodeDialog() {
    setPasscodeInput('');
    setPasscodeError(null);
    setPasscodeDialog('join');
  }

  function openManagePasscodeDialog() {
    setPasscodeInput('');
    setPasscodeError(null);
    setPasscodeDialog('manage');
  }

  function closePasscodeDialog() {
    if (passcodeBusy) return;
    setPasscodeDialog(null);
  }

  async function submitPasscodeDialog() {
    if (passcodeDialog === 'join') {
      const passcode = passcodeInput.trim();
      if (!passcode) {
        setPasscodeError('편집 암호를 입력해주세요.');
        return;
      }
      setPasscodeBusy(true);
      setPasscodeError(null);
      try {
        const res = await fetch(`/api/trips/${slug}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        });
        const data = await res.json();
        if (data.valid) {
          savePasscodeLocally(slug, passcode);
          setRole('guest');
          setPasscodeDialog(null);
          showToast('편집 권한을 얻었습니다. "편집하기" 버튼을 눌러 수정해보세요.');
        } else {
          setPasscodeError(data.error || '암호가 올바르지 않습니다.');
        }
      } catch {
        setPasscodeError('확인 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
      } finally {
        setPasscodeBusy(false);
      }
      return;
    }

    // manage
    const token = getEditTokenLocally(slug);
    if (!token) {
      setPasscodeError('편집 권한을 확인할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.');
      return;
    }
    const passcode = passcodeInput.trim();
    setPasscodeBusy(true);
    setPasscodeError(null);
    try {
      const res = await fetch(`/api/trips/${slug}/passcode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editToken: token, passcode: passcode || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasscodeError(data.error || '설정에 실패했습니다.');
        return;
      }
      setPasscodeDialog(null);
      if (data.enabled) {
        showToast(`편집 암호가 "${passcode}"(으)로 설정되었습니다. 이 암호를 함께 편집할 분께 알려주세요.`);
      } else {
        showToast('공유 편집 암호를 해제했습니다.');
      }
    } catch {
      setPasscodeError('설정 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setPasscodeBusy(false);
    }
  }

  function showToast(message: string, type: 'info' | 'error' = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  const saveNow = useCallback(
    async (tripToSave: TripData) => {
      const credential = getEditCredential();
      if (!credential) {
        setSaveStatus('error');
        showToast('편집 권한을 찾을 수 없습니다. 이 브라우저에서 만들었거나 편집 암호로 참여했는지 확인해주세요.', 'error');
        return;
      }
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/trips/${slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip: tripToSave, ...credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');
        lastSavedRef.current = JSON.stringify(data.trip);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
        showToast(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.', 'error');
      }
    },
    [slug]
  );

  // 자동 저장 (1초 debounce) - 편집 모드 & 소유자일 때만
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (mode !== 'edit' || !role) return;

    const currentJson = JSON.stringify(trip);
    if (currentJson === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNow(trip);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, mode, role]);

  function updateHeader(patch: Partial<TripData>) {
    setTrip((t) => ({ ...t, ...patch }));
  }

  function updateDay(dayId: string, patch: Partial<TripDay>) {
    setTrip((t) => ({ ...t, days: t.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }));
  }

  function addDay() {
    setTrip((t) => ({ ...t, days: [...t.days, emptyDay(t.days.length + 1)] }));
  }

  function deleteDay(dayId: string) {
    setTrip((t) => ({ ...t, days: t.days.filter((d) => d.id !== dayId) }));
  }

  function handleImport(importedDays: TripDay[]) {
    setTrip((t) => {
      const days = [...t.days];
      importedDays.forEach((imported) => {
        const existing = imported.date ? days.find((d) => d.date === imported.date) : undefined;
        if (existing) {
          const maxOrder = existing.items.reduce((m, it) => Math.max(m, it.order), 0);
          existing.items = [
            ...existing.items,
            ...imported.items.map((it, i) => ({ ...it, order: maxOrder + i + 1 })),
          ];
        } else {
          days.push(imported);
        }
      });
      return { ...t, days };
    });
    setShowImport(false);
    showToast(`엑셀에서 ${importedDays.reduce((n, d) => n + d.items.length, 0)}개 일정을 가져왔습니다.`);
  }

  function setBudget(budget: BudgetItem[]) {
    setTrip((t) => ({ ...t, budget }));
  }
  function setExRate(exRate: number) {
    setTrip((t) => ({ ...t, exRate }));
  }
  function setExpenses(expenses: ExpenseItem[]) {
    setTrip((t) => ({ ...t, expenses }));
  }
  function setOutfits(outfits: OutfitDay[]) {
    setTrip((t) => ({ ...t, outfits }));
  }
  function setSpots(spots: Spot[]) {
    setTrip((t) => ({ ...t, spots }));
  }
  function setChecklist(checklist: ChecklistItem[]) {
    setTrip((t) => ({ ...t, checklist }));
  }
  function setPacking(packing: PackingItem[]) {
    setTrip((t) => ({ ...t, packing }));
  }

  function handleShare() {
    const url = `${window.location.origin}/trip/${slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast('공유 링크가 복사되었습니다.'))
      .catch(() => showToast('복사에 실패했습니다. 주소창의 링크를 직접 복사해주세요.', 'error'));
  }

  function handlePrint() {
    window.print();
  }

  const canEdit = role !== null;

  return (
    <div>
      <header className="shell">
        <div className="ticket">
          <div className="ticket-top">
            <div style={{ flex: 1 }}>
              <p className="eyebrow">Family Trip</p>
              {mode === 'edit' ? (
                <input
                  className="mono"
                  style={{ fontSize: 22, fontWeight: 600, border: 'none', padding: '2px 0', fontFamily: "'Song Myung', serif" }}
                  value={trip.title}
                  onChange={(e) => updateHeader({ title: e.target.value })}
                  aria-label="여행 제목"
                />
              ) : (
                <h1 className="trip-title">{trip.title}</h1>
              )}
            </div>
            <div className="stamp">
              {trip.days.length > 0 ? `${trip.days.length}일차` : '일정 없음'}
            </div>
          </div>
          <div className="ticket-meta">
            <div className="meta-item">
              출발일<br />
              {mode === 'edit' ? (
                <input type="date" value={trip.startDate} onChange={(e) => updateHeader({ startDate: e.target.value })} aria-label="출발일" />
              ) : (
                <b>{trip.startDate || '미정'}</b>
              )}
            </div>
            <div className="meta-item">
              귀국일<br />
              {mode === 'edit' ? (
                <input type="date" value={trip.endDate} onChange={(e) => updateHeader({ endDate: e.target.value })} aria-label="귀국일" />
              ) : (
                <b>{trip.endDate || '미정'}</b>
              )}
            </div>
            <div className="meta-item">
              인원<br />
              {mode === 'edit' ? (
                <input
                  type="number"
                  min={1}
                  style={{ width: 60 }}
                  value={trip.travelers}
                  onChange={(e) => updateHeader({ travelers: Number(e.target.value) || 1 })}
                  aria-label="인원"
                />
              ) : (
                <b>{trip.travelers}명</b>
              )}
            </div>
            <div className="meta-item">
              숙소<br />
              {mode === 'edit' ? (
                <input value={trip.hotel} onChange={(e) => updateHeader({ hotel: e.target.value })} placeholder="숙소명" aria-label="숙소" />
              ) : (
                <b>{trip.hotel || '미정'}</b>
              )}
            </div>
          </div>
          {(mode === 'edit' || trip.description) && (
            <div style={{ marginTop: 12 }}>
              {mode === 'edit' ? (
                <textarea
                  rows={2}
                  value={trip.description}
                  onChange={(e) => updateHeader({ description: e.target.value })}
                  placeholder="여행 소개/메모 (선택)"
                  aria-label="여행 설명"
                />
              ) : (
                <p className="hint" style={{ margin: 0 }}>{trip.description}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="toolbar no-print">
        <span className={`mode-badge ${mode}`}>{mode === 'edit' ? '편집 모드' : '보기 모드'}</span>
        {canEdit && (
          <button onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} aria-label={mode === 'edit' ? '보기 모드로 전환' : '편집 모드로 전환'}>
            {mode === 'edit' ? '보기 모드로' : '편집하기'}
          </button>
        )}
        {mode === 'edit' && canEdit && (
          <>
            <button className="primary" onClick={() => saveNow(trip)} aria-label="지금 저장">저장</button>
            <button onClick={() => setShowImport(true)} aria-label="엑셀로 일정 가져오기">엑셀 가져오기</button>
            <SaveStatusIndicator status={saveStatus} />
          </>
        )}
        {role === 'owner' && (
          <button onClick={openManagePasscodeDialog} aria-label="공유 편집 암호 설정">
            👪 편집 암호 설정
          </button>
        )}
        {!canEdit && (
          <button onClick={openJoinPasscodeDialog} aria-label="편집 암호로 참여하기">
            🔑 편집 암호로 참여
          </button>
        )}
        <div className="spacer" />
        <button onClick={handleShare} aria-label="공유 링크 복사">🔗 공유 링크 복사</button>
        <button onClick={handlePrint} aria-label="인쇄 또는 PDF로 저장">🖨️ 인쇄/PDF</button>
      </div>

      <nav className="tab-track no-print">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            aria-label={t.label}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'itinerary' &&
          (trip.days.length === 0 ? (
            <section className="card state-screen">
              <p>아직 등록된 날짜가 없습니다.</p>
              {canEdit && mode === 'edit' && (
                <button className="primary" onClick={addDay} aria-label="첫 날짜 추가">+ 날짜 추가</button>
              )}
            </section>
          ) : (
            <>
              {trip.days.map((day, i) => (
                <DayCard
                  key={day.id}
                  day={day}
                  dayIndex={i}
                  mode={mode}
                  onChangeDay={(patch) => updateDay(day.id, patch)}
                  onDeleteDay={() => deleteDay(day.id)}
                  canDeleteDay={trip.days.length > 0}
                />
              ))}
              {mode === 'edit' && (
                <button className="add-row-btn" onClick={addDay} aria-label="날짜 섹션 추가">
                  + 날짜 추가
                </button>
              )}
            </>
          ))}

        {activeTab === 'budget' && (
          <BudgetSection budget={trip.budget} exRate={trip.exRate} mode={mode} onChangeBudget={setBudget} onChangeExRate={setExRate} />
        )}
        {activeTab === 'expense' && (
          <ExpenseSection expenses={trip.expenses} exRate={trip.exRate} mode={mode} onChange={setExpenses} />
        )}
        {activeTab === 'outfit' && <OutfitSection outfits={trip.outfits} mode={mode} onChange={setOutfits} />}
        {activeTab === 'spots' && <SpotsSection spots={trip.spots} mode={mode} onChange={setSpots} />}
        {activeTab === 'checklist' && <ChecklistSection checklist={trip.checklist} mode={mode} onChange={setChecklist} />}
        {activeTab === 'packing' && <PackingSection packing={trip.packing} mode={mode} onChange={setPacking} />}
      </main>

      {showImport && <ExcelImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}

      {passcodeDialog && (
        <div className="modal-backdrop" onClick={closePasscodeDialog}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 className="display-h">{passcodeDialog === 'manage' ? '편집 암호 설정' : '편집 암호로 참여'}</h3>
            <p className="hint">
              {passcodeDialog === 'manage'
                ? '가족과 공유할 암호를 정해주세요 (4자 이상). 입력칸을 비워두고 확인을 누르면 공유 편집을 해제합니다.'
                : '가족(또는 함께 편집할 분)에게 받은 편집 암호를 입력해주세요.'}
            </p>
            <input
              type="text"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="암호 입력"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPasscodeDialog();
              }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {passcodeError && (
              <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 6 }}>{passcodeError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={closePasscodeDialog} disabled={passcodeBusy}>취소</button>
              <button className="primary" onClick={submitPasscodeDialog} disabled={passcodeBusy}>
                {passcodeBusy ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
