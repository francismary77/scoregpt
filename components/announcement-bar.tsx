"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Announcement } from "@/config/marketing";

export function AnnouncementBar({ announcements }: { announcements: readonly Announcement[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || announcements.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % announcements.length), 6000);
    return () => window.clearInterval(timer);
  }, [announcements.length, paused]);

  if (!announcements.length) return null;
  const item = announcements[active];
  const move = (direction: number) => setActive((current) => (current + direction + announcements.length) % announcements.length);

  return (
    <section className="container announcement-bar" aria-label="Announcements" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="announcement-copy" aria-live="polite" aria-atomic="true" key={item.id}>
        <span className="announcement-icon" aria-hidden="true">{item.icon}</span>
        <p>{item.message}</p>
        <Link href={item.href}>{item.cta}</Link>
      </div>
      <div className="announcement-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous announcement">‹</button>
        <span aria-hidden="true">{active + 1}/{announcements.length}</span>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Resume announcements" : "Pause announcements"}>{paused ? "▶" : "Ⅱ"}</button>
        <button type="button" onClick={() => move(1)} aria-label="Next announcement">›</button>
      </div>
    </section>
  );
}
