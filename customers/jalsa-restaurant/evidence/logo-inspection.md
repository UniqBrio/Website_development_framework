# Logo inspection — `raw/jalsa-restaurant-logo.png`

## Technical
| Property | Value | Consequence |
|---|---|---|
| Format | PNG, 8-bit RGB (colour type 2) | **no alpha channel**: the maroon square is part of the image; it cannot sit on another background without the square |
| Dimensions | 150 × 150 px | too small for a sharp header mark on high-density screens, an Open Graph image (typically 1200×630) or print; the small arc text is barely legible at native size |
| Chunks | IHDR, **caBX** (5,758 bytes), IDAT ×8, IEND | no tEXt/iTXt/pHYs metadata |

## What the image shows (read from an enlarged view)
- Script wordmark **"Jalsa"**.
- **"RESTAURANT"** in small capitals beneath the wordmark.
- **"CELEBRATE EVERY BITE"** in small capitals following the lower arc.
- A circular ring (plate-like) with two short wisps above it (steam-like).
- Cream lettering and ring on a maroon field.

These are descriptions of the artwork, not claims about the restaurant.

## Measured colours (MEASURED, not a brand decision)
| Role in image | Value | Method |
|---|---|---|
| Background field | `#7c1518` (most frequent exact pixel, 8,333 of 22,500) | exact pixel counts |
| Background, quantised | `#701010` band ≈ 67% of pixels | 16-level quantisation |
| Lettering / ring | near `#f0f0e8` (`#f0f0f0` band ≈ 7%, `#f0f0e0` ≈ 1.6%) | 16-level quantisation |

The framework's `constraints.brandSeed` is owner-chosen and never defaulted to a brand-looking
value (`business-input.ts`). These measurements are therefore NOT the brand seed; they are the
evidence a customer decision could approve (approval register A-05).

## Content credentials (C2PA) — the provenance finding
The `caBX` chunk carries a C2PA manifest (JUMBF). Readable fields:

| Field | Value |
|---|---|
| Manifest | `urn:c2pa:6399cbe5-dcc3-4e71-9c23-3a5e5585d994` |
| Ingredient | one parent (`c2pa.ingredient.v3`, relationship `parentOf`, format image/png) |
| Actions | `c2pa.opened`; **`com.anthropic.claude.provided`** |
| Action description | **"Claude provided this file at the request of a user and may have created or modified the file contents."** |
| `com.anthropic.origin-confidence` | **`unknown`** |
| Claim generator | "Anthropic Files" 1.0.0 (C2PA spec 2.4.0) |
| Signer | "Anthropic Claude Content Signing", issued by "Anthropic Content Credentials Root CA" (certificate validity 2026-08-07 → 2028-08-06) |

**What this establishes:** the file passed through an Anthropic Claude file service, which
states it *may* have created or modified the contents and does not know the origin.

**What it does not establish:** whether the artwork is the restaurant's own logo, whether it was
AI-generated, or whether the parent ingredient was the restaurant's original file.

**Not done:** the signature was parsed, not cryptographically validated (no C2PA validator is in
the toolchain). EVIDENCE_GAP.

## Classification
- Logo artwork: `provided_unverified` → the framework's asset gate refuses the file; the site shows
  a text wordmark (DD-096 path). This is policy working, not a defect.
- Required from the customer (CUSTOMER_APPROVAL_REQUIRED + CUSTOMER_INPUT_MISSING): confirmation
  that this is the official logo and not AI-created or AI-altered; the original artwork at usable
  resolution with transparency; permission to use it on the website.
