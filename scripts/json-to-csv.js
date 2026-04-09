#!/usr/bin/env node
/**
 * Generate translations.csv from src/lib/i18n/*.json
 * Columns: internal_name, czech, english, french, spanish
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(__dirname, '../apps/web-react/src/lib/i18n');
const en = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf8'));
const cz = JSON.parse(fs.readFileSync(path.join(i18nDir, 'cz.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(i18nDir, 'fr.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(i18nDir, 'es.json'), 'utf8'));

function escapeCsv(val) {
	if (val == null) return '""';
	const s = String(val);
	if (/[",\n\r]/.test(s)) {
		return '"' + s.replace(/"/g, '""') + '"';
	}
	return '"' + s + '"';
}

const keys = Object.keys(en).sort();
const header = 'internal_name,czech,english,french,spanish';
const rows = [header];

for (const key of keys) {
	const row = [key, cz[key] ?? '', en[key] ?? '', fr[key] ?? '', es[key] ?? '']
		.map(escapeCsv)
		.join(',');
	rows.push(row);
}

const csv = rows.join('\n');
fs.writeFileSync(path.join(__dirname, '../translations.csv'), csv, 'utf8');
console.log('Wrote translations.csv with', keys.length, 'rows');
