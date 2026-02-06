import { fetchUserMatches } from "@/lib/mcsr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier");
  const pageParam = searchParams.get("page");
  if (!identifier) {
    return new Response(JSON.stringify({ error: "missing identifier" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  let page: number | undefined;
  if (pageParam) {
    const parsed = parseInt(pageParam, 10);
    if (!isNaN(parsed)) page = parsed;
  }
  try {
    const matches = await fetchUserMatches(identifier, page);
    return new Response(JSON.stringify({ matches }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}