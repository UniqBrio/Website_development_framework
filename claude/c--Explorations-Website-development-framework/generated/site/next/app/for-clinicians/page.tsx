/**
 * GENERATED — traceable to these decisions:
 *   route:      /for-clinicians
 *   purpose:    referral pathway for professionals
 *   objective:  build_credibility
 *   audience:   FIXTURE-REFERRING-CLINICIANS
 *   seoRole:    detail
 *   sections:   proposition, qualifications, process
 *   conversion: contact_route
 * NOT rendered, deliberately:
 *   - primary_action: no conversion surface exists for this objective on any page
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For clinicians — FIXTURE-VERDALEEN-MOBILITY",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "For clinicians — FIXTURE-VERDALEEN-MOBILITY",
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
          <li><Link href="/conditions">{`Conditions`}</Link></li>
          <li><Link href="/devices">{`Devices`}</Link></li>
          <li><Link href="/for-clinicians" aria-current="page">{`For clinicians`}</Link></li>
          <li><Link href="/book">{`Book`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <section className="c-hero c-hero--split" aria-labelledby="hero-h1">
        <h1 id="hero-h1">{`A clinic that assesses patients and manufactures custom-fitted orthotics and mobility aids, and also sells a small range of off-the-shelf supports directly to patients and to referring clinicians.`}</h1>
        <p className="c-prose">{`For FIXTURE-REFERRING-CLINICIANS`}</p>
        <div className="c-content-slot" data-content-slot={`a verified conversion endpoint`}><p>{`Next step available once the conversion route is verified.`}</p></div>
      </section>
      <h2>{`Qualifications`}</h2>
      <div className="c-content-slot" data-content-slot={`qualifications content`}><p>{`Qualifications to be supplied.`}</p></div>
      <h2>{`How it works`}</h2>
      <div className="c-content-slot" data-content-slot={`processExplanation — the ordered steps a customer goes through`}><p>{`Process steps to be supplied by the owner.`}</p></div>
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
