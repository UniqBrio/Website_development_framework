# DECISIONS LOG — Ashvattha Tax & Compliance

## 2026-09-14 — WEB-NEW-20260914-practice-website — CUSTOMER DRY RUN (NOT SHIPPED)
- **Request:** requests/WEB-NEW-20260914-practice-website.md
- **Shipped:** nothing. Phases 6–7 were not reached: Gate 5 FAILED, and gates 0/S/1/2/5 are owner gates still PENDING. This entry closes the dry run, not a release.
- **Interrogation verdicts that mattered:**
  - Q2 FAIL (page purpose does not reach sections);
  - Q5 FAIL (no completable conversion, measured);
  - Q7 FAIL (mobile navigation dominates);
  - Q9 FAIL for launch (no legal policies);
  - Q10 FAIL (slots, "Faq");
  - Q-STACK-DISCIPLINE FAIL (react-hook-form unused);
  - Q-MOTION FAIL (selected, unrendered patterns).
- **Matrix winners AND losers** (PROFILE A, /500):
  - S1 positioning: **B 415** · D 365 · C 320 · A 255
  - S4 hero media: **B typography-led 420** · C 295 · D 230 · A 220
  - S5 conversion: D WhatsApp 405 (**BLOCKED** — number missing) · **B form 370** · C email link 360 · A 315. Buildable fallback: C, but the generator cannot render it as the primary action.
  - Phase 1 hero: **B IDEA-006 415** · A 360 · D 360 · C 355
  - Phase 1 services: **A engine grid 430** · B 415 (within 5%, cheaper wins) · D 345 · C 250
  - Phase 1 trust: **A qualifications slot 395** · B 355
- **Evidence:** runs/…/06-phase5-qa-evidence.md; qa/test_register.md; ../evidence/customer-dry-run-digest.json
- **Follow-ups (owner):**
  - the production origin;
  - an email service (or approval for a mailto-only contact);
  - the WhatsApp number;
  - the full address;
  - the logo file;
  - brand colour and theme mode;
  - proposition, about, process and FAQ copy;
  - 2 service descriptions;
  - privacy policy and terms;
  - ICAI particulars;
  - the price decision;
  - approval of 8 meta description briefs.

  The DD-001/DD-013 layout conflict is NOT an owner item: it was a framework authority defect, fixed at the authority.
- **Follow-ups (framework):** docs/CUSTOMER-DRY-RUN-REPORT.md §15.
