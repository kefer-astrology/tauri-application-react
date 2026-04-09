/**
 * Build i18n JSON from translations.csv (internal_name → per-locale strings).
 *
 * Single source of truth: repo root `translations.csv` (e.g. export from Google Sheets).
 * Writes the same locale files to every path below so React, Svelte, etc. stay aligned.
 *
 * Run: npm run i18n:sync   (or: node scripts/csv-to-locales.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'translations.csv');

/** Each frontend’s `src/.../locales` (or equivalent) — add new apps here. */
const localeOutputDirs = [
	path.join(root, 'apps', 'web-react', 'src', 'locales')
	// path.join(root, 'apps', 'web-svelte', 'src', 'lib', 'locales'),
];

function parseLine(line) {
	const cells = [];
	let cur = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (c === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes && c === ',') {
			cells.push(cur);
			cur = '';
			continue;
		}
		cur += c;
	}
	cells.push(cur);
	return cells;
}

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
const header = parseLine(lines[0]);
const idx = {
	key: header.indexOf('internal_name'),
	cs: header.indexOf('czech'),
	en: header.indexOf('english'),
	fr: header.indexOf('french'),
	es: header.indexOf('spanish')
};
if (idx.key < 0 || idx.cs < 0 || idx.en < 0 || idx.fr < 0 || idx.es < 0) {
	throw new Error(
		'translations.csv: expected columns internal_name, czech, english, french, spanish'
	);
}

const bundles = { cs: {}, en: {}, fr: {}, es: {} };

for (let r = 1; r < lines.length; r++) {
	const cells = parseLine(lines[r]);
	const key = (cells[idx.key] ?? '').trim();
	if (!key) continue;
	bundles.cs[key] = cells[idx.cs] ?? '';
	bundles.en[key] = cells[idx.en] ?? '';
	bundles.fr[key] = cells[idx.fr] ?? '';
	bundles.es[key] = cells[idx.es] ?? '';
}

for (const outDir of localeOutputDirs) {
	fs.mkdirSync(outDir, { recursive: true });
	for (const [lng, obj] of Object.entries(bundles)) {
		const p = path.join(outDir, `${lng}.json`);
		fs.writeFileSync(p, JSON.stringify(obj, null, '\t') + '\n', 'utf8');
		console.log('wrote', path.relative(root, p), Object.keys(obj).length, 'keys');
	}
}
