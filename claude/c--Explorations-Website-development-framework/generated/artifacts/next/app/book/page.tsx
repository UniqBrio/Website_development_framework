/**
 * GENERATED — traceable to these decisions:
 *   route:      /book
 *   purpose:    assessment booking
 *   objective:  book_appointments
 *   audience:   FIXTURE-PATIENTS
 *   seoRole:    conversion
 *   sections:   proposition, booking, location_and_contact, process, faq
 *   conversion: booking_flow
 *   trust:      addresses
 * NOT rendered, deliberately:
 *   - primary_action: primary action withheld: book_appointments (needs verified: addresses; DD-101)
 *   - location_and_contact: no contact method is both verified and supplied; withheld: email (provided_unverified, no value), phone (provided_unverified, no value), whatsapp (provided_unverified, no value), address (provided_unverified, no value) — an unverified contact fact may not be published (§J.2), and the location fields may not stand in for it
 *   - booking: conversion surface withheld: book_appointments (needs verified: addresses; DD-101)
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Book — FIXTURE-VERDALEEN-MOBILITY",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "Book — FIXTURE-VERDALEEN-MOBILITY",
    type: "website",
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
          <li><Link href="/for-clinicians">{`For clinicians`}</Link></li>
          <li><Link href="/book" aria-current="page">{`Book`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <section className="c-hero c-hero--split" aria-labelledby="hero-h1">
        <h1 id="hero-h1">{`A clinic that assesses patients and manufactures custom-fitted orthotics and mobility aids, and also sells a small range of off-the-shelf supports directly to patients and to referring clinicians.`}</h1>
        <p className="c-prose">{`For FIXTURE-PATIENTS`}</p>
        <div className="c-content-slot" data-content-slot={`a verified conversion endpoint`}><p>{`Next step available once the conversion route is verified.`}</p></div>
      </section>
      <h2>{`Location and contact`}</h2>
      <div className="c-unavailable-notice" role="note" data-content-unavailable={`contactDetails — a VERIFIED address, phone or email, with its value`}><p>{`Contact route unavailable until details are verified.`}</p></div>
      <h2>{`How it works`}</h2>
      <div className="c-content-slot" data-content-slot={`processExplanation — the ordered steps a customer goes through`}><p>{`Process steps to be supplied by the owner.`}</p></div>
      <h2>{`Frequently asked questions`}</h2>
      <div className="c-content-slot" data-content-slot={`faq — question and answer pairs`}><p>{`Frequently asked questions to be supplied by the owner.`}</p></div>
      <h2>{`Book`}</h2>
      <div className="c-unavailable-notice" role="note" data-content-unavailable={`verified evidence for book_appointments (needs verified: addresses; DD-101)`}><p>{`This route is not yet available.`}</p></div>
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
