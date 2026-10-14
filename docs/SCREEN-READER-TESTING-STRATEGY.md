# SCREEN-READER TESTING STRATEGY

Written 2026-09-14, closing Engagement Delivery gap G5. It covers delivered engagement experiences (calculator, assessment, guided selector, comparison), compact navigation, and conversion surfaces (forms and contact links).

## 1. What is automated, and what that proves

Automated checks establish what an assistive technology is **given**. They cannot establish how it is **announced**. The framework separates the two and never reports the second as passed on the strength of the first.

| Layer | Tool | What it checks | Where |
|---|---|---|---|
| Accessibility tree | Chromium CDP `Accessibility.getFullAXTree`, per delivered experience | every control (radio, spinbutton, textbox, button) has a computed name; every group (fieldset → `group`/`radiogroup`) has a name from its legend; the result region exposes role `status`; the error summary exposes `alert` | `host/validate.mjs` `axTreeFacts` → raw `axTree` → `mapExperienceChecks` (`accessibleNames`) → WCAG `forms` criterion |
| Rules engine | axe-core (WCAG 2.x A/AA tags) | name/role/value, labels, landmark and heading structure, contrast | Next.js layer (existing audit) and static layer (`staticLayerAudit`) |
| Keyboard | Playwright, Chromium **and** WebKit | every rule path, the no-match path, every owner example, the error path, reset, compact navigation open/Tab/Escape/Close | `experienceChecks`, `navigationChecks` |
| Live-region contract | DOM | the result is in `role="status" aria-live="polite"`; focus moves to the result heading; the error summary is `role="alert"` and focus moves to the first invalid field | `experienceChecks` |

A failure in any of these routes into the existing gates (`forms`, `input_independence`, `technical`). There is no second accessibility system.

## 2. What is not automated, and why

- **Announcement wording, order and verbosity.** For example, whether NVDA reads "Estimated value, 10,400 dollars" once or twice after a `status` update, or whether VoiceOver on iOS announces a `popover` opening. These depend on the screen reader, the browser and their versions, and no automated harness reproduces a real one faithfully.
- **Reading order in practice.** The tree order is checked; how a person navigates by headings, landmarks and form controls is not.
- **Mobile gestures.** VoiceOver and TalkBack swipe navigation, the rotor and the actions menu.

These criteria are recorded as `human_assessment_required`. A site's accessibility claim excludes them until a person has run the protocol below and the result is entered in the run's test register.

## 3. Manual protocol

**When:** before the first real customer launch. After that, whenever an experience type, the navigation pattern or a conversion surface changes.

**Matrix (minimum):**

| Screen reader | Browser | Platform |
|---|---|---|
| NVDA (current) | Firefox and Chrome | Windows |
| JAWS (current), if the audience is enterprise or public-sector | Chrome | Windows |
| VoiceOver | Safari | macOS |
| VoiceOver | Safari | iOS (a real device) |
| TalkBack | Chrome | Android (a real device) |

**Script, per delivered experience:**
1. Reach the experience by headings (`H`) and by landmarks. It must be announced with its heading.
2. Move into the form. Each group must be announced with its legend, and each control with its label, unit and help text.
3. Submit empty. The error summary must be announced, focus must land on the first invalid field, and that field's error must be read with it.
4. Complete a rule path or example. The result must be announced once, with its title and explanation. The recommended offer link must be reachable and named.
5. Reset or restart. Focus must return to the first control, and nothing stale may be announced.
6. Turn JavaScript off (desktop only). The static explanation must be reachable and read in order, and the disabled controls must be announced as unavailable, together with the notice.

**Script, compact navigation (phone width or zoom):**
1. The "Menu" button is announced as a button, with its expanded or collapsed state where the platform exposes one.
2. Opening it moves reading into the menu, and every route is announced with its label and the current page.
3. "Close menu" is announced and closes the menu; focus returns to "Menu".

**Script, conversion surfaces:**
1. Contact links are announced with their action and value, for example "Email us, hello@…, link".
2. A disabled, unconfigured form announces its notice before its controls.

**Recording:** one register case per matrix row × surface, with result PASS, FAIL or BLOCKED and the version strings. A FAIL is a defect at the source (markup, runtime or CSS), with root-cause analysis as in `website_workflow/qa_workflow.md`. It is never an exception.

## 4. Status on 2026-09-14

- **Automated layers:** implemented. Results are in `docs/CUSTOMER-READINESS-REPORT.md`.
- **Manual protocol:** **not yet run** on any screen reader. Every announcement criterion stays `human_assessment_required` and no screen-reader pass is claimed.
