import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyEditToken, verifyPasscode } from '@/lib/supabase/server';

// POST /api/trips/:slug/verify
// 브라우저가 localStorage에 들고 있는 editToken 또는 공유 편집 암호(passcode)가
// 이 여행의 편집 권한과 일치하는지 "편집 모드 진입 가능 여부"만 확인합니다.
// (실제 저장 시에는 PUT 핸들러가 다시 한번 독립적으로 검증하므로, 이 응답만으로
// 서버 데이터를 바꾸는 곳은 없습니다.)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const editToken: string | undefined = body?.editToken;
    const passcode: string | undefined = body?.passcode;
    if (!editToken && !passcode) return NextResponse.json({ valid: false });

    const supabase = getSupabaseAdmin();
    const { data: row } = await supabase
      .from('trips')
      .select('edit_token_hash, edit_passcode_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (!row) return NextResponse.json({ valid: false });

    if (editToken && verifyEditToken(editToken, row.edit_token_hash)) {
      return NextResponse.json({ valid: true, role: 'owner' });
    }
    if (passcode && verifyPasscode(passcode, slug, row.edit_passcode_hash)) {
      return NextResponse.json({ valid: true, role: 'guest' });
    }
    return NextResponse.json({ valid: false });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
