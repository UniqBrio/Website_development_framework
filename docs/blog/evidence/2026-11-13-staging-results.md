# Staging evidence — 2026-11-13 (final code)

Sanitised for a public repository: absolute paths, the private site's route list and build logs are omitted.
Target: a disposable copy (no `.git`) of the private UniqBrio-Landing repository; reference clone verified unchanged.

| Result | Step | Detail |
|---|---|---|
| PASS | copy has no .git (cannot commit or push) | <scratch> |
| PASS | baseline build of the untouched copy | 45 routes |
| PASS | site detection | Site kind: **next-app-router** · publishing: **SUPPORTED** · blog route: `/blog` |
| PASS | ingest 01-markdown | [blog-1] FIXTURE Automating Fee Reminders |
| PASS | preview 01-markdown | [blog-1] READY |
| INFO | source vs preview (independent reader) post.md | post.md (read by pandoc): 93 of 94 source words found on the preview, in order (98.9%) |
| PASS | approve 01-markdown | approved blog-1 by Staging test (digest 7b3f12cf5b3bd0bc) |
| PASS | ingest 02-word | [blog-1] FIXTURE — How Academies Cut Fee Leakage |
| PASS | preview 02-word | [blog-1] READY WITH WARNINGS |
| INFO | source vs preview (independent reader) fixture-leakage.docx | fixture-leakage.docx (read by pandoc): 78 of 78 source words found on the preview, in order (100.0%) |
| PASS | approve 02-word | approved blog-1 by Staging test (digest 92f03f90d7ec6961); acknowledged: VIDEO_CAPTIONS_MISSING |
| PASS | ingest 03-pdf | [blog-1] FIXTURE — How Academies Cut Fee |
| PASS | preview 03-pdf | [blog-1] READY WITH WARNINGS |
| INFO | source vs preview (independent reader) fixture-leakage.pdf | fixture-leakage.pdf (read by pdftotext): 80 of 84 source words found on the preview, in order (95.2%) |
| PASS | approve 03-pdf | approved blog-1 by Staging test (digest e7b7eee5879fd9f3); acknowledged: ALT_TEXT_MISSING, PDF_TABLE_RECONSTRUCTED, VIDEO_CAPTIONS_MISSING |
| PASS | existing blog route is refused, nothing written | blog publish: this website cannot be published to, and nothing was written: the site already has content at /blog that this workflow did not create (app/blog/page.tsx). It is never |
| PASS | copy back to baseline after conflict test |  |
| PASS | simultaneous publish: second publisher refused by the lock | exit codes 0 1 |
| PASS | publish fixture-automating-fee-reminders | nothing to do: the site already holds exactly this approved version |
| PASS | publish fixture-how-academies-cut-fee-leakage | published 1 blog(s) to a next-app-router site: 4 file(s) created, 2 replaced (transaction 20261113133653-409ec1) |
| PASS | no existing site file modified or removed by publishing | 17 file(s) added, 0 changed, 0 removed (files-added.txt) |
| PASS | retry of a finished publish changes nothing |  |
| PASS | production build with published posts | 48 routes; 3 blog route(s) |
| PASS | the server under test is this run's build | port 38101 serves cover-8dcd249b32.png |
| FAIL | browser checks of the blog pages (see browser.log) | 3 failing check line(s); 9 site-owned finding line(s); 2 engine(s) not run |
| PASS | existing home page still served | HTTP 200 |
| PASS | publisher killed mid-commit leaves a partial state (precondition) | 0 line(s) of output before the kill |
| PASS | stale lock reported after the kill | STALE: its process (13568) is no longer running |
| PASS | rollback of the interrupted publish restores the site exactly | publish 20261113133741-60dbaf had not finished; it was undone and the site is as it was before it started  |
| PASS | rollback in the wrong order is refused and changes nothing | blog rollback: publish 20261113133652-303d58 cannot be rolled back yet: later publish(es) changed the same files — 20261113133653-409ec1 (run run-1, fixture-h |
| PASS | rollback returns the copy to its baseline, byte for byte |  |
| PASS | no lock, temporary or stale files left |  |
| PASS | reference repository unchanged (commit, status, every file) | commit <recorded, unchanged> status-lines 0 fingerprint <unchanged>  |

## Browser checks (Chromium; WebKit and Firefox not installed)

```
chromium  320px /blog/fixture-automating-fee-reminders  30/30 pass · axe: 0 violation rule(s), 22 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium  768px /blog/fixture-automating-fee-reminders  30/30 pass · axe: 0 violation rule(s), 21 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium 1280px /blog/fixture-automating-fee-reminders  30/30 pass · axe: 0 violation rule(s), 21 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium  320px /blog/fixture-how-academies-cut-fee-leakage  26/27 pass · axe: 0 violation rule(s), 20 passing
         FAIL video.captions-track: 1 video(s) without a captions/subtitles track
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium  768px /blog/fixture-how-academies-cut-fee-leakage  26/27 pass · axe: 0 violation rule(s), 20 passing
         FAIL video.captions-track: 1 video(s) without a captions/subtitles track
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium 1280px /blog/fixture-how-academies-cut-fee-leakage  26/27 pass · axe: 0 violation rule(s), 20 passing
         FAIL video.captions-track: 1 video(s) without a captions/subtitles track
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium  320px /blog  26/26 pass · axe: 0 violation rule(s), 11 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium  768px /blog  26/26 pass · axe: 0 violation rule(s), 11 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
chromium 1280px /blog  26/26 pass · axe: 0 violation rule(s), 11 passing
         SITE-OWNED site.failed-requests: 404 for an image the site's own layout preloads (pre-existing; not a blog file)
NOT RUN  webkit: webkit is not installed in this environment
NOT RUN  firefox: firefox is not installed in this environment
```
