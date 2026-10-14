/**
 * BASE-LAYER RENDERER — semantic HTML, no JavaScript.
 *
 * This is §10 Layer 1-2 rendered faithfully: server HTML plus CSS, with every
 * task completable. It is also the artifact the SEO and no-JS evidence needs, so
 * the framework can measure its own output rather than describing it.
 *
 * DD-076: native semantic elements first. Every interactive thing below is an
 * `<a>`, `<button>`, `<form>` control or `<details>`; there is no `div` with a
 * click handler and no ARIA role standing in for an element that exists.
 *
 * SEO artifacts come from `output.seoArtifacts` — the generator does NOT build a
 * second SEO system. An artifact with no value is simply not emitted, because
 * emitting a guessed canonical is worse than emitting none.
 */
import type { ComponentModel, ComponentNode, PendingValue } from "../component-model.js";
import type { PageSeoArtifacts, SeoArtifactPlan } from "../../seo/artifacts.js";
import { renderCalculatorMarkup, renderDecisionFlowMarkup } from "./experiences.js";
import { EXPERIENCE_RUNTIME_PATH } from "../runtime/experience-runtime.js";

/** Render an `experience` node. The calculator and decision-flow markup is shared with the Next emitter. */
export function experienceMarkup(node: ComponentNode, childrenHtml: string): string {
  const x = node.experience;
  if (!x) return "";
  if (x.definition.type === "comparison") {
    return `<section class="c-experience c-experience--comparison" data-experience="comparison" data-experience-id="${esc(x.specId)}" data-experience-mode="static">${childrenHtml}</section>`;
  }
  const mode = x.mode === "interactive" ? "interactive" : "static_fallback_only";
  if (x.definition.type === "calculator") return renderCalculatorMarkup(x.specId, x.definition.calculator, mode);
  if (x.definition.type === "decision_flow") return renderDecisionFlowMarkup(x.specId, x.definition.flow, x.definition.offerRoutes, mode);
  return "";
}

