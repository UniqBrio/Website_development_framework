// Type declaration for extract-menu.mjs, so the TypeScript tests can import it under `tsc --noEmit`.
export declare const RAW_MENU: string;
export declare function extractMenu(path?: string): {
  source: { file: string; sha256: string; bytes: number; packageMetadata: Record<string, string | null> };
  extraction: { method: string; hiddenContentChecked: Array<{ tag: string; occurrences: number }> };
  elements: Array<Record<string, unknown>>;
  menu: { header: string[]; rows: Array<{ locator: string; sourceNumber: string; item: string; price: string; category: string; flags: Array<{ code: string; note: string }> }> };
  filters: { categoryFilterLabel: string | null; listItems: Array<{ locator: string; text: string }> };
};
