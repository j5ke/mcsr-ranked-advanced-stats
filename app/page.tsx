import SearchBar from "@/components/SearchBar";

/**
 * Root page of the application.  Presents a simple search bar allowing users
 * to enter a nickname, UUID or Discord ID.  When a value is submitted the
 * browser is redirected to `/u/[identifier]`, where the advanced stats hub
 * is displayed.
 */
export default function Page() {
  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>MCSR Ranked Stats</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Enter your nickname, UUID or Discord ID to explore your speed‑running match statistics.
      </p>
      <SearchBar />
    </main>
  );
}