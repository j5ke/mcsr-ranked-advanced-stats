import Hub from "./ui";

interface PageProps {
  params: { identifier: string };
}

/**
 * Server component that acts as the entry point for the user stats page.
 * It decodes the identifier from the route and passes it down to the
 * client component `Hub` defined in `ui.tsx`.  Any server–side logic or
 * data fetching could be added here if necessary.
 */
export default function Page({ params }: PageProps) {
  const { identifier } = params;
  // decode in case identifier contains encoded characters (e.g. spaces)
  const decoded = decodeURIComponent(identifier);
  return <Hub identifier={decoded} />;
}