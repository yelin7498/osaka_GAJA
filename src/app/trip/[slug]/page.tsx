import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { TripData, normalizeTrip } from '@/lib/types';
import TripEditor from '@/components/TripEditor';

export const dynamic = 'force-dynamic'; // 항상 최신 데이터를 보여줍니다.

async function fetchTrip(slug: string): Promise<TripData | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('trips')
      .select('trip_data, is_public')
      .eq('slug', slug)
      .maybeSingle();

    if (!data || !data.is_public) return null;
    return normalizeTrip(data.trip_data as TripData);
  } catch {
    // 환경변수 미설정 등 서버 오류 시에도 500 대신 not-found 화면으로 안내
    return null;
  }
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await fetchTrip(slug);
  if (!trip) notFound();

  return <TripEditor initialTrip={trip} slug={slug} />;
}
