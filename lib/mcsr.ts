import { MatchInfo } from "@/types/mcsr";

const BASE_URL = process.env.MCSR_API_BASE || "https://api.mcsrranked.com";
const API_KEY = process.env.MCSR_API_KEY || "";

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  return headers;
}

/**
 * Fetch details for a single match.  Some advanced fields (like timeline and
 * completions) are only available from this endpoint.  See API docs for
 * details.
 */
export async function fetchMatchDetail(matchId: string): Promise<MatchInfo> {
  const url = `${BASE_URL}/matches/${encodeURIComponent(matchId)}`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Match detail request failed with status ${res.status}`);
  }
  const json = await res.json();
  // According to the docs, the match object is under `data`
  return json?.data as MatchInfo;
}

/**
 * Fetch all matches for a given user.  The API expects an identifier which
 * can be a nickname, UUID or Discord ID.  Pagination is optional; when
 * omitted the API will return the first page of matches.  This function
 * returns only the basic match info; advanced fields are omitted for
 * bandwidth reasons.
 */
export async function fetchUserMatches(identifier: string, page?: number): Promise<MatchInfo[]> {
  const url = new URL(`${BASE_URL}/users/${encodeURIComponent(identifier)}/matches?count=100`);
  if (page != null) url.searchParams.set("page", String(page));
  const res = await fetch(url.toString(), { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`User matches request failed with status ${res.status}`);
  }
  const json = await res.json();
  return (json?.data ?? []) as MatchInfo[];
}