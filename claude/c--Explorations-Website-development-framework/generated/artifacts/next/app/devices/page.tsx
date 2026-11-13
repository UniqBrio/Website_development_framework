/**
 * GENERATED — traceable to these decisions:
 *   route:      /devices
 *   purpose:    device catalogue
 *   objective:  sell_products
 *   audience:   FIXTURE-PATIENTS
 *   seoRole:    detail
 *   sections:   catalog, product_detail, price, returns, checkout, faq
 *   conversion: checkout
 *   trust:      product_screenshots
 * NOT rendered, deliberately:
 *   - primary_action: primary action withheld: no checkout endpoint is configured in the host; the framework does not invent a backend
 *   - returns: legal policy status is "verified_available" with no documents supplied; a summarised or invented policy would be a regulatory claim (§12)
 *   - checkout: no checkout endpoint is configured in the host; the framework does not invent a backend
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ProductGallery } from "../_components/ProductGallery";

export const metadata: Metadata = {
  title: "Devices — FIXTURE-VERDALEEN-MOBILITY",
  // description: UNRESOLVED — ai_draft. a meta description is public prose about the business; the framework specifies it rather than inventing it
  // alternates.canonical: UNRESOLVED — no canonicalOrigin supplied; a guessed domain would be a fabricated fact about the business, and a wrong canonical is worse than none
  robots: { index: true, follow: true },
  openGraph: {
    title: "Devices — FIXTURE-VERDALEEN-MOBILITY",
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
          <li><Link href="/devices" aria-current="page">{`Devices`}</Link></li>
          <li><Link href="/for-clinicians">{`For clinicians`}</Link></li>
          <li><Link href="/book">{`Book`}</Link></li>
        </ul>
          <button type="button" className="c-nav-close" popoverTarget="site-menu" popoverTargetAction="hide">Close menu</button></div>
        </nav>
      </header>
      <h1 id="hero-h1">{`Devices — FIXTURE-VERDALEEN-MOBILITY`}</h1>
      <h2>{`Catalogue`}</h2>
      <ProductGallery fallbackNote={`degrades to Static grid — a static grid of the same images, all visible`}>

      </ProductGallery>
      <h2>{`Product detail`}</h2>
      <div className="c-content-slot" data-content-slot={`product data`}><p>{`Product detail to be supplied.`}</p></div>
      <h2>{`Price`}</h2>
      <div className="c-content-slot" data-content-slot={`price content`}><p>{`Price to be supplied.`}</p></div>
      <h2>{`Frequently asked questions`}</h2>
      <div className="c-content-slot" data-content-slot={`faq — question and answer pairs`}><p>{`Frequently asked questions to be supplied by the owner.`}</p></div>
      <h2>{`Checkout`}</h2>
      <form className="c-form" data-contract="checkout" data-endpoint="unconfigured" aria-describedby="checkout-form-status checkout-form-endpoint">
        <p id="checkout-form-endpoint" className="c-unavailable-notice" role="note">{`Checkout is not connected yet, so orders cannot be placed on this site.`}</p>
        <fieldset disabled>
          <legend>{`Order request`}</legend>
          <p><label htmlFor="f-product">{`Product`}</label><select id="f-product" name="product" aria-describedby="f-product-error" defaultValue="" required><option value="">Choose</option><option>{`FIXTURE-CUSTOM-ORTHOTIC`}</option><option>{`FIXTURE-CUSTOM-WALKING-AID`}</option><option>{`FIXTURE-STOCK-SUPPORT-A`}</option><option>{`FIXTURE-STOCK-SUPPORT-B`}</option></select><span id="f-product-error" className="c-field-error" aria-live="polite" /></p>
          <p><label htmlFor="f-quantity">{`Quantity`}</label><input id="f-quantity" name="quantity" type="number" min={1} aria-describedby="f-quantity-error" required /><span id="f-quantity-error" className="c-field-error" aria-live="polite" /></p>
          <p><label htmlFor="f-name">{`Name`}</label><input id="f-name" name="name" type="text" autoComplete="name" aria-describedby="f-name-error" required /><span id="f-name-error" className="c-field-error" aria-live="polite" /></p>
          <p><label htmlFor="f-email">{`Email`}</label><input id="f-email" name="email" type="email" autoComplete="email" aria-describedby="f-email-error" required /><span id="f-email-error" className="c-field-error" aria-live="polite" /></p>
          <p><label htmlFor="f-delivery_address">{`Delivery address`}</label><textarea id="f-delivery_address" name="delivery_address" autoComplete="street-address" aria-describedby="f-delivery_address-error" required /><span id="f-delivery_address-error" className="c-field-error" aria-live="polite" /></p>
          <p><button type="submit">{`Submit order request`}</button></p>
        </fieldset>
        <p id="checkout-form-status" className="c-form-status" role="status" aria-live="polite" />
      </form>
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
