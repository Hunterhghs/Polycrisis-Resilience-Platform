#!/usr/bin/env node
// Scaffold a new report folder:  npm run new -- my-report-slug [path/to/report.pdf]
// Copies the template, fills in the next series number and today's date, copies the PDF,
// and (on macOS/Linux with poppler installed) renders page 1 as cover.jpg.
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, pdf] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: npm run new -- <lowercase-slug-with-hyphens> [path/to/report.pdf]');
  process.exit(1);
}
const dir = path.join(ROOT, 'reports', slug);
if (existsSync(dir)) {
  console.error(`reports/${slug} already exists`);
  process.exit(1);
}

let maxNum = 0;
for (const d of await readdir(path.join(ROOT, 'reports'), { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  try {
    const r = JSON.parse(await readFile(path.join(ROOT, 'reports', d.name, 'report.json'), 'utf8'));
    maxNum = Math.max(maxNum, r.seriesNumber || 0);
  } catch {}
}

const tpl = JSON.parse(await readFile(path.join(ROOT, 'reports/_template/report.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
Object.assign(tpl, { seriesNumber: maxNum + 1, datePublished: today, dateModified: today });
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'report.json'), JSON.stringify(tpl, null, 2) + '\n');
console.log(`Created reports/${slug}/report.json (series No. ${maxNum + 1}, draft)`);

if (pdf) {
  await copyFile(pdf, path.join(dir, 'report.pdf'));
  console.log('Copied PDF → report.pdf');
  try {
    execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=85', '-r', '110', '-f', '1', '-l', '1', '-singlefile', 'report.pdf', 'cover'], { cwd: dir });
    console.log('Rendered cover.jpg from page 1');
  } catch {
    console.log('Could not render cover (install poppler: brew install poppler). Add cover.jpg manually.');
  }
}
console.log('\nNext: fill in report.json, remove "draft": true, then `npm run build`.');
