/**
 * ATTRIBUTE VOCABULARIES BY INDUSTRY (C4, FD-04).
 *
 * A catalogue item's typed attributes are industry-specific; the catalogue model is
 * not. A restaurant's dietary mark, a clinic's device fitting, a shop's size — each is
 * declared here as DATA, so the generic catalogue never grows an industry branch.
 *
 * Two properties decide what may be published:
 *   `regulated`  the attribute is (or may be) a legal display obligation. It publishes
 *                only from a verified customer value: never inferred from a name, never
 *                AI-drafted, never defaulted. A veg/non-veg mark is the case the first
 *                real customer raised — secondary summaries of India's FSSAI rules
 *                describe per-dish marks for some businesses, and the framework cannot
 *                know which rules apply to a given restaurant.
 *   `values`     a closed value set when one exists, so a mark cannot be invented.
 *
 * An attribute key outside its industry's vocabulary is REFUSED rather than rendered:
 * an unknown key is an unreviewed claim.
 */
import type { Industry } from "../design-intelligence/types/business-input.js";

export interface AttributeDefinition {
  key: string;
  label: string;
  /** A legal display obligation, or potentially one: verified values only. */
  regulated: boolean;
  /** Closed value set, when the attribute has one. */
  values?: readonly string[];
  /** Why the attribute exists, and what it must never be derived from. */
  note: string;
}

const FOOD_SERVICE: AttributeDefinition[] = [
  {
    key: "dietary_classification",
    label: "Dietary classification",
    regulated: true,
    values: ["vegetarian", "non_vegetarian", "contains_egg", "vegan"],
    note: "A dietary mark is a regulated display claim in some jurisdictions and a safety claim everywhere. It is never inferred from a dish name.",
  },
  { key: "allergens", label: "Allergens", regulated: true, note: "Allergen information is a safety claim; only the customer's verified list may be published." },
  { key: "spice_level", label: "Spice level", regulated: false, note: "A comfort indication supplied by the customer." },
  { key: "portion", label: "Portion", regulated: false, note: "What one serving is, in the customer's words." },
];

const RETAIL: AttributeDefinition[] = [
  { key: "size", label: "Size", regulated: false, note: "Supplied by the customer." },
  { key: "material", label: "Material", regulated: false, note: "Supplied by the customer." },
  { key: "warranty", label: "Warranty", regulated: true, note: "A warranty is a contractual claim; verified values only." },
];

const HEALTHCARE: AttributeDefinition[] = [
  { key: "fitting_required", label: "Fitting required", regulated: false, note: "Supplied by the customer." },
  { key: "regulatory_class", label: "Regulatory class", regulated: true, note: "A device classification is a regulatory claim; verified values only." },
];

/** Industries with a declared vocabulary. Anything else has none, so any key is refused. */
const BY_INDUSTRY: Partial<Record<Industry, AttributeDefinition[]>> = {
  food_service: FOOD_SERVICE,
  hospitality: FOOD_SERVICE,
  local_business: FOOD_SERVICE,
  ecommerce: RETAIL,
  retail: RETAIL,
  healthcare: HEALTHCARE,
};

export function attributeVocabulary(industry: Industry): readonly AttributeDefinition[] {
  return BY_INDUSTRY[industry] ?? [];
}

export function attributeDefinition(industry: Industry, key: string): AttributeDefinition | undefined {
  return attributeVocabulary(industry).find((a) => a.key === key);
}
