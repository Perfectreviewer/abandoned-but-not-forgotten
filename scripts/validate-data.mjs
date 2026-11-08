// Build-time data check (FR-02 and the data rules in PRD section 7).
// - Every record must match object.schema.json, including sources[] and verifiedBy.
// - Extra rules the schema cannot express: mission text of 80 words or fewer,
//   unique ids, year matches date, checker differs from writer, and only the
//   epilogue may sit outside the Moon and Mars.
// - With --strict (run before the final submission), any record whose checker
//   is still "PENDING" fails the build.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const strict = process.argv.includes('--strict');
const schema = JSON.parse(readFileSync(here('./object.schema.json'), 'utf8'));
const data = JSON.parse(readFileSync(here('../src/data/objects.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];
const warnings = [];

if (!validate(data)) {
  for (const e of validate.errors) {
    const idx = e.instancePath.split('/')[1];
    const who = data[idx]?.id ?? `item ${idx}`;
    errors.push(`${who}: ${e.instancePath} ${e.message}`);
  }
}

const seen = new Set();
for (const o of Array.isArray(data) ? data : []) {
  if (seen.has(o.id)) errors.push(`${o.id}: duplicate id`);
  seen.add(o.id);

  const words = (o.mission ?? '').trim().split(/\s+/).length;
  if (words > 80) errors.push(`${o.id}: mission text is ${words} words (max 80)`);

  if (o.date && o.year && Number(o.date.slice(0, 4)) !== o.year)
    errors.push(`${o.id}: year ${o.year} does not match date ${o.date}`);

  const v = o.verifiedBy ?? {};
  if (v.checker && v.writer && v.checker.trim().toLowerCase() === v.writer.trim().toLowerCase())
    errors.push(`${o.id}: checker must be a different person from the writer`);
  if (v.checker === 'PENDING')
    (strict ? errors : warnings).push(`${o.id}: facts not yet checked by a second teammate (verifiedBy.checker is PENDING)`);

  if (!o.epilogue && !['moon', 'mars'].includes(o.location))
    errors.push(`${o.id}: core objects must be on the Moon or Mars (set epilogue: true otherwise)`);
}

for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nData check failed: ${errors.length} error(s).`);
  process.exit(1);
}
console.log(
  `Data check passed: ${data.length} objects` +
    (warnings.length ? `, ${warnings.length} warning(s)` : '') +
    (strict ? ' (strict)' : '') +
    '.',
);
