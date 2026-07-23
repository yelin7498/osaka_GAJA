import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, verifyEditToken } from '@/lib/supabase/server';
import { TripData } from '@/lib/types';

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/trips/:slug  -> 공개 조회 (보기 전용 데이터)
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('trips')
    .select('slug, title, trip_data, is_public, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || !data.is_public) {
    return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ trip: data.trip_data as TripData });
}

// PUT /api/trips/:slug  -> 수정 (editToken 필요, 서버에서 재검증)
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const editToken: string | undefined = body?.editToken;
    const trip: TripData | undefined = body?.trip;

    if (!editToken) {
      return NextResponse.json({ error: '편집 권한 토큰이 없습니다.' }, { status: 401 });
    }
    if (!trip) {
      return NextResponse.json({ error: '저장할 일정 데이터가 없습니다.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('trips')
      .select('id, edit_token_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });

    // *** 실제 권한 검증은 항상 서버에서 다시 수행합니다 (클라이언트 값은 신뢰하지 않음) ***
    const ok = verifyEditToken(editToken, row.edit_token_hash);
    if (!ok) {
      return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });
    }

    const updatedTrip: TripData = { ...trip, slug, updatedAt: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('trips')
      .update({
        title: updatedTrip.title,
        trip_data: updatedTrip,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ trip: updatedTrip });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/trips/:slug -> 여행 전체 삭제 (editToken 필요)
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const editToken: string | undefined = body?.editToken;
    if (!editToken) return NextResponse.json({ error: '편집 권한 토큰이 없습니다.' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('trips')
      .select('id, edit_token_hash')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });

    const ok = verifyEditToken(editToken, row.edit_token_hash);
    if (!ok) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const { error: deleteError } = await supabase.from('trips').delete().eq('id', row.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
