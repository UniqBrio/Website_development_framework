/**
 * GENERATED — traceable to these decisions:
 *   route:      /conditions
 *   purpose:    condition-led education pages
 *   objective:  educate
 *   audience:   FIXTURE-PATIENTS
 *   seoRole:    topic_hub
 *   sections:   topic_hub, explanation, faq
 *   conversion: related_conversion_link
 * NOT rendered, deliberately:
 *   - primary_action: no conversion surface exists for this objective on any page
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions — FIXTURE-VERDALEEN-MOBILITY",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "Conditions — FIXTURE-VERDALEEN-MOBILITY",
    type: "article",
  },
  twitter: { card: "summary_large_image" },
};

export default function Page() {
  return (
    <>
      <header className="c-site-header">
        <Link className="c-brand" href="/">{`FIXTURE-VERDALEEN-MOBILITY`}</Link>
        <nav className="c-nav" aria-label="Primary" data-nav-compact="popover_disclosure">
          <button type="button" className="c-nav-toggle" popoverTarget="site-menu">Site menu</button>
          <div id="site-menu" className="c-nav-menu" popover="auto"><ul>
          <li><Link href="/">{`Home`}</Link></li>
          <li><Link href="/conditions" aria-current="page">{`Conditions`}</Link></li>
          <li><Link href="/devices">{`Devices`}</Link></li>
          <li><Link href="/for-clinicians">{`For clinicians`}</Link></li>
          <li><Link href="/book">{`Book`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <h1 id="hero-h1">{`Conditions — FIXTURE-VERDALEEN-MOBILITY`}</h1>
      <h2>{`Topics`}</h2>
      <p className="c-prose">{`condition-led education pages`}</p>
      <h2>{`Explanation`}</h2>
      <p className="c-prose">{`condition-led education pages`}</p>
      <h2>{`Frequently asked questions`}</h2>
      <div className="c-content-slot" data-content-slot={`faq — question and answer pairs`}><p>{`Frequently asked questions to be supplied by the owner.`}</p></div>
      <footer className="c-site-footer">
        <nav aria-label="Footer"><ul>
          <li><Link href="/">{`Home`}</Link></li>
          <li><Link href="/conditions">{`Conditions`}</Link></li>
          <li><Link href="/devices">{`Devices`}</Link></li>
          <li><Link href="/for-clinicians">{`For clinicians`}</Link></li>
          <li><Link href="/book">{`Book`}</Link></li>
        </ul></nav>
      </footer>
    </>
  );
}
