/**
 * GENERATED — traceable to these decisions:
 *   route:      /
 *   purpose:    derived home page: no owner-supplied pages; serves the site-primary objective "drive_footfall"
 *   objective:  drive_footfall
 *   audience:   visitors (audience not yet stated by the restaurant)
 *   seoRole:    primary_entry
 *   sections:   proposition, location_and_contact, hours, services
 *   conversion: directions_and_call
 *   trust:      addresses
 * NOT rendered, deliberately:
 *   - primary_action: primary action withheld: drive_footfall (needs verified: addresses; DD-101)
 *   - location_and_contact: no contact method is both verified and supplied; withheld: email (unavailable, no value), phone (unavailable, no value), whatsapp (unavailable, no value), address (unavailable, no value) — an unverified contact fact may not be published (§J.2), and the location fields may not stand in for it
 *   - services: no offer name may be published: source "menu-docx" is not authorised for publication: "For design illustrations only" — a source restriction overrides verification
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Jalsa Restaurant",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "Jalsa Restaurant",
    type: "website",
  },
  twitter: { card: "summary" },
};

const jsonLd = [{"@context":"https://schema.org","@type":"Organization","name":"Jalsa Restaurant"}];

export default function Page() {
  return (
    <>
      {jsonLd.map((entity, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entity).replace(/</g, "\\u003c") }} />
      ))}
      <header className="c-site-header">
        <Link className="c-brand" href="/">{`Jalsa Restaurant`}</Link>
        <nav className="c-nav" aria-label="Primary" data-nav-compact="popover_disclosure">
          <button type="button" className="c-nav-toggle" popoverTarget="site-menu">Site menu</button>
          <div id="site-menu" className="c-nav-menu" popover="auto"><ul>
          <li><Link href="/" aria-current="page">{`Home`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <section className="c-hero c-hero--vertical" aria-labelledby="hero-h1">
        <h1 id="hero-h1">{`Jalsa Restaurant`}</h1>
        <div className="c-content-slot" data-content-slot={`propositionText — the one sentence a visitor reads first`}><p>{`A short statement of what this business does, to be supplied by the owner.`}</p></div>
        <div className="c-content-slot" data-content-slot={`targetAudience — who this page is for (an inferred audience is not published: visitors (audience not yet stated by the restaurant))`}><p>{`Audience to be stated by the owner.`}</p></div>
        <div className="c-content-slot" data-content-slot={`a verified conversion endpoint`}><p>{`Next step available once the conversion route is verified.`}</p></div>
      </section>
      <h2>{`Location and contact`}</h2>
      <div className="c-unavailable-notice" role="note" data-content-unavailable={`contactDetails — a VERIFIED address, phone or email, with its value`}><p>{`Contact route unavailable until details are verified.`}</p></div>
      <h2>{`Opening hours`}</h2>
      <div className="c-content-slot" data-content-slot={`opening hours, with a verified status (contactDetails.hours + availableContent.openingHours)`}><p>{`Opening hours to be supplied.`}</p></div>
      <footer className="c-site-footer">
        <nav aria-label="Footer"><ul>
          <li><Link href="/">{`Home`}</Link></li>
        </ul></nav>
      </footer>
    </>
  );
}
