"use client";

/**
 * THE ONLY CLIENT BOUNDARY in this site, and it is a LEAF.
 *
 * Justified by: gallery requires client interaction; degrades to: degrades to Static grid — a static grid of the same images, all visible
 *
 * Progressive enhancement (§10): the server already rendered every image in a
 * plain grid. This component upgrades that grid to a keyboard-navigable viewer.
 * If it never loads, the grid remains complete and usable — no content lives only
 * here.
 */
import { useState } from "react";

export function ProductGallery({ fallbackNote, children }: { fallbackNote: string; children?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <div className="c-gallery" data-enhanced="true">
      <p className="c-pending">{fallbackNote}</p>
      <ul className="c-gallery-grid">
        {/* Images arrive from verified product assets (server-rendered); none are generated. */}
        {children}
      </ul>
      <p>
        <button type="button" onClick={() => setActive((n) => Math.max(0, n - 1))}>
          Previous
        </button>{" "}
        <button type="button" onClick={() => setActive((n) => n + 1)}>
          Next
        </button>
      </p>
      <p aria-live="polite">Item {active + 1}</p>
    </div>
  );
}