/** True when a page carries an experience whose enhancement needs the runtime. */
export function pageNeedsExperienceRuntime(nodes: readonly ComponentNode[]): boolean {
  const visit = (n: ComponentNode): boolean => (n.kind === "experience" && n.experience?.mode === "interactive") || (n.children ?? []).some(visit);
  return nodes.some(visit);
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * FD-03 / FD-04: published catalogue facts for one item — its price, its variants'
 * prices, its verified attributes. Every value here passed the publication policy.
 */
function metaMarkup(meta: readonly string[] | undefined): string {
  if (!meta || meta.length === 0) return "";
  return `<ul class="c-item-meta">${meta.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
}

/** FD-06: a missing value, typed and counted by `parseServedHtml` (never a class-name guess). */
function pendingMarker(pending: PendingValue): string {
  return `<p class="c-pending" data-content-pending="${esc(pending.needs)}">${esc(pending.text)}</p>`;
}

/** Class names are derived from the node id and kind, so CSS can target them. */
function classFor(node: ComponentNode): string {
  return `c-${node.kind.replace(/_/g, "-")}`;
}

/**
 * DD-074 / DD-081 / DD-085 / DD-095 in one place. Every image carries width,
 * height and an alt attribute (empty only when the asset is declared
 * decorative); the LCP candidate is eager and high priority, the rest lazy.
 */
function renderImage(node: ComponentNode): string {
  const img = node.image;
  if (!img) return "";
  const loading = img.priority ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const alt = img.decorative ? "" : esc(img.alt);
  return `<img class="${classFor(node)}" src="${esc(img.src)}" alt="${alt}" width="${img.width}" height="${img.height}" ${loading} decoding="async" sizes="${esc(img.sizes)}">`;
}

function renderItems(node: ComponentNode): string {
  const items = node.items ?? [];
  switch (node.kind) {
    case "definition_list":
      return `<dl class="${classFor(node)}">${items
        .map((i) =>
          i.detail && /^(mailto:|tel:|https:\/\/wa\.me\/)/.test(i.detail)
            ? `<dt>${esc(i.term ?? "")}</dt><dd><a href="${esc(i.detail)}">${esc(i.text)}</a></dd>`
            : `<dt>${esc(i.term ?? "")}</dt><dd>${i.pending ? pendingMarker(i.pending) : esc(i.text)}</dd>`,
        )
        .join("")}</dl>`;
    case "timeline":
      return `<ol class="${classFor(node)}">${items
        .map((i) => `<li><h3>${esc(i.term ?? "")}</h3><p>${esc(i.text)}</p></li>`)
        .join("")}</ol>`;
    case "disclosure_group":
      // Native details/summary: fully usable with no JavaScript, and keyboard
      // accessible by the platform rather than by our code.
      return `<div class="${classFor(node)}">${items
        .map(
          (i) =>
            `<details><summary>${esc(i.term ?? "")}</summary><div><p>${esc(i.text)}</p></div></details>`,
        )
        .join("")}</div>`;
    case "card_grid":
      return `<ul class="${classFor(node)}">${items
        .map(
          (i) =>
            `<li><h3>${esc(i.term ?? "")}</h3>${
              i.text ? `<p>${esc(i.text)}</p>` : ""
            }${metaMarkup(i.meta)}${i.pending ? pendingMarker(i.pending) : ""}</li>`,
        )
        .join("")}</ul>`;
    case "nav": {
      // DD-033: descriptive labels plus a current-location state. The renderer
      // receives the route it is rendering via `currentRoute` (set below).
      const list = `<ul>${items
        .map((i) => {
          const current = i.detail !== undefined && i.detail === currentRoute ? ' aria-current="page"' : "";
          return `<li><a href="${esc(i.detail ?? "/")}"${current}>${esc(i.text)}</a></li>`;
        })
        .join("")}</ul>`;
      const compact = node.navCompact;
      if (!compact) return `<nav class="${classFor(node)}" aria-label="Primary">${list}</nav>`;
      // DD-034 (P1-4): a native popover disclosure below the medium range.
      return `<nav class="${classFor(node)}" aria-label="Primary" data-nav-compact="${compact.mode}"><button type="button" class="c-nav-toggle" popovertarget="${compact.menuId}">Site menu</button><div id="${compact.menuId}" class="c-nav-menu" popover>${list}<button type="button" class="c-nav-close" popovertarget="${compact.menuId}" popovertargetaction="hide">Close menu</button></div></nav>`;
    }
    case "site_footer":
      return `<footer class="${classFor(node)}"><nav aria-label="Footer"><ul>${items
        .map((i) => `<li><a href="${esc(i.detail ?? "/")}">${esc(i.text)}</a></li>`)
        .join("")}</ul></nav></footer>`;
    case "list":
      return `<ul class="${classFor(node)}">${items.map((i) => `<li>${esc(i.text)}</li>`).join("")}</ul>`;
    case "form":
      return renderForm(node);
    default:
      return items.length > 0
        ? `<ul class="${classFor(node)}">${items.map((i) => `<li>${esc(i.text)}</li>`).join("")}</ul>`
        : "";
  }
}

/**
 * An ACTION-SPECIFIC form from its contract (generation/form-contracts.ts).
 * DD-083: visible labels, per-field error regions, autocomplete tokens and a
 * live status region. A configured endpoint gets a real POST that works before
 * any JavaScript loads; an unconfigured one renders disabled with a visible
 * notice, and has no action attribute at all — it cannot pretend to submit.
 */
function renderForm(node: ComponentNode): string {
  const c = node.form;
  if (!c) return "";
  const configured = c.endpoint.state === "configured";
  const target = c.endpoint.state === "configured" ? ` method="post" action="${esc(c.endpoint.url)}"` : "";
  const describedBy = configured ? `${node.id}-status` : `${node.id}-status ${node.id}-endpoint`;
  const fields = c.fields
    .map((f) => {
      const id = `f-${f.name}`;
      const label = `<label for="${id}">${esc(f.label)}${f.required ? "" : " (optional)"}</label>`;
      const error = `<span id="${id}-error" class="c-field-error" aria-live="polite"></span>`;
      const autocomplete = f.autocomplete ? ` autocomplete="${esc(f.autocomplete)}"` : "";
      const required = f.required ? " required" : "";
      if (f.type === "textarea") {
        return `<p>${label}<textarea id="${id}" name="${esc(f.name)}"${autocomplete} aria-describedby="${id}-error"${required}></textarea>${error}</p>`;
      }
      if (f.type === "select") {
        const options = (f.options ?? []).map((o) => `<option>${esc(o)}</option>`).join("");
        return `<p>${label}<select id="${id}" name="${esc(f.name)}" aria-describedby="${id}-error"${required}><option value="">Choose</option>${options}</select>${error}</p>`;
      }
      const min = f.min !== undefined ? ` min="${f.min}"` : "";
      return `<p>${label}<input id="${id}" name="${esc(f.name)}" type="${f.type}"${autocomplete}${min} aria-describedby="${id}-error"${required}>${error}</p>`;
    })
    .join("");
  const notice = configured
    ? ""
    : `<p id="${esc(node.id)}-endpoint" class="c-unavailable-notice" role="note">${esc(c.unconfiguredNotice)}</p>`;
  return `<form class="${classFor(node)}" data-contract="${c.kind}" data-endpoint="${c.endpoint.state}"${target} aria-describedby="${esc(describedBy)}">${notice}<fieldset${
    configured ? "" : " disabled"
  }><legend>${esc(c.legend)}</legend>${fields}<p><button type="submit">${esc(c.submitLabel)}</button></p></fieldset><p id="${esc(
    node.id,
  )}-status" class="c-form-status" role="status" aria-live="polite"></p></form>`;
}

