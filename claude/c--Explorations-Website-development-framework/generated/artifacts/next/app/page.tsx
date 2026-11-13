/**
 * GENERATED — traceable to these decisions:
 *   route:      /
 *   purpose:    explain the service and route to an assessment
 *   objective:  book_appointments
 *   audience:   FIXTURE-PATIENTS
 *   seoRole:    primary_entry
 *   sections:   proposition, services, process, faq
 *   conversion: booking_flow
 *   trust:      addresses
 * NOT rendered, deliberately:
 *   - primary_action: primary action withheld: book_appointments (needs verified: addresses; DD-101)
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FIXTURE-VERDALEEN-MOBILITY",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "FIXTURE-VERDALEEN-MOBILITY",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const jsonLd = [{"@context":"https://schema.org","@type":"Organization","name":"FIXTURE-VERDALEEN-MOBILITY"},{"@context":"https://schema.org","@type":"Service","name":"FIXTURE-ASSESSMENT","provider":{"@type":"Organization","name":"FIXTURE-VERDALEEN-MOBILITY"}},{"@context":"https://schema.org","@type":"Service","name":"FIXTURE-CLINICIAN-REFERRAL-PATHWAY","provider":{"@type":"Organization","name":"FIXTURE-VERDALEEN-MOBILITY"}}];

export default function Page() {
  return (
    <>
      {jsonLd.map((entity, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entity).replace(/</g, "\\u003c") }} />
      ))}
      <header className="c-site-header">
        <Link className="c-brand" href="/">{`FIXTURE-VERDALEEN-MOBILITY`}</Link>
        <nav className="c-nav" aria-label="Primary" data-nav-compact="popover_disclosure">
          <button type="button" className="c-nav-toggle" popoverTarget="site-menu">Site menu</button>
          <div id="site-menu" className="c-nav-menu" popover="auto"><ul>
          <li><Link href="/" aria-current="page">{`Home`}</Link></li>
          <li><Link href="/conditions">{`Conditions`}</Link></li>
          <li><Link href="/devices">{`Devices`}</Link></li>
          <li><Link href="/for-clinicians">{`For clinicians`}</Link></li>
          <li><Link href="/book">{`Book`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <section className="c-hero c-hero--split" aria-labelledby="hero-h1">
        <h1 id="hero-h1">{`A clinic that assesses patients and manufactures custom-fitted orthotics and mobility aids, and also sells a small range of off-the-shelf supports directly to patients and to referring clinicians.`}</h1>
        <p className="c-prose">{`For FIXTURE-PATIENTS`}</p>
        <div className="c-content-slot" data-content-slot={`a verified conversion endpoint`}><p>{`Next step available once the conversion route is verified.`}</p></div>
      </section>
      <h2>{`Services`}</h2>
      <ul className="c-card-grid">
        <li key={0}><h3>{`FIXTURE-ASSESSMENT`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-ASSESSMENT"`}>{`description to be supplied`}</p></li>
        <li key={1}><h3>{`FIXTURE-CUSTOM-ORTHOTIC`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-CUSTOM-ORTHOTIC"`}>{`description to be supplied`}</p></li>
        <li key={2}><h3>{`FIXTURE-CUSTOM-WALKING-AID`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-CUSTOM-WALKING-AID"`}>{`description to be supplied`}</p></li>
        <li key={3}><h3>{`FIXTURE-STOCK-SUPPORT-A`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-STOCK-SUPPORT-A"`}>{`description to be supplied`}</p></li>
        <li key={4}><h3>{`FIXTURE-STOCK-SUPPORT-B`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-STOCK-SUPPORT-B"`}>{`description to be supplied`}</p></li>
        <li key={5}><h3>{`FIXTURE-CLINICIAN-REFERRAL-PATHWAY`}</h3><p className="c-pending" data-content-pending={`description of "FIXTURE-CLINICIAN-REFERRAL-PATHWAY"`}>{`description to be supplied`}</p></li>
      </ul>
      <h2>{`How it works`}</h2>
      <div className="c-content-slot" data-content-slot={`processExplanation — the ordered steps a customer goes through`}><p>{`Process steps to be supplied by the owner.`}</p></div>
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
