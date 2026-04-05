import { aggregateFeed } from '@/lib/pulse/aggregator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const disabledArr = searchParams.get('disabled')?.split(',').filter(Boolean) ?? [];
  const stories = await aggregateFeed(new Set(disabledArr));
  return Response.json(stories);
}
