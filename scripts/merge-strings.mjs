// Appends new translation rows (source|ar|fr|es) to frontend/messages/translations.tsv, skipping sources that already
// have a row and rows that are listed twice. Usage (from the repository root): node scripts/merge-strings.mjs messages/new-grid-strings.tsv
import fs from "node:fs";

const [, , extra] = process.argv;
const target = "messages/translations.tsv";
const existing = fs.readFileSync(target, "utf8");
const have = new Set(existing.split(/\r?\n/).filter(Boolean).map((l) => l.split("|")[0]));
const add = [];
const skipped = [];
for (const line of fs.readFileSync(extra, "utf8").split(/\r?\n/).filter(Boolean)) {
  const row = line.split("|");
  if (row.length !== 4) throw new Error(`Expected 4 columns: ${line}`);
  if (have.has(row[0])) { skipped.push(row[0]); continue; }
  have.add(row[0]);
  add.push(line);
}
fs.writeFileSync(target, existing.replace(/\s*$/, "\n") + add.join("\n") + "\n");
console.log(`added ${add.length}, skipped ${skipped.length}: ${skipped.join(" / ")}`);
