import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyEditToken } from '@/lib/supabase/server';

// POST /api/trips/:slug/verify
// 브라우저가 localStorage에 들고 있는 editToken이 이 여행의 편집 권한과
// 일치하는지 "편집 모드 진입 가능 여부"만 확인합니다. (실제 저장 시에는
// PUT 핸들러가 다시 한번 독립적으로 검증하므로, 이 응답만으로 서버 데이터를
// 바꾸는 곳은 없습니다.)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const editToken: string | undefined = body?.editToken;
    if (!editToken) return NextResponse.json({ valid: false });

    const supabase = getSupabaseAdmin();
    const { data: row } = await supabase
      .from('trips')
      .select('edit_token_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (!row) return NextResponse.json({ valid: false });

    return NextResponse.json({ valid: verifyEditToken(editToken, row.edit_token_hash) });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
