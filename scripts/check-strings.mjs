// Prints which of the given strings (one per line on stdin) have no translation yet.
// Usage (from the repository root): node scripts/check-strings.mjs < list.txt
import fs from "node:fs";

const src = new Set(JSON.parse(fs.readFileSync("messages/sources.json", "utf8")).map((s) => s.replaceAll("&apos;", "'")));
const tsv = new Set(fs.readFileSync("messages/translations.tsv", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("|")[0]));
const lines = fs.readFileSync(0, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
for (const l of lines) console.log((tsv.has(l) ? "TSV  " : src.has(l) ? "SRC  " : "NEW  ") + l);
