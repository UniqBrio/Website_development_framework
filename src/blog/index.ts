/**
 * BLOG BRANCH — optional, and inert unless a blog manifest is supplied.
 *
 * Nothing in `runPipeline()` or `generateWebsite()` imports this module; a site
 * built without a blog is byte-for-byte what it was before this branch existed.
 * Process: website_workflow/blog_publishing.md.
 */
export { BLOG_MANIFEST_SCHEMA, blogManifestSchema, parseBlogManifest, checkBlogIntegrity, walkBlocks, plainText, ASSET_KINDS, ASSET_ROLES, PLACEMENT_BASES } from "./manifest.js";
export type { BlogManifest, Blog, Block, Inline, BlogAsset, BlogIssue, BlogSection, Placement } from "./manifest.js";
export { mapBlogToPage, publishedAssetName } from "./map.js";
export type { BlogPage, BlogSiteContext, MappingRow } from "./map.js";
export { renderArticle, toHtml, toJsx } from "./render.js";
export { blogCss } from "./css.js";
export { validateBlog, renderReportMarkdown, visibleText } from "./validate.js";
export type { ValidationReport, Check, CheckStatus } from "./validate.js";
export { publishBlog, approvalProblems, blogDigest, renderBlogDocument, addToSitemap } from "./publish.js";
export type { ApprovalRecord, Publication, PublishedPost, SiteChrome } from "./publish.js";
export { previewRun, approveRun, publishRun, rollbackRun, recoverInterruptedPublish, previewedCurrentVersion, evaluateBlog, loadManifest, readApproval } from "./run.js";
export type { RunOptions, ApproveOptions, PublishOptions, PreviewResult, PublishResult, RollbackResult } from "./run.js";
export { detectSite, normaliseRouteBase, renderSiteProfileMarkdown, BLOG_GENERATOR, REGISTRY_FILE } from "./site.js";
export type { SiteProfile, SiteKind } from "./site.js";
export { safeHref } from "./render.js";
