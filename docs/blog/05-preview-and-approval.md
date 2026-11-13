# 05 — Preview and approval guide

## For the owner: what you are approving

You approve ONE thing: that the preview shows your blog, as you wrote it, the
way you want it published. The approval is tied to that exact version of the
text and every media file. If anything changes afterwards, your approval no
longer applies and nothing can be published until you approve again.

## Generate the preview

```
npm run blog -- preview <run dir> --site <site dir> [--origin https://your-domain] [--route-base /blog]
```
Writes, and publishes nothing:

| File | What it is |
|---|---|
| `<run>/preview/<slug>/index.html` | the page in your site's styles; open it in a browser |
| `<run>/reports/<slug>.validation.md` | the validation report |
| `<run>/reports/site-compatibility.md` | what kind of site this is and whether it can be published to |

The preview has a panel at the top and marked notes in the page. They exist
only in the preview and never appear on a published page.

## Read the report

**Publishing readiness** is one of:

- **BLOCKED** — something must be fixed first. Each blocker says what is wrong,
  in which section, and what to do (usually: supply a file, or correct the
  document).
- **READY WITH WARNINGS** — it can be published, but you must acknowledge the
  listed warnings. Read each one; they describe things you might not expect,
  such as an image with no alt text, a supplied file that is not shown because
  nothing says where it belongs, or a photo that carries GPS location data.
- **READY**.

Sections of the report: successfully extracted · successfully mapped · missing
assets · unsupported formats · placement uncertainties · extraction warnings ·
SEO artifacts not produced.

**NOT VERIFIED** checks (video playback, behaviour on phones and tablets, live
links) cannot be established from files alone. They are checked in a browser
before release (Phase 5). They are never reported as passed here.

## Fix and repeat

Change the source document or add an instruction file, run the ingest again
into a NEW run directory, and preview again. Do not edit the manifest by hand:
an edited manifest invalidates the preview and the approval.

## Approve

```
npm run blog -- approve <run dir> --by "Your Name" [--accept-warnings] [--blog <id>]
```
Refused when: the blog is blocked · no preview of this exact version exists ·
there are warnings and `--accept-warnings` was not given · no name was given.
The record is written to `<run>/approvals/` with the content digest, your
name, the time, and the warning codes you acknowledged.

Replacing a post that is already published needs a separate, explicit approval:
```
npm run blog -- approve <run dir> --by "Your Name" --replace --site <site dir>
```
This records the digest of the published version you are agreeing to replace.

Claude never runs `approve` on your behalf unless you say so in the
conversation.

## Check state at any time

```
npm run blog -- status <run dir>
```
