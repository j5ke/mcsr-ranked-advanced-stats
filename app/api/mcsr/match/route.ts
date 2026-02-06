import { fetchMatchDetail } from "@/lib/mcsr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const match = await fetchMatchDetail(id);
    return new Response(JSON.stringify({ match }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}