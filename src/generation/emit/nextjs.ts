/**
 * NEXT.JS APP ROUTER EMITTER.
 *
 * Emits the SOURCE the stack decision demands. It consumes
 * `output.stack` — it does not choose a framework, and it cannot: the framework
 * name, rendering strategy and library list all arrive decided.
 *
 * Client-boundary discipline (§10, stack_doctrine.md CLIENT BOUNDARY): a
 * `"use client"` directive is emitted ONLY for a node the component model marked
 * `requiresClientJs`, and it is placed on that LEAF, never on a page or layout.
 * Every such node also emits its no-JS fallback in the server markup, so the base
 * experience survives the enhancement failing.
 */
import type { DesignDecisionOutput } from "../../pipeline.js";
import type { ComponentModel, ComponentNode, PendingValue } from "../component-model.js";
import type { PageSeoArtifacts } from "../../seo/artifacts.js";

import type { FormContract, FormField } from "../form-contracts.js";
import { experienceMarkup, pageNeedsExperienceRuntime } from "../render/html.js";
import { EXPERIENCE_RUNTIME_FILE, EXPERIENCE_RUNTIME_PATH } from "../runtime/experience-runtime.js";

/** The marker a host's not-found probe looks for, so a 404 is proven to be OURS. */
export const NOT_FOUND_MARKER = 'data-framework-state="not-found"';

/** One zod field per contract field. Mirrors the browser constraints exactly. */
function zodFor(field: FormField): string {
  let base: string;
  switch (field.type) {
    case "email":
      base = "z.string().trim().email()";
      break;
    case "date":
      base = "z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)";
      break;
    case "number":
      base = `z.coerce.number().int()${field.min !== undefined ? `.min(${field.min})` : ""}`;
      break;
    case "select":
      base = `z.enum(${JSON.stringify(field.options ?? [])} as [string, ...string[]])`;
      break;
    default:
      base = field.required ? "z.string().trim().min(1)" : "z.string().trim()";
  }
  return field.required ? base : `${base}.optional()`;
}

function schemaModule(contracts: readonly FormContract[]): string {
  const unique = new Map<string, FormContract>();
  for (const c of contracts) if (!unique.has(c.kind)) unique.set(c.kind, c);
  const blocks = [...unique.values()].map((c) => {
    const fields = c.fields.map((f) => `  ${JSON.stringify(f.name)}: ${zodFor(f)},`).join("\n");
    return [
      `/** ${c.kind}: ${c.intent}. */`,
      `export const ${c.kind}Schema = z.object({\n${fields}\n});`,
      `export const ${c.kind}Endpoint = ${JSON.stringify(c.endpoint)} as const;`,
    ].join("\n");
  });
  return [
    "/**",
    " * GENERATED form contracts. A configured host endpoint MUST validate submissions",
    " * with these schemas; they mirror the browser constraints on each form exactly.",
    " * No endpoint is generated here: the framework does not invent a backend.",
    " */",
    'import { z } from "zod";',
    "",
    blocks.join("\n\n"),
    "",
  ].join("\n");
}

const INDENT = "      ";

function tsxEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/** FD-03 / FD-04: the same published catalogue facts the static layer renders. */
function metaMarkupTsx(meta: readonly string[] | undefined): string {
  if (!meta || meta.length === 0) return "";
  return `<ul className="c-item-meta">${meta.map((m, i) => `<li key={${i}}>{\`${tsxEscape(m)}\`}</li>`).join("")}</ul>`;
}

/** FD-06: the same typed missing-value marker the static layer renders. */
function pendingMarkerTsx(pending: PendingValue): string {
  return `<p className="c-pending" data-content-pending={\`${tsxEscape(pending.needs)}\`}>{\`${tsxEscape(pending.text)}\`}</p>`;
}

/**
 * DD-075: `next/image` with an explicit `sizes` whenever the rendered width is
 * responsive (it always is here: `max-width: 100%; height: auto`), plus the
 * intrinsic width/height so the aspect ratio is reserved (DD-074). `priority`
 * marks the one LCP candidate (DD-085); everything else lazy-loads by default.
 */
function imageJsx(node: ComponentNode, pad: string): string {
  const img = node.image;
  if (!img) return "";
  const alt = img.decorative ? "" : tsxEscape(img.alt);
  return `${pad}<Image className="c-image" src={\`${tsxEscape(img.src)}\`} alt={\`${alt}\`} width={${img.width}} height={${img.height}} sizes="${tsxEscape(img.sizes)}"${img.priority ? " priority" : ""} />`;
}

/**
 * The same action contract as the static layer, in JSX. A configured endpoint is
 * a real POST; an unconfigured one is a disabled fieldset with a visible notice
 * and no action attribute.
 */
function formJsx(node: ComponentNode, pad: string): string {
  const c = node.form;
  if (!c) return "";
  const configured = c.endpoint.state === "configured";
  const target = c.endpoint.state === "configured" ? ` method="post" action="${c.endpoint.url}"` : "";
  const describedBy = configured ? `${node.id}-status` : `${node.id}-status ${node.id}-endpoint`;
  const fields = c.fields
    .map((f) => {
      const id = `f-${f.name}`;
      const label = `<label htmlFor="${id}">{\`${tsxEscape(f.label + (f.required ? "" : " (optional)"))}\`}</label>`;
      const error = `<span id="${id}-error" className="c-field-error" aria-live="polite" />`;
      const autocomplete = f.autocomplete ? ` autoComplete="${f.autocomplete}"` : "";
      const required = f.required ? " required" : "";
      let control: string;
      if (f.type === "textarea") {
        control = `<textarea id="${id}" name="${f.name}"${autocomplete} aria-describedby="${id}-error"${required} />`;
      } else if (f.type === "select") {
        const options = (f.options ?? []).map((o) => `<option>{\`${tsxEscape(o)}\`}</option>`).join("");
        control = `<select id="${id}" name="${f.name}" aria-describedby="${id}-error" defaultValue=""${required}><option value="">Choose</option>${options}</select>`;
      } else {
        const min = f.min !== undefined ? ` min={${f.min}}` : "";
        control = `<input id="${id}" name="${f.name}" type="${f.type}"${autocomplete}${min} aria-describedby="${id}-error"${required} />`;
      }
      return `${pad}    <p>${label}${control}${error}</p>`;
    })
    .join("\n");
  const notice = configured
    ? ""
    : `${pad}  <p id="${node.id}-endpoint" className="c-unavailable-notice" role="note">{\`${tsxEscape(c.unconfiguredNotice)}\`}</p>\n`;
  return `${pad}<form className="c-form" data-contract="${c.kind}" data-endpoint="${c.endpoint.state}"${target} aria-describedby="${describedBy}">\n${notice}${pad}  <fieldset${
    configured ? "" : " disabled"
  }>\n${pad}    <legend>{\`${tsxEscape(c.legend)}\`}</legend>\n${fields}\n${pad}    <p><button type="submit">{\`${tsxEscape(c.submitLabel)}\`}</button></p>\n${pad}  </fieldset>\n${pad}  <p id="${node.id}-status" className="c-form-status" role="status" aria-live="polite" />\n${pad}</form>`;
}

