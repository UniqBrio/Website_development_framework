/**
 * SEO rules — §4.12 (DD-092, DD-093, DD-095).
 *
 * The SEO artifact model (`seo/artifacts.ts`) exists now, so these rules produce
 * artifact REQUIREMENTS that it reads, and DD-093 changes the PAGE MODEL. The
 * chain the brief demands — rule → decision → artifact → generated page → served
 * HTML → SEO evaluation — is asserted by the integration test.
 *
 * DD-093's `fallback` ("smaller set of deeper verified pages") is the enforcing
 * half: a service page is derived ONLY for an offer that carries supplied
 * description text, because a page with a name and no content is the thin
 * near-duplicate the rule's own `avoid` clause forbids.
 */
import { parseRule, type Rule } from "../types/decision.js";

const NEXT_META = "https://nextjs.org/docs/app/getting-started/metadata-and-og-images";
const IMAGES = "https://www.w3.org/WAI/tutorials/images/";

export const SEO_RULES: readonly Rule[] = [
  parseRule({
    id: "DD-092",
    title: "Metadata",
    domain: "seo",
    classification: "gate",
    consumer: "seo/artifacts.ts",
    sourceSection: "§4.12",
    then: [
      { kind: "set", target: "seo.metadataPolicy", value: "page_specific_title_description_canonical_og" },
      { kind: "require", target: "seo", value: "every indexable page carries a page-specific title, description, canonical when needed, and Open Graph metadata" },
      { kind: "forbid", target: "seo", value: "duplicate_generic_metadata" },
    ],
    avoid: ["duplicate_generic_metadata"],
    fallback: ["derived metadata from verified page content"],
    rationale: "Accurate metadata supports search and shareability.",
    source_urls: [NEXT_META],
    confidence: "high",
  }),
  parseRule({
    id: "DD-093",
    title: "Content hubs",
    domain: "seo",
    classification: "executable",
    consumer: "generation/page-spec.ts",
    sourceSection: "§4.12",
    if: [
      { fact: "variables.seo_dependency", op: "eq", value: "high" },
      { fact: "hasMultipleServicesOrTopics", op: "eq", value: true },
    ],
    then: [
      { kind: "set", target: "seo.contentHubs", value: "service_pages_for_offers_with_supplied_content" },
      { kind: "append", target: "sectionArchitecture", value: ["faq", "internal_links"] },
      { kind: "require", target: "seo", value: "each derived page targets a distinct search intent; no thin near-duplicate pages" },
    ],
    otherwise: [{ kind: "set", target: "seo.contentHubs", value: "single_hub" }],
    prefer: ["distinct search intent per page"],
    avoid: ["thin_near_duplicate_pages"],
    fallback: ["smaller set of deeper verified pages"],
    rationale: "Search strategy requires useful, differentiated page intent.",
    source_urls: [NEXT_META],
    confidence: "high",
  }),
  parseRule({
    id: "DD-095",
    title: "Image SEO",
    domain: "seo",
    classification: "gate",
    consumer: "generation/render/html.ts",
    sourceSection: "§4.12",
    then: [
      { kind: "require", target: "images", value: "descriptive alt or caption for every meaningful image; optimised file name, dimensions and format" },
      { kind: "forbid", target: "images", value: "text_embedded_solely_in_image" },
    ],
    avoid: ["text_embedded_solely_in_image"],
    fallback: ["adjacent HTML text"],
    rationale: "Images should have accessible and contextual semantics.",
    source_urls: [IMAGES],
    confidence: "high",
  }),
];
