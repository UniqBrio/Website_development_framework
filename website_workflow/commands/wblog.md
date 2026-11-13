# BLOG PUBLISHING RUNNER
<!-- Save as: /.claude/commands/wblog.md -->
<!-- Usage: /wblog <blog document(s), a folder, or a ZIP> [instruction file] -->

Read website_workflow/blog_publishing.md and execute it, in full, on the blog
files I named. This is the OPTIONAL blog branch of the Website Flow: use it
only for a blog that is already written.

1. B1: run `python website_workflow/tools/blog_ingest.py <inputs> --out
   website_workflow/blog_runs/<run id>`. If the tool flags
   GROUPING_UNCONFIRMED or PRESENTATION_PURPOSE_UNCONFIRMED, ask me that one
   question and re-run with the matching flag. Ask nothing else first.
2. B2b: run `npm run blog -- inspect-site <site dir>`. If the website is
   reported as NOT SUPPORTED, show me every reason and STOP: do not create
   folders, convert the project, or write into a blog section the workflow
   did not publish. Offer the two documented options (another --route-base,
   or mapping the manifest by hand).
   B3–B4: run `npm run blog -- preview <run dir> --site <site dir>` and show me
   the preview path and the validation report: readiness, every blocker with
   its corrective action, every warning, every NOT VERIFIED check.
3. STOP at GATE B. Do not approve or publish until I say so in this
   conversation. If the blog is BLOCKED, tell me exactly what to supply.
4. After my approval: `npm run blog -- approve …` with my name, then
   `npm run blog -- publish …`, tell me the transaction id it prints and that
   `npm run blog -- rollback <run dir>` undoes it, then continue with
   website_flow.md Phase 5 on the new route only.
   Replacing a post that is already published is destructive: ask me first,
   and only then use `approve … --replace --site …` and `publish … --replace`.
   Never use `rollback --force` without asking me.

Never write, rewrite, shorten, re-title or complete the blog's content, never
invent alt text, captions, descriptions or media, and never place a media file
the tool left unplaced. If I ask for any of that here, tell me it is outside
this branch. If I gave you a change request instead of a blog → /wrequest.
