import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyEditToken, hashPasscode } from '@/lib/supabase/server';

// PUT /api/trips/:slug/passcode
// 소유자(editToken 보유자)만 이 여행의 "공유 편집 암호"를 설정/변경/해제할 수 있습니다.
// passcode를 빈 값(null/'')으로 보내면 암호를 해제합니다(공유 편집을 끕니다).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const editToken: string | undefined = body?.editToken;
    const passcodeRaw: string | null | undefined = body?.passcode;

    if (!editToken) {
      return NextResponse.json({ error: '편집 권한 토큰이 없습니다.' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('trips')
      .select('id, edit_token_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });

    // 암호 설정/변경/해제는 반드시 소유자(editToken)만 가능합니다.
    const ok = verifyEditToken(editToken, row.edit_token_hash);
    if (!ok) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const passcode = (passcodeRaw ?? '').trim();
    if (passcode && passcode.length < 4) {
      return NextResponse.json({ error: '암호는 4자 이상으로 정해주세요.' }, { status: 400 });
    }

    const edit_passcode_hash = passcode ? hashPasscode(passcode, slug) : null;

    const { error: updateError } = await supabase
      .from('trips')
      .update({ edit_passcode_hash })
      .eq('id', row.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ok: true, enabled: !!edit_passcode_hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
