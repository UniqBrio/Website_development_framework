# 04 — Website layout mapping guide

Use this when the target website is hand-built, has its own blog, or is
reported as unsupported by `inspect-site`. The branch does not guess at a
layout it does not understand; this guide is how a developer maps the blog
onto it deliberately.

## Step 1 — find out what the site is

```
npm run blog -- inspect-site <site dir> [--route-base /blog]
```
It prints the site kind, the stylesheets and header/footer it found, whether
the design tokens are present, what already exists at the blog route, review
items, and — if publishing is refused — every reason. Exit code 1 = refused.

## Step 2 — choose a path

| Situation | Path |
|---|---|
| Supported, no existing blog | publish normally (06) |
| Supported, but the site has its own blog at `/blog` | publish beside it with `--route-base /articles` (or similar), or map by hand |
| Refused: content system present | map the manifest into that system (below) |
| Refused: other framework | map by hand using the manifest |

## Step 3 — mapping by hand

The manifest (`<run>/manifest.json`) and `<run>/reports/<slug>.mapping.json`
are the specification. Map each element to the site's OWN component:

| Manifest element | Typical destination | Rule that must survive the mapping |
|---|---|---|
| `title.inlines` | post title, the page's only H1 | never replaced by a generated title |
| `subtitle` | deck / standfirst | omit if null |
| `metadata.author`, `metadata.date` | byline | show the date as written; machine date only if ISO |
| `cover` | hero / featured image | load first; needs `alt` or an explicit decorative mark |
| `blocks[type=heading]` | section headings | shift levels down one if the source used H1 in the body |
| `paragraph`, `list`, `blockquote`, `code` | body components | inline marks and links kept; text verbatim |
| `table` | responsive table | header rows → `<th scope="col">`; wide tables scroll in a labelled, focusable region |
| `media` (image) | image component | width and height from the asset; `alt` from the block; caption if present |
| `media` (animation) | image, NOT optimised | bytes unchanged; reader can hide it (WCAG 2.2.2) |
| `media` (video/audio) | native player | controls, no autoplay, poster and tracks from the block |
| `embed` | consent-friendly embed | keep the plain link; load third-party content on intent |
| `chart` | data table, or the site's chart component | values exactly as in `series[].values` |
| `footnotes` | footnote list | links both ways |
| section role `cta` | the site's call-to-action component | only the author's own link and wording |
| `missing_media`, `external_media` | nothing / a link | never substitute an image |
| `metadata.description`, `keywords`, `canonical` | head | only if supplied |

Assets: copy from `<run>/assets/<blog-id>/` under their stored names; verify
each against `assets[].sha256`. Do not publish assets whose role is `unplaced`
or `not-displayed`.

When the mapping needs a component the site does not have, that is a design
change: it goes through `website_workflow/website_flow.md` Phases 1–2, not
through the blog branch.

## Step 4 — the gate still applies

A hand-mapped post is still previewed to the owner, approved against the
validation report, and taken through Phase 5. The approval record in the run
directory is the evidence that the owner approved THIS content.

## What the automatic path does on each supported kind

| | Generated site | Next.js App Router | Static HTML |
|---|---|---|---|
| Page shell | header and footer inside `<main>` (generator convention) | the site's root layout | header, `<main>` with the article, footer |
| Header/footer source | `c-site-header` / `c-site-footer` from the home page | not copied — the layout supplies them | first `<header>`, last `<footer>` of `index.html`, scripts removed |
| Stylesheets | `/styles.css` + `<base>/blog.css` | `globals.css` via the layout + `blog.css` imported by the page | every stylesheet the home page links + `<base>/blog.css` |
| Images | `<img>` with dimensions | `next/image`; animations and SVG `unoptimized` | `<img>` with dimensions |
| Skip link | the site's `c-skip` | the site's own, if any | `c-blog-skip`, styled by `blog.css` |
