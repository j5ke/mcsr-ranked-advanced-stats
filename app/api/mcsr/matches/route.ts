import { fetchMatchDetail } from "@/lib/mcsr";
import { MatchInfo } from "@/types/mcsr";

const CACHE_TTL_MS = 5 * 60 * 1000;
const detailCache = new Map<string, { ts: number; match: MatchInfo }>();

function getCached(id: string) {
  const cached = detailCache.get(id);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    detailCache.delete(id);
    return null;
  }
  return cached.match;
}

async function fetchWithLimit(ids: string[], limit: number) {
  const results: Record<string, MatchInfo> = {};
  const queue = [...ids];
  const workers = Array.from({ length: Math.min(limit, ids.length) }, async () => {
    while (queue.length) {
      const id = queue.shift();
      if (!id) return;
      const cached = getCached(id);
      if (cached) {
        results[id] = cached;
        continue;
      }
      const match = await fetchMatchDetail(id);
      results[id] = match;
      detailCache.set(id, { ts: Date.now(), match });
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    if (!ids.length) {
      return new Response(JSON.stringify({ error: "missing ids" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const matches = await fetchWithLimit(ids, 5);
    return new Response(JSON.stringify({ matches }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
