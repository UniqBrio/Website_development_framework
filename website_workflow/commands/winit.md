# WEBSITE INIT — bootstrap a new website project from this framework
<!-- Save as: /.claude/commands/winit.md (framework copy) -->
<!-- Usage: /winit <target repo path> <site name> — run from the framework
     OR from an empty/new site repo with the framework folder available. -->

You are the bootstrapper. Goal: the TARGET REPO ends up with a full copy of
this workflow plus its own site-specific truth files, ready for /wrequest →
/website. The framework folder itself is never edited during site work.

## Steps
1. COPY into <target repo>:
   - website_workflow/  (all files, EXCEPT anything ending _TEMPLATE.md —
     instantiate those instead, below; requests/ and audits/ start empty)
   - .claude/commands/  (wrequest, website, waudit, brainstorm, winit)
   - .claude/skills/    (all framework skills; prune domain-specific ones
     that don't apply and note replacements needed in skills_map.md)
2. INSTANTIATE:
   - site_profile_TEMPLATE.md → website_workflow/site_profile.md — INTERVIEW
     the owner for every token (never guess brand colors or ICP). Then
     REPLACE every {TOKEN} occurrence across the copied workflow files with
     the profile values (grep to verify zero unresolved tokens remain).
   - app_reality_TEMPLATE.md → website_workflow/app_reality.md — owner fills
     feature truth + real customer count BEFORE any strategic page ships.
   - decisions_log.md — create fresh with one INIT entry.
3. VERIFY: run the framework self-check —
     `python website_workflow/tools/audit_framework.py`
   It runs, in one pass: command-copy parity, internal cross-references,
   skill-folder integrity (SKILL.md present AND every file it links to
   exists), README Files-table currency, design-library index/body parity,
   token form, cited tools existing, script compilation, and mapped-skill
   availability. Exit 0 = clear; any FAIL blocks the init.
   Then the two checks that are SPECIFIC to a fresh clone and that the audit
   cannot judge from the master:
   a) FORWARD — no {TOKEN} or "TEMPLATE" strings remain in the instantiated
      files (in a site clone an unresolved token IS an error; in the master
      it is expected),
   b) REVERSE — no literal that should have been a token was left behind.
      The audit reports these as un-tokenized-literal warnings; in a clone,
      review every one. Prevents: the failure recorded as UniqBotz M-13 and
      generalised as degraded_paths.md DP-002 — this step used to verify
      only direction (a), and a validation checked in one direction only is
      how the more dangerous defect ships.
   c) README.md dates current.
4. FIRST RUN: tell the owner the order of operations:
   fill app_reality.md → /brainstorm or /wrequest for the first page →
   /website to build. Strategy (Phase S) runs research-first with the
   decision matrix; nothing ships on taste.
5. LOG the init in the site's decisions_log.md and update its README.md.

RULES: never copy another site's app_reality/decisions/requests into a new
site; never point two sites at the same truth files; the design library
copies WITH its entries (patterns are reusable knowledge — provenance tags
stay).
