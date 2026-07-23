import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, generateEditToken, hashEditToken } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/slug';
import { createBlankTrip, TripData } from '@/lib/types';

// POST /api/trips
// 새 여행 일정을 생성합니다. 로그인이 필요 없으며, 생성 직후 1회에 한해
// editToken 원문을 응답으로 돌려줍니다(그 이후로는 서버가 원문을 다시 보여주지 않습니다).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customSlugName: string | undefined = body?.slugName;
    const overrides: Partial<TripData> = body?.trip ?? {};

    const supabase = getSupabaseAdmin();

    // slug 충돌 시 몇 번 재시도
    let slug = generateSlug(customSlugName);
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase.from('trips').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = generateSlug(customSlugName);
    }

    const trip = createBlankTrip({ ...overrides, slug });
    const editToken = generateEditToken();
    const editTokenHash = hashEditToken(editToken);

    const { data, error } = await supabase
      .from('trips')
      .insert({
        slug,
        title: trip.title,
        trip_data: trip,
        edit_token_hash: editTokenHash,
        is_public: true,
      })
      .select('slug, trip_data')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      trip: data.trip_data,
      slug: data.slug,
      editToken, // 클라이언트가 localStorage에 저장할 값. 응답은 이번 한 번뿐.
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