function jsxFor(node: ComponentNode, depth = 0, currentRoute = "/"): string {
  const pad = INDENT + "  ".repeat(depth);
  const children = (node.children ?? []).map((c) => jsxFor(c, depth + 1, currentRoute)).join("\n");
  const cls = `c-${node.kind.replace(/_/g, "-")}`;

  switch (node.kind) {
    case "site_header":
      return `${pad}<header className="${cls}">\n${children}\n${pad}</header>`;
    case "brand":
      // DD-096: verified logo file or typographic wordmark; never generated.
      return node.children && node.children.length > 0
        ? `${pad}<Link className="${cls}" href="/">\n${children}\n${pad}</Link>`
        : `${pad}<Link className="${cls}" href="/">{\`${tsxEscape(node.text ?? "")}\`}</Link>`;
    case "image":
      return imageJsx(node, pad);
    case "sticky_cta":
      return /^(mailto:|tel:|https:\/\/wa\.me\/)/.test(node.href ?? "")
        ? `${pad}<div className="${cls}"><a className="c-action" href={\`${tsxEscape(node.href ?? "")}\`}>{\`${tsxEscape(node.text ?? "")}\`}</a></div>`
        : `${pad}<div className="${cls}"><Link className="c-action" href="${node.href ?? "/"}">{\`${tsxEscape(node.text ?? "")}\`}</Link></div>`;
    case "action":
      // A contact link leaves the site, so it is a plain anchor rather than next/link.
      return /^(mailto:|tel:|https:\/\/wa\.me\/)/.test(node.href ?? "")
        ? `${pad}<a className="${cls}" href={\`${tsxEscape(node.href ?? "")}\`}>{\`${tsxEscape(node.text ?? "")}\`}</a>`
        : `${pad}<Link className="${cls}" href="${node.href ?? "/"}">{\`${tsxEscape(node.text ?? "")}\`}</Link>`;
    case "site_footer":
      return `${pad}<footer className="${cls}">\n${pad}  <nav aria-label="Footer"><ul>\n${(node.items ?? [])
        .map((i) => `${pad}    <li><Link href="${i.detail ?? "/"}">{\`${tsxEscape(i.text)}\`}</Link></li>`)
        .join("\n")}\n${pad}  </ul></nav>\n${pad}</footer>`;
    case "nav": {
      // DD-033: aria-current marks the page being rendered.
      const list = `<ul>\n${(node.items ?? [])
        .map(
          (i) =>
            `${pad}  <li><Link href="${i.detail ?? "/"}"${i.detail === currentRoute ? ' aria-current="page"' : ""}>{\`${tsxEscape(i.text)}\`}</Link></li>`,
        )
        .join("\n")}\n${pad}</ul>`;
      const compact = node.navCompact;
      if (!compact) return `${pad}<nav className="${cls}" aria-label="Primary">${list}</nav>`;
      // DD-034 (P1-4): the same native popover disclosure as the static layer.
      return `${pad}<nav className="${cls}" aria-label="Primary" data-nav-compact="${compact.mode}">\n${pad}  <button type="button" className="c-nav-toggle" popoverTarget="${compact.menuId}">Site menu</button>\n${pad}  <div id="${compact.menuId}" className="c-nav-menu" popover="auto">${list}\n${pad}  <button type="button" className="c-nav-close" popoverTarget="${compact.menuId}" popoverTargetAction="hide">Close menu</button></div>\n${pad}</nav>`;
    }
    case "hero": {
      const modifier = node.layout ? ` ${cls}--${node.layout}` : "";
      return `${pad}<section className="${cls}${modifier}" aria-labelledby="hero-h1">\n${children}\n${pad}</section>`;
    }
    case "heading": {
      const level = node.headingLevel ?? 2;
      const id = level === 1 ? ' id="hero-h1"' : "";
      return `${pad}<h${level}${id}>{\`${tsxEscape(node.text ?? "")}\`}</h${level}>`;
    }
    case "prose":
      return `${pad}<p className="${cls}">{\`${tsxEscape(node.text ?? "")}\`}</p>`;
    case "content_slot":
      return `${pad}<div className="${cls}" data-content-slot={\`${tsxEscape(
        node.needs ?? "",
      )}\`}><p>{\`${tsxEscape(node.text ?? "")}\`}</p></div>`;
    case "unavailable_notice":
      // FD-06: the same counted marker as the static layer.
      return `${pad}<div className="${cls}" role="note" data-content-unavailable={\`${tsxEscape(node.needs ?? "")}\`}><p>{\`${tsxEscape(node.text ?? "")}\`}</p></div>`;
    case "card_grid":
      return `${pad}<ul className="${cls}">\n${(node.items ?? [])
        .map(
          (i, index) =>
            `${pad}  <li key={${index}}><h3>{\`${tsxEscape(i.term ?? "")}\`}</h3>${
              i.text ? `<p>{\`${tsxEscape(i.text)}\`}</p>` : ""
            }${metaMarkupTsx(i.meta)}${i.pending ? pendingMarkerTsx(i.pending) : ""}</li>`,
        )
        .join("\n")}\n${pad}</ul>`;
    case "timeline":
      return `${pad}<ol className="${cls}">\n${(node.items ?? [])
        .map(
          (i, index) =>
            `${pad}  <li key={${index}}><h3>{\`${tsxEscape(i.term ?? "")}\`}</h3><p>{\`${tsxEscape(
              i.text,
            )}\`}</p></li>`,
        )
        .join("\n")}\n${pad}</ol>`;
    case "disclosure_group":
      // Native <details>: no client component, keyboard accessible by the platform.
      return `${pad}<div className="${cls}">\n${(node.items ?? [])
        .map(
          (i, index) =>
            `${pad}  <details key={${index}}><summary>{\`${tsxEscape(
              i.term ?? "",
            )}\`}</summary><div><p>{\`${tsxEscape(i.text)}\`}</p></div></details>`,
        )
        .join("\n")}\n${pad}</div>`;
    case "definition_list":
      return `${pad}<dl className="${cls}">\n${(node.items ?? [])
        .map(
          (i, index) =>
            i.detail && /^(mailto:|tel:|https:\/\/wa\.me\/)/.test(i.detail)
              ? `${pad}  <div key={${index}}><dt>{\`${tsxEscape(i.term ?? "")}\`}</dt><dd><a href={\`${tsxEscape(i.detail)}\`}>{\`${tsxEscape(i.text)}\`}</a></dd></div>`
              : `${pad}  <div key={${index}}><dt>{\`${tsxEscape(i.term ?? "")}\`}</dt><dd>${
                  i.pending ? pendingMarkerTsx(i.pending) : `{\`${tsxEscape(i.text)}\`}`
                }</dd></div>`,
        )
        .join("\n")}\n${pad}</dl>`;
    case "list":
      return `${pad}<ul className="${cls}">\n${(node.items ?? [])
        .map((i, index) => `${pad}  <li key={${index}}>{\`${tsxEscape(i.text)}\`}</li>`)
        .join("\n")}\n${pad}</ul>`;
    case "form":
      return formJsx(node, pad);
    case "contact_actions":
      // Plain anchors, not next/link: these leave the site for the visitor's own app.
      return `${pad}<ul className="c-contact-actions">\n${(node.contactLinks ?? [])
        .map(
          (l, index) =>
            `${pad}  <li key={${index}}><a className="c-action c-contact-action" href={\`${tsxEscape(l.href)}\`} data-contact="${l.kind}"><span>{\`${tsxEscape(l.actionLabel)}\`}</span> <span className="c-contact-value">{\`${tsxEscape(l.value)}\`}</span></a></li>`,
        )
        .join("\n")}\n${pad}</ul>`;
    case "experience": {
      const x = node.experience;
      if (!x) return "";
      if (x.definition.type === "comparison") {
        return `${pad}<section className="c-experience c-experience--comparison" data-experience="comparison" data-experience-id="${x.specId}" data-experience-mode="static">
${children}
${pad}</section>`;
      }
      // The SAME markup string the static layer serves, opaque to React: no hydration
      // inside it, so the runtime's enhancement cannot cause a mismatch.
      return `${pad}<div className="c-experience-host" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(experienceMarkup(node, ""))} }} />`;
    }
    case "comparison_table": {
      // Same semantics as the static layer: server-rendered, no client boundary.
      const t = node.table;
      if (!t) return "";
      const captionId = `${node.id}-caption`;
      const q = (text: string) => `{\`${tsxEscape(text)}\`}`;
      const head = `<thead><tr><th scope="col">${q(t.rowHeading)}</th>${t.columns.map((c) => `<th scope="col">${q(c)}</th>`).join("")}</tr></thead>`;
      const rows = t.rows
        .map((r, i) => `${pad}      <tr key={${i}}><th scope="row">${q(r.header)}</th>${r.cells.map((c) => `<td>${q(c)}</td>`).join("")}</tr>`)
        .join("\n");
      return `${pad}<div className="c-table-scroll" role="region" aria-labelledby="${captionId}" tabIndex={0}>\n${pad}  <table className="${cls}">\n${pad}    <caption id="${captionId}">${q(t.caption)}</caption>\n${pad}    ${head}\n${pad}    <tbody>\n${rows}\n${pad}    </tbody>\n${pad}  </table>\n${pad}</div>`;
    }
    case "gallery":
      // The ONLY client boundary. The server renders the declared fallback — the
      // full image grid — so the content is present before, and if, the
      // enhancement loads (DD-042, DD-043, DD-087: server component by default).
      return `${pad}<ProductGallery fallbackNote={\`${tsxEscape(node.noScriptBehaviour)}\`}>\n${(node.children ?? [])
        .map((c) => `${pad}  <li key="${c.id}">\n${imageJsx(c, `${pad}    `)}\n${pad}  </li>`)
        .join("\n")}\n${pad}</ProductGallery>`;
    default:
      return `${pad}<section className="${cls}">\n${children}\n${pad}</section>`;
  }
}

/** Next.js `metadata` export, built from the SEO artifacts that have values. */
function metadataFor(artifacts: PageSeoArtifacts): string {
  const lines: string[] = [];
  if (artifacts.title.value) lines.push(`  title: ${JSON.stringify(artifacts.title.value)},`);
  if (artifacts.metaDescription.value) {
    lines.push(`  description: ${JSON.stringify(artifacts.metaDescription.value)},`);
  } else {
    lines.push(
      `  // description: UNRESOLVED — ${artifacts.metaDescription.origin}. ${artifacts.metaDescription.source}`,
    );
  }
  if (artifacts.canonical.value) {
    lines.push(`  alternates: { canonical: ${JSON.stringify(artifacts.canonical.value)} },`);
  } else {
    lines.push(`  // alternates.canonical: UNRESOLVED — ${artifacts.canonical.source}`);
  }
  if (artifacts.robots.value) {
    const [index, follow] = artifacts.robots.value.split(",");
    lines.push(
      `  robots: { index: ${index === "index"}, follow: ${follow === "follow"} },`,
    );
  }
  const og: string[] = [];
  if (artifacts.openGraph.title.value) og.push(`    title: ${JSON.stringify(artifacts.openGraph.title.value)},`);
  if (artifacts.openGraph.type.value) og.push(`    type: ${JSON.stringify(artifacts.openGraph.type.value)},`);
  if (artifacts.openGraph.url.value) og.push(`    url: ${JSON.stringify(artifacts.openGraph.url.value)},`);
  if (og.length > 0) lines.push(`  openGraph: {\n${og.join("\n")}\n  },`);
  if (artifacts.twitter.card.value) {
    lines.push(`  twitter: { card: ${JSON.stringify(artifacts.twitter.card.value)} },`);
  }
  return `export const metadata: Metadata = {\n${lines.join("\n")}\n};`;
}

/** JSON-LD entities as a module constant; the served HTML must carry them (Q-SEO-ARTIFACTS). */
function jsonLdConst(entities: ReadonlyArray<Record<string, unknown>>): string {
  if (entities.length === 0) return "";
  return `const jsonLd = ${JSON.stringify(entities)};\n\n`;
}

function jsonLdJsx(entities: ReadonlyArray<Record<string, unknown>>): string {
  if (entities.length === 0) return "";
  return `${INDENT}{jsonLd.map((entity, index) => (\n${INDENT}  <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entity).replace(/</g, "\\\\u003c") }} />\n${INDENT}))}\n`;
}

export interface EmittedFiles {
  [path: string]: string;
}

export function emitNextApp(
  output: DesignDecisionOutput,
  model: ComponentModel,
  jsonLd: ReadonlyMap<string, ReadonlyArray<Record<string, unknown>>> = new Map(),
): EmittedFiles {
  const files: EmittedFiles = {};

  // ---- package.json: ONLY the libraries the stack decision approved.
  // Exactly the declared runtime set (stack/runtime-packages.ts). A descriptive
  // entry such as "lazy-loaded map embed" is an instruction, not a package, and
  // is recorded in the README instead of being invented as a dependency.
  // P1-6: the ADMITTED set, never the stack's proposal.
  const dependencies = output.dependencyAdmission.admitted;
  files["package.json"] = `${JSON.stringify(
    {
      name: "generated-website",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies,
    },
    null,
    2,
  )}\n`;

  // ---- A README recording WHY the stack looks like this. The omissions matter
  // as much as the inclusions, and a future maintainer needs the reason.
  files["README.md"] = [
    "# Generated website",
    "",
    "GENERATED from a framework decision output. Do not hand-edit; change the",
    "business input or the decision rules and regenerate.",
    "",
    `- Framework: ${output.stack.framework} (${output.stack.recordedRule})`,
    `- Rendering: ${output.stack.renderingStrategy}`,
    `- PWA: ${output.stack.pwaConstraintEnabled ? "enabled as a stated product requirement" : "DENIED — not requested"}`,
    "",
    "## Dependency admission (proposal × generated consumer × dependency gate)",
    ...output.dependencyAdmission.entries.map((e) => `- \`${e.package}\` ${e.status}: ${e.reason}`),
    "",
    "## Dependencies deliberately OMITTED by the stack",
    ...output.stack.omittedLibraries.map((o) => `- \`${o.library}\` (${o.requirement}): ${o.because}`),
    "",
    "## Architectural constraints",
    ...output.stack.architecturalConstraints.map((c) => `- ${c}`),
    "",
    "## Framework-required client boundary",
    "- `app/error.tsx`: Next.js requires error boundaries to be client components",
    "",
    "## Client boundaries",
    ...(model.clientBoundaries.length > 0
      ? model.clientBoundaries.map((b) => `- ${b.page} \`${b.nodeId}\`: ${b.because}`)
      : ["- none: every node renders on the server"]),
    "",
  ].join("\n");

  // ---- Root layout. The experience runtime loads site-wide when ANY page has an
  // interactive experience: Next's client-side navigation inserts a page without
  // re-running page-level scripts, and the runtime's observer enhances it.
  const siteNeedsRuntime = model.pages.some((p) => pageNeedsExperienceRuntime(p.nodes));
  if (siteNeedsRuntime) files[`public${EXPERIENCE_RUNTIME_PATH}`] = EXPERIENCE_RUNTIME_FILE;
  files["app/layout.tsx"] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(output.profile.businessName)},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="c-skip" href="#main">Skip to content</a>
        <main id="main">{children}</main>${siteNeedsRuntime ? `
        <script src="${EXPERIENCE_RUNTIME_PATH}" defer></script>` : ""}
      </body>
    </html>
  );
}
`;

  // ---- One page per route in the page model. No page is reduced to a count.
  for (const pageModel of model.pages) {
    const artifacts = output.seoArtifacts.pages.find((p) => p.route === pageModel.page.route);
    if (!artifacts) continue;
    const route = pageModel.page.route;
    const dir = route === "/" ? "app" : `app${route}`;
    const usesGallery = pageModel.nodes.some((n) => nodeTreeHasGallery(n));
    const usesImage = pageModel.nodes.some((n) => nodeTreeHas(n, "image"));
    // The shared component folder sits at app/_components; nested routes need
    // one "../" per route segment. A root page imports from "./".
    const depth = route.split("/").filter(Boolean).length;
    const componentsPath = depth === 0 ? "./_components" : `${"../".repeat(depth)}_components`;

    const trace = [
      "/**",
      " * GENERATED — traceable to these decisions:",
      ` *   route:      ${route}`,
      ` *   purpose:    ${pageModel.page.purpose}`,
      ` *   objective:  ${pageModel.page.primaryObjective}`,
      ` *   audience:   ${pageModel.page.audience.join(", ")}`,
      ` *   seoRole:    ${pageModel.page.seoRole}`,
      ` *   sections:   ${pageModel.page.requiredSections.join(", ")}`,
      ` *   conversion: ${pageModel.page.conversionRole}`,
      ...(pageModel.page.trustRequirements.length > 0
        ? [` *   trust:      ${pageModel.page.trustRequirements.join(", ")}`]
        : []),
      ...(pageModel.refusals.length > 0
        ? [" * NOT rendered, deliberately:", ...pageModel.refusals.map((r) => ` *   - ${r.section}: ${r.reason}`)]
        : []),
      " */",
    ].join("\n");

    files[`${dir}/page.tsx`] = `${trace}
import type { Metadata } from "next";
import Link from "next/link";
${usesImage ? 'import Image from "next/image";\n' : ""}${usesGallery ? `import { ProductGallery } from "${componentsPath}/ProductGallery";\n` : ""}
${metadataFor(artifacts)}

${jsonLdConst(jsonLd.get(route) ?? artifacts.structuredDataEntities.value ?? [])}export default function Page() {
  return (
    <>
${jsonLdJsx(jsonLd.get(route) ?? artifacts.structuredDataEntities.value ?? [])}${pageModel.nodes.map((n) => jsxFor(n, 0, route)).join("\n")}
    </>
  );
}
`;
  }

  files["app/globals.css"] = '@import url("../styles.css");\n';

  // ---- §L.1 states. not-found mirrors the static layer's 404.html; the marker
  // lets a host PROVE the 404 it served is this page, not a platform default.
  files["app/not-found.tsx"] = `import Link from "next/link";

export default function NotFound() {
  return (
    <section ${NOT_FOUND_MARKER} aria-labelledby="hero-h1">
      <h1 id="hero-h1">Page not found</h1>
      <p>
        <Link href="/">Return to the home page</Link>
      </p>
    </section>
  );
}
`;
  // error.tsx MUST be a client component (a Next.js framework requirement, not
  // a design choice). It is recorded as a framework-required boundary in the README.
  files["app/error.tsx"] = `"use client";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section data-framework-state="error" aria-labelledby="hero-h1">
      <h1 id="hero-h1">Something went wrong</h1>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
      <p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </p>
    </section>
  );
}
`;
  files["app/loading.tsx"] = `export default function Loading() {
  return (
    <p role="status" data-framework-state="loading">
      Loading
    </p>
  );
}
`;

  // ---- Form contracts: zod schemas only when zod is ADMITTED; otherwise the same
  // contracts as data, so an endpoint author still has them and nothing imports zod.
  const contracts: FormContract[] = [];
  for (const pageModel of model.pages) {
    const visit = (n: ComponentNode): void => {
      if (n.form) contracts.push(n.form);
      for (const c of n.children ?? []) visit(c);
    };
    for (const n of pageModel.nodes) visit(n);
  }
  if (contracts.length > 0 && "zod" in dependencies) {
    files["app/_forms/contracts.ts"] = schemaModule(contracts);
  } else if (contracts.length > 0) {
    const unique = [...new Map(contracts.map((c) => [c.kind, c])).values()];
    files["forms/contracts.json"] = `${JSON.stringify({ note: "GENERATED form contracts as data: zod is not admitted, so no schema module is emitted. A host endpoint must validate these fields server-side.", contracts: unique }, null, 2)}\n`;
  }

  // ---- The one client component, emitted only if a node needs it.
  if (model.clientBoundaries.length > 0) {
    files["app/_components/ProductGallery.tsx"] = `"use client";

/**
 * THE ONLY CLIENT BOUNDARY in this site, and it is a LEAF.
 *
 * Justified by: ${model.clientBoundaries.map((b) => b.because).join(" | ")}
 *
 * Progressive enhancement (§10): the server already rendered every image in a
 * plain grid. This component upgrades that grid to a keyboard-navigable viewer.
 * If it never loads, the grid remains complete and usable — no content lives only
 * here.
 */
import { useState } from "react";

export function ProductGallery({ fallbackNote, children }: { fallbackNote: string; children?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <div className="c-gallery" data-enhanced="true">
      <p className="c-pending">{fallbackNote}</p>
      <ul className="c-gallery-grid">
        {/* Images arrive from verified product assets (server-rendered); none are generated. */}
        {children}
      </ul>
      <p>
        <button type="button" onClick={() => setActive((n) => Math.max(0, n - 1))}>
          Previous
        </button>{" "}
        <button type="button" onClick={() => setActive((n) => n + 1)}>
          Next
        </button>
      </p>
      <p aria-live="polite">Item {active + 1}</p>
    </div>
  );
}
`;
  }

  return files;
}

function nodeTreeHasGallery(node: ComponentNode): boolean {
  return nodeTreeHas(node, "gallery");
}

function nodeTreeHas(node: ComponentNode, kind: ComponentNode["kind"]): boolean {
  if (node.kind === kind) return true;
  return (node.children ?? []).some((c) => nodeTreeHas(c, kind));
}
