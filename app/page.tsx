"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from './page.module.css';
import logo from '../assets/logo.png';

function RollingNumber({ value, className }: { value: number; className?: string }) {
  const formatted = useMemo(() => new Intl.NumberFormat('en-US').format(value), [value]);
  const digitHeight = 28;
  return (
    <div className={`${styles.rollNumber} ${className ?? ''}`.trim()} aria-live="polite">
      {formatted.split('').map((ch, idx) => {
        if (ch === ',') {
          return <span key={`c-${idx}`} className={styles.rollComma}>,</span>;
        }
        const digit = Number(ch);
        return (
          <span key={`d-${idx}`} className={styles.rollDigit}>
            <span className={styles.digitStack} style={{ transform: `translateY(-${digit * digitHeight}px)` }}>
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} className={styles.digit}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statCard}>
      <RollingNumber value={value} className={styles.statValue} />
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

type JumpState = {
  value: number;
  nextAt: number;
  seed: number;
};

const LCG_A = 1664525;
const LCG_C = 1013904223;
const LCG_M = 2 ** 32;

function nextRng(state: JumpState) {
  state.seed = (state.seed * LCG_A + LCG_C) >>> 0;
  return state.seed;
}

function randInt(state: JumpState, min: number, max: number) {
  const span = max - min + 1;
  return min + (nextRng(state) % span);
}

function randFloat(state: JumpState) {
  return nextRng(state) / LCG_M;
}

function weightedStepFromRand(r: number, min = 1, max = 10) {
  let total = 0;
  for (let i = min; i <= max; i += 1) total += 1 / i;
  let acc = 0;
  for (let i = min; i <= max; i += 1) {
    acc += 1 / i;
    if (r <= acc / total) return i;
  }
  return min;
}

function initJumpState(start: number, seed: number, epochMs: number, nowMs: number) {
  const state: JumpState = { value: start, nextAt: epochMs, seed };
  // Schedule the first jump.
  state.nextAt += randInt(state, 1, 5) * 1000;
  // Fast-forward deterministically to current time.
  while (state.nextAt <= nowMs) {
    state.value += randInt(state, 1, 5);
    state.nextAt += randInt(state, 1, 5) * 1000;
  }
  return state;
}

function tickJumpState(state: JumpState, nowMs: number) {
  while (state.nextAt <= nowMs) {
    state.value += randInt(state, 1, 5);
    state.nextAt += randInt(state, 1, 5) * 1000;
  }
}

function initAvgState(start: number, seed: number, epochMs: number, nowMs: number) {
  const state: JumpState = { value: start, nextAt: epochMs, seed };
  state.nextAt += randInt(state, 1, 5) * 1000;
  while (state.nextAt <= nowMs) {
    const step = weightedStepFromRand(randFloat(state), 1, 10);
    const dir = randInt(state, 0, 1) === 0 ? -1 : 1;
    state.value = Math.max(60, Math.min(1200, state.value + dir * step));
    state.nextAt += randInt(state, 1, 5) * 1000;
  }
  return state;
}

function tickAvgState(state: JumpState, nowMs: number) {
  while (state.nextAt <= nowMs) {
    const step = weightedStepFromRand(randFloat(state), 1, 10);
    const dir = randInt(state, 0, 1) === 0 ? -1 : 1;
    state.value = Math.max(60, Math.min(1200, state.value + dir * step));
    state.nextAt += randInt(state, 1, 5) * 1000;
  }
}

export default function Page() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [matchesCount, setMatchesCount] = useState(0);
  const [playersTracked, setPlayersTracked] = useState(100);
  const [avgTimeSec, setAvgTimeSec] = useState(420);
  const stateRef = useRef<{ matches: JumpState; players: JumpState; avg: JumpState } | null>(null);

  // Hardcoded epoch: ~5 minutes before this edit to start above zero.
  // Update this value if you want a different starting offset.
  const epochMs = useMemo(() => 1770443240043, []);

  useEffect(() => {
    const now = Date.now();
    const matches = initJumpState(0, 0xA1B2C3D4, epochMs, now);
    const players = initJumpState(100, 0xBEEFBEEF, epochMs, now);
    const avg = initAvgState(420, 0xC0FFEE00, epochMs, now);
    stateRef.current = { matches, players, avg };
    setMatchesCount(matches.value);
    setPlayersTracked(players.value);
    setAvgTimeSec(avg.value);

    const interval = setInterval(() => {
      const current = Date.now();
      if (!stateRef.current) return;
      tickJumpState(stateRef.current.matches, current);
      tickJumpState(stateRef.current.players, current);
      tickAvgState(stateRef.current.avg, current);
      setMatchesCount(stateRef.current.matches.value);
      setPlayersTracked(stateRef.current.players.value);
      setAvgTimeSec(stateRef.current.avg.value);
    }, 250);

    return () => clearInterval(interval);
  }, [epochMs]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = q.trim();
    if (t) router.push(`/u/${encodeURIComponent(t)}`);
  }

  return (
    <main className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroLogo}>
          <Image src={logo} alt="MCSR Ranked" width={170} height={140} priority />
        </div>
        <h1 className={styles.title}>MCSR Ranked — Advanced Stats</h1>
        <p className={styles.subtitle}>Type a player name or UUID to explore in‑depth run analytics.</p>

        <form onSubmit={submit} className={styles.searchForm} role="search">
          <input
            aria-label="Search player"
            placeholder="Search for a player — e.g. Feinberg"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>Explore</button>
        </form>

        <div className={styles.previewRow} aria-hidden>
          <div className={styles.previewColumn}>
            <div className={styles.chartPlaceholder}>
              <div className={styles.chartBars}>
                {[40, 70, 55, 85, 60].map((h, i) => (
                  <div key={i} className={styles.bar} style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.previewColumn}>
            <StatCard label="Matches" value={matchesCount} />
            <StatCard label="Players Tracked" value={playersTracked} />
            <StatCard label="These are made up numbers" value={avgTimeSec} />
          </div>
        </div>
      </div>
    </main>
  );
}