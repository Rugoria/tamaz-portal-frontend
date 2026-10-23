// Lists the English strings used in the given source files that have no translation yet.
// Usage (from the repository root): node scripts/extract-new-strings.mjs file1.tsx file2.tsx ...
import fs from "node:fs";

const files = process.argv.slice(2);
const src = new Set(JSON.parse(fs.readFileSync("messages/sources.json", "utf8")).map((s) => s.replaceAll("&apos;", "'")));
const tsv = new Set(fs.readFileSync("messages/translations.tsv", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("|")[0]));
const found = new Set();
const q = String.fromCharCode(34);
const bt = String.fromCharCode(96);
const grab = (re, s) => { for (const m of s.matchAll(re)) found.add(m[1]); };
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  grab(new RegExp("\\b(?:t|translate)\\(\\s*" + q + "((?:[^" + q + "\\\\]|\\\\.)*)" + q, "g"), s);
  grab(new RegExp("\\b(?:t|translate)\\(\\s*" + bt + "((?:[^" + bt + "\\\\]|\\\\.)*)" + bt, "g"), s);
  grab(new RegExp("(?:label|title|emptyTitle|emptyText|header|text|hint|name):\\s*" + q + "([A-Z][^" + q + "]{2,})" + q, "g"), s);
  grab(new RegExp("(?:label|title|emptyTitle|emptyText|text|hint|placeholder|searchPlaceholder)=" + q + "([A-Z][^" + q + "{}]{2,})" + q, "g"), s);
}
const missing = [...found].filter((x) => !src.has(x) && !tsv.has(x) && x.trim() && !x.includes("${")).sort();
console.log(missing.length);
console.log(missing.join("\n"));
