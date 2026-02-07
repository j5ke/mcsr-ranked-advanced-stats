import Hub from "./ui";

interface PageProps {
  params: Promise<{ identifier: string }>;
}

function safeDecode(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params;
  const decoded = safeDecode(resolved?.identifier);
  return {
    title: `${decoded}'s MCSR Advanced Stats`,
  };
}

/**
 * Server component that acts as the entry point for the user stats page.
 * It decodes the identifier from the route and passes it down to the
 * client component `Hub` defined in `ui.tsx`.  Any server–side logic or
 * data fetching could be added here if necessary.
 */
export default async function Page({ params }: PageProps) {
  const resolved = await params;
  const decoded = safeDecode(resolved?.identifier);
  return <Hub identifier={decoded} />;
}