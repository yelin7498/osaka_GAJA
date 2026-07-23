import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyPasscode } from '@/lib/supabase/server';

// POST /api/trips/:slug/join
// 가족 등 다른 사람이 소유자에게 전달받은 "공유 편집 암호"를 입력해
// 이 브라우저도 편집자가 될 수 있는지 확인합니다. 유효하면 클라이언트가
// 이 passcode를 localStorage에 저장해두고, 이후 저장(PUT) 요청 때 함께 보냅니다.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const passcode: string | undefined = body?.passcode;
    if (!passcode) {
      return NextResponse.json({ valid: false, error: '편집 암호를 입력해주세요.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row } = await supabase
      .from('trips')
      .select('edit_passcode_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ valid: false, error: '일정을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (!row.edit_passcode_hash) {
      return NextResponse.json({ valid: false, error: '이 일정에는 공유 편집 암호가 설정되어 있지 않습니다.' });
    }

    const ok = verifyPasscode(passcode, slug, row.edit_passcode_hash);
    return NextResponse.json({ valid: ok, error: ok ? undefined : '암호가 올바르지 않습니다.' });
  } catch {
    return NextResponse.json({ valid: false, error: '확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
