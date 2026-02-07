import { format as dfFormat } from 'date-fns';

/** Human-friendly mappings for known structure names */
const STRUCTURE_LABELS: Record<string, string> = {
  RUINED_PORTAL: 'Ruined Portal',
  SHIPWRECK: 'Shipwreck',
  VILLAGE: 'Village',
  STRONGHOLD: 'Stronghold',
};

/** Human-friendly biome names (partial list; extend as needed) */
const BIOME_LABELS: Record<string, string> = {
  basalts: 'Basalt Deltas',
  CRIMSON_FOREST: 'Crimson Forest',
  warped_forest: 'Warped Forest',
  plains: 'Plains',
};

export function humanizeStructure(key: string | null | undefined) {
  if (!key) return '—';
  if (STRUCTURE_LABELS[key]) return STRUCTURE_LABELS[key];
  return key.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

export function humanizeBiome(key: string | null | undefined) {
  if (!key) return 'Any';
  if (BIOME_LABELS[key]) return BIOME_LABELS[key];
  return key.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

export function typeLabel(type: number) {
  // Standard mapping: 1 = Casual, 2 = Ranked, 3 = Private Room, 4 = Event
  switch (type) {
    case 1:
      return 'Casual';
    case 2:
      return 'Ranked';
    case 3:
      return 'Private Room';
    case 4:
      return 'Event';
    default:
      return 'Unknown';
  }
}

export function formatDateSec(epochSec: number) {
  return dfFormat(new Date(epochSec * 1000), 'MMM. do, yyyy');
}

export function formatDurationMs(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const SSS = String(millis).padStart(3, '0');
  return `${hh}:${mm}:${ss}:${SSS}`;
}

/**
 * Format seconds into a short human string HH:MM:SS:MS, dropping leading
 * hour/minute components when they are zero. Examples:
 *  - 1.234 -> "1:234"
 *  - 61.5  -> "1:01:500"
 *  - 3661.005 -> "1:01:01:005"
 */
export function formatSecondsShort(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  const msStr = String(millis).padStart(3, '0');
  const ss = String(secs).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}:${msStr}`;
  }
  if (minutes > 0) {
    return `${minutes}:${ss}:${msStr}`;
  }
  return `${secs}:${msStr}`;
}

/**
 * Compact seconds formatter for axis and bucket labels. Examples:
 *  - 75 -> "1m"
 *  - 700 -> "12m"
 *  - 3665 -> "1h1m"
 */
export function formatSecondsCompact(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const hours = Math.floor(s / 3600);
  const remAfterHours = s % 3600;
  const minutes = Math.floor(remAfterHours / 60);
  const secs = remAfterHours % 60;

  if (hours > 0) {
    if (minutes > 0 && secs > 0) return `${hours}h${minutes}m${secs}s`;
    if (minutes > 0) return `${hours}h${minutes}m`;
    return `${hours}h`;
  }

  if (minutes > 0) {
    // Always include seconds when present for clarity (e.g. "7m30s")
    return secs > 0 ? `${minutes}m${secs}s` : `${minutes}m`;
  }

  return `${s}s`;
}

/**
 * Parse variation strings into a normalized object for easier filtering and display.
 * Example variation entries:
 *  - "type:structure:completable"
 *  - "biome:structure:plains"
 *  - "bastion:triple:1"
 *  - "end_spawn:buried:60"
 */
export function parseVariations(variations: string[] = []) {
  const res: {
    structures: Set<string>;
    fortressBiomes: Set<string>;
    bastionBiomes: Set<string>;
    bastionType?: string | null;
    endSpawnBuried?: number | null;
    raw: string[];
  } = { structures: new Set(), fortressBiomes: new Set(), bastionBiomes: new Set(), bastionType: null, endSpawnBuried: null, raw: [] };

  for (const v of variations) {
    res.raw.push(v);
    const parts = v.split(':');
    if (parts[0] === 'biome') {
      // biome:<dimension>:<biome_key>
      const dim = parts[1];
      const biome = parts[2];
      if (dim === 'fortress') res.fortressBiomes.add(biome);
      else if (dim === 'bastion') res.bastionBiomes.add(biome);
      else if (dim === 'structure') res.structures.add(biome);
    } else if (parts[0] === 'bastion') {
      // bastion:<type>:<maybe_number>
      if (parts[1]) res.bastionType = parts[1];
    } else if (parts[0] === 'end_spawn' && parts[1] === 'buried') {
      const n = Number(parts[2]);
      if (!Number.isNaN(n)) res.endSpawnBuried = n;
    } else if (parts[0] === 'end_tower' && parts.length >= 3) {
      // ignore; end tower heights are present in seed.endTowers
    }
  }

  return res;
}

export function getBastionTypeFromSeed(seedVariations: string[] | undefined) {
  return parseVariations(seedVariations ?? []).bastionType ?? null;
}

/** Humanize known variation strings for display */
export function humanizeVariation(v: string) {
  if (!v) return v;
  // Centralized exact-match map for human-friendly variation labels.
  const VARIATION_HUMAN_MAP: Record<string, string> = {
    'bastion:good_gap:1': 'Right Good Gap',
    'bastion:good_gap:2': 'Left Good Gap',
    'bastion:single:1': '1 Single Chest',
    'bastion:single:2': '2 Single Chests',
    'bastion:single:3': '3 Single Chests',
    'bastion:triple:1': '1 Triple Chest',
    'bastion:triple:2': '2 Triple Chests',
    'bastion:triple:3': '3 Triple Chests',
    'bastion:small_single:1': '1 Small Single Chest',
    'bastion:small_single:2': '2 Small Single Chests',
    'chest:structure:carrot': 'Chest (Carrot)',
    'chest:structure:diamond': 'Diamond',
    'chest:structure:egap': 'Enchanted Golden Apple',
    'chest:structure:looting_sword': 'Looting Sword',
    'chest:structure:shield': 'Chest (Shield)'
  };

  if (VARIATION_HUMAN_MAP[v]) return VARIATION_HUMAN_MAP[v];

  // Generic fallback: make readable by replacing separators and capitalizing words.
  return v.replace(/:/g, ' ').replace(/_/g, ' ').replace(/\b(\w)/g, (s) => s.toUpperCase());
}

/**
 * Configurable mapping from specific variation keys to derived filter changes.
 * Add entries here when a variation implies a seed-level filter should be
 * selected automatically (for example, good_gap variations imply the
 * STABLES bastion). This centralizes the coupling so the UI can scale to many
 * such links without hardcoding behavior in the component.
 */
export const VARIATION_AUTO_LINKS: Record<string, { bastion?: string }> = {
  'bastion:good_gap:1': { bastion: 'STABLES' },
  'bastion:good_gap:2': { bastion: 'STABLES' },
};
