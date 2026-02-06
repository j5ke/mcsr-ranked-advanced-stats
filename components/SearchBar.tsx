"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Input component used on the home page.  Users can type in their player
 * identifier (nickname, UUID or Discord ID).  Pressing Enter or clicking
 * the button navigates to the stats page for that identifier.
 */
export default function SearchBar() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      // encode special characters to ensure a valid URL segment
      router.push(`/u/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Illumina, 123e4567-e89b-12d3-a456-426614174000"
        style={{ flex: 1, padding: "0.5rem 1rem", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc" }}
      />
      <button
        type="submit"
        style={{ padding: "0.5rem 1rem", fontSize: "1rem", borderRadius: 8, border: "none", backgroundColor: "#0070f3", color: "white", cursor: "pointer" }}
      >
        Search
      </button>
    </form>
  );
}