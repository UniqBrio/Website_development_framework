# WEBSITE REQUEST — NEW (section / page / element that doesn't exist yet)
<!-- Filled by the /wrequest procedure from customers/ashvattha-tax/brief/customer-brief.md.
     Run with: /website customers/ashvattha-tax/website_workflow/requests/WEB-NEW-20260914-practice-website.md -->

REQUEST ID: WEB-NEW-20260914-practice-website
DATE: 2026-09-14
REQUESTED BY: Managing Partner, Ashvattha Tax & Compliance (by email)

> **Intake note.** /wrequest step 1 says a LIST of several things is split into
> separate requests, one file each. This brief is a whole new website, and the
> templates have no whole-site request type. It is filed as ONE request so the
> pipeline can decide the site's architecture once; the split rule is recorded as a
> framework gap, not silently ignored.

## WHAT (one sentence)
A first website for a small tax and accounting practice in Pune that ranks for its
services locally and turns visitors into enquiries.

## WHERE
Page(s): Home, Services (overview), one page per service, About us, FAQ, Contact.
New route needed?: yes → all routes are new (no site exists; Google Business listing and Facebook page only)

## WHY / VISITOR JOB
A small business owner, founder, freelancer or salaried person searches for GST or
income tax help in Pune, usually on a phone. They need to see quickly that this
practice does the specific thing they need, that it is a real and qualified local
practice, and how to ask a question. Expected action: contact the practice.

## MUST-HAVE
- Home, Services, one page per service, About us, FAQ, Contact (owner's page list)
- Get more enquiries — calls, WhatsApp or email
- Rank on Google for the services in Pune
- Look trustworthy and professional, modern but not flashy, approachable
- An FAQ
- A simple contact form that emails the practice
- A WhatsApp button
- A map to the office
- owner to trim at Gate 1

## EXPLICITLY OUT
- Blog ("maybe later, not now")
- Additional languages ("maybe Marathi later")

## CONTENT INPUTS
Copy source: owner-provided for 3 of 5 service descriptions (in the brief); every other
page's copy to be drafted at Phase 2 and approved by the owner.
Images:
- Logo — owner says it exists ("dark blue text with a small leaf") — **unknown: file not received**
- Office photos — owner says they exist, "not great quality" — **unknown: files not received**
- No other visual named in the brief.
Data/claims source of truth: customers/ashvattha-tax/website_workflow/app_reality.md.
Owner-stated but unevidenced: founding year 2014, "60+ regular clients", "4.9 on
Google from about 80 reviews", ICAI membership, prices "₹999" and "₹1,500 a month".

## SUPABASE
Reads/writes data?: **unknown** → the contact form must send email somewhere; no backend,
database or email service is named.
(wrequest rule: any form → yes or unknown, never silently "no". Phase 3 therefore
becomes mandatory by rule — see Phase 0 for why it has nothing to review.)

## ARCHITECTURE
New dependency, rendering strategy, or default-deny category?: **yes**
→ (1) "a simple contact form that emails us" = a backend or third-party email service
beyond {STACK}; (2) "a map to the office" = a third-party embed; (3) "a WhatsApp button"
= an outbound link, no dependency. Both (1) and (2) stay DENIED until the owner approves
them through the DEPENDENCY GATE and a PROFILE B matrix against "do not add it".

## CONSTRAINTS
- Deadline: "before the tax filing rush in July" — no date.
- Brand: logo "dark blue text with a small leaf"; no colours or fonts supplied.
- Reference: owner likes ClearTax's website ("feels modern and easy").

## STANDING INSTRUCTIONS (verbatim — do not edit)
Run website_workflow/website_flow.md on this file, all phases, all gates.
Question everything before creating: full interrogation (Q1–Q10) before any
code. No evidence, no pass at Gate 5. Unknown fields stay unknown until the
owner answers — never invent. Stay inside the blast radius named above.
