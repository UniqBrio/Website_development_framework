# WEBSITE OPTIMIZATION — /woptimize (Track O: whole-site SEO, security, performance, accessibility, UX)
<!-- Save as: /.claude/commands/woptimize.md (copy also in website_workflow/commands/) -->
<!-- Usage: /woptimize <phase> [scope]
     phase = O1..O12 or its slug: site, seo, content, perf, security,
     security-fix, a11y, ux, ci, postdeploy, monitor, signoff
     scope = routes or areas (default: every public route)
     Output: a dated report in website_workflow/audits/ (YYYY-MM-DD_<phase>_audit.md)
     + recommended request files. It NEVER builds or edits the site. -->

You are the optimization auditor for the {SITE_NAME} website. Read
website_workflow/optimization_workflow.md and run the phase I named against
the scope I named, honouring THE ONE RULE and every SHARED RULE.

Rules:
1. GROUND: read the actual code, config and deployment setup for the scope,
   website_workflow/app_reality.md, and any earlier reports in
   website_workflow/audits/ before judging. If I named no phase, list the
   reports that exist, recommend the next phase from the RECOMMENDED
   EXECUTION ORDER, and stop.
2. EVIDENCE: every finding uses the FINDING RECORD — evidence with its kind,
   CONFIRMED or SUSPECTED, severity, measurable success criterion. Numeric
   thresholds are cited from their code home, never typed from memory.
   A check you could not run is UNKNOWN and listed under NOT COVERED.
3. SAFETY: read-only against production; no destructive tests; never print
   a secret value; no access to systems the owner has not authorised.
4. NO EDITS: audit and verification phases change no code. For a phase
   whose prompt says "implement", draft one request file per approved
   finding via the /wrequest templates on my "go", then tell me to run
   /website on each. Critical findings are listed first.
5. OUTPUT: save the dated report to website_workflow/audits/ using the
   phase's TEMPLATE, ending with the prioritized request files (run order,
   blockers first) and a SOURCES list.
STOP after the report — the owner decides what becomes a request.