/** The route being rendered, for DD-033's aria-current. Set per page. */
let currentRoute = "/";

function renderNode(node: ComponentNode): string {
  const children = (node.children ?? []).map(renderNode).join("");

  switch (node.kind) {
    case "site_header":
      return `<header class="${classFor(node)}">${children}</header>`;
    case "site_footer":
      return renderItems(node);
    case "brand":
      // DD-096: a verified logo file, or a typographic wordmark of the verified
      // name. Never a generated mark.
      return `<a class="${classFor(node)}" href="${esc(node.href ?? "/")}">${
        children || esc(node.text ?? "")
      }</a>`;
    case "image":
      return renderImage(node);
    case "sticky_cta":
      // DD-037 + DD-069: sticky, safe-area aware (CSS), in flow without CSS.
      return `<div class="${classFor(node)}"><a class="c-action" href="${esc(node.href ?? "/")}">${esc(node.text ?? "")}</a></div>`;
    case "hero": {
      // DD-030: the layout modifier the evaluator chose (split | vertical).
      const modifier = node.layout ? ` ${classFor(node)}--${esc(node.layout)}` : "";
      return `<section class="${classFor(node)}${modifier}" aria-labelledby="hero-h1">${children}</section>`;
    }
    case "heading": {
      const level = node.headingLevel ?? 2;
      const id = level === 1 ? ' id="hero-h1"' : "";
      return `<h${level}${id}>${esc(node.text ?? "")}</h${level}>`;
    }
    case "prose":
      return `<p class="${classFor(node)}">${esc(node.text ?? "")}</p>`;
    case "content_slot":
      // Explicitly incomplete rather than invented (§12). Marked for both a
      // reader and an editor, and excluded from search indexing of claims.
      return `<div class="${classFor(node)}" data-content-slot="${esc(
        node.needs ?? "",
      )}"><p>${esc(node.text ?? "")}</p></div>`;
    case "unavailable_notice":
      // A missing business fact stated publicly: counted as placeholder text (FD-06).
      // Experience no-JS notices are rendered elsewhere, without this marker.
      return `<div class="${classFor(node)}" role="note" data-content-unavailable="${esc(node.needs ?? "")}"><p>${esc(node.text ?? "")}</p></div>`;
    case "gallery":
      // The BASE layer of a gallery is a plain grid with every image visible —
      // the declared fallback, not a JS-dependent carousel (DD-042, DD-043).
      return `<div class="${classFor(node)}" data-enhance="gallery"><noscript></noscript><ul class="c-gallery-grid">${(
        node.children ?? []
      )
        .map((c) => `<li>${renderNode(c)}</li>`)
        .join("")}</ul></div>`;
    case "diagram":
      return `<figure class="${classFor(node)}"><figcaption>${esc(node.text ?? "")}</figcaption></figure>`;
    case "section":
      return `<section class="${classFor(node)}">${children}</section>`;
    case "action":
      return `<a class="${classFor(node)}" href="${esc(node.href ?? "/")}">${esc(node.text ?? "")}</a>`;
    case "experience":
      return experienceMarkup(node, children);
    case "contact_actions":
      // P1-2: completable contact links; the label names the action, the value shows where it goes.
      return `<ul class="c-contact-actions">${(node.contactLinks ?? [])
        .map((l) => `<li><a class="c-action c-contact-action" href="${esc(l.href)}" data-contact="${l.kind}"><span>${esc(l.actionLabel)}</span> <span class="c-contact-value">${esc(l.value)}</span></a></li>`)
        .join("")}</ul>`;
    case "comparison_table": {
      // ECO §12 Comparison: caption, scoped headers, row/column relationships kept
      // at every width by a focusable, labelled scroll region (not CSS stacking,
      // which drops table semantics in some engines).
      const t = node.table;
      if (!t) return "";
      const captionId = `${esc(node.id)}-caption`;
      const head = `<thead><tr><th scope="col">${esc(t.rowHeading)}</th>${t.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>`;
      const body = `<tbody>${t.rows
        .map((r) => `<tr><th scope="row">${esc(r.header)}</th>${r.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      return `<div class="c-table-scroll" role="region" aria-labelledby="${captionId}" tabindex="0"><table class="${classFor(node)}"><caption id="${captionId}">${esc(t.caption)}</caption>${head}${body}</table></div>`;
    }
    default:
      return renderItems(node) + children;
  }
}

/** Emit only the SEO artifacts that HAVE values. A guess is worse than nothing. */
function renderHead(artifacts: PageSeoArtifacts, cssHref: string, entities: ReadonlyArray<Record<string, unknown>>): string {
  const tags: string[] = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
  if (artifacts.title.value) tags.push(`<title>${esc(artifacts.title.value)}</title>`);
  if (artifacts.metaDescription.value) {
    tags.push(`<meta name="description" content="${esc(artifacts.metaDescription.value)}">`);
  }
  if (artifacts.canonical.value) {
    tags.push(`<link rel="canonical" href="${esc(artifacts.canonical.value)}">`);
  }
  if (artifacts.robots.value) tags.push(`<meta name="robots" content="${esc(artifacts.robots.value)}">`);
  for (const [key, artifact] of Object.entries(artifacts.openGraph)) {
    if (!artifact.value) continue;
    const property = key === "title" ? "og:title" : key === "description" ? "og:description" : `og:${key}`;
    tags.push(`<meta property="${property}" content="${esc(artifact.value)}">`);
  }
  for (const [key, artifact] of Object.entries(artifacts.twitter)) {
    if (!artifact.value) continue;
    tags.push(`<meta name="twitter:${key}" content="${esc(artifact.value)}">`);
  }
  // Real entities with required properties; `<` is escaped so no string can close the script.
  for (const entity of entities) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(entity).replace(/</g, "\\u003c")}</script>`);
  }
  tags.push(`<link rel="stylesheet" href="${cssHref}">`);
  return tags.join("\n");
}

export interface RenderedPage {
  route: string;
  /** The file path this page occupies in a static host. */
  path: string;
  html: string;
}

export function renderStaticSite(
  model: ComponentModel,
  seo: SeoArtifactPlan,
  options: { cssHref?: string; lang?: string; jsonLd?: ReadonlyMap<string, ReadonlyArray<Record<string, unknown>>> } = {},
): RenderedPage[] {
  const cssHref = options.cssHref ?? "/styles.css";
  const lang = options.lang ?? "en";

  return model.pages.map((pageModel) => {
    const artifacts = seo.pages.find((p) => p.route === pageModel.page.route);
    if (!artifacts) {
      throw new Error(
        `no SEO artifacts for ${pageModel.page.route} — the generator must not render a page the SEO layer does not know about`,
      );
    }
    currentRoute = pageModel.page.route;
    const body = pageModel.nodes.map(renderNode).join("\n");
    const html = `<!doctype html>
<html lang="${lang}">
<head>
${renderHead(artifacts, cssHref, options.jsonLd?.get(pageModel.page.route) ?? artifacts.structuredDataEntities.value ?? [])}
</head>
<body>
<a class="c-skip" href="#main">Skip to content</a>
<main id="main">
${body}
</main>${pageNeedsExperienceRuntime(pageModel.nodes) ? `
<script src="${EXPERIENCE_RUNTIME_PATH}" defer></script>` : ""}
</body>
</html>`;

    const route = pageModel.page.route;
    const path = route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
    return { route, path, html };
  });
}
