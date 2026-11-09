#!/usr/bin/env node
// Static site build for the Polycrisis Resilience Series.
// Reads reports/<slug>/report.json (+ PDF, cover) and writes the site to dist/.
// No dependencies: runs on any Node >= 18 (Cloudflare Pages default build image included).

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, stripTags, truncate, parseDate, doiUrl, bibtex, ris } from './lib.mjs';
import { reportPage, homePage, archivePage, archivePath, notFoundPage } from './templates.mjs';
import { conceptPage, CONCEPT_PATH } from './concept.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const OUT = path.join(ROOT, 'dist');
const FILES_DIR = path.join(ROOT, 'files');

const readJson = async (p) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (e) {
    throw new Error(`Could not parse ${path.relative(ROOT, p)}: ${e.message}`);
  }
};

const write = async (rel, content) => {
  const p = path.join(OUT, rel);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, content);
};

const sizeLabel = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

// Reads width/height from a JPEG or PNG header so <img> tags reserve space.
async function imageSize(file) {
  const buf = await readFile(file);
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return {};
}

async function loadSite() {
  const site = await readJson(path.join(ROOT, 'site.config.json'));
  site.siteUrl = (process.env.SITE_URL || site.siteUrl).replace(/\/+$/, '');
  if (!site.publisher.url) site.publisher.url = site.siteUrl;
  // Listing sizes: reports on the home page, per archive page, and in the Atom feed.
  site.listing = { homeCount: 10, perPage: 25, feedCount: 50, ...(site.listing || {}) };
  return site;
}

async function loadReports(site) {
  const entries = existsSync(REPORTS_DIR) ? await readdir(REPORTS_DIR, { withFileTypes: true }) : [];
  const reports = [];
  const errors = [];

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('_') || ent.name.startsWith('.')) continue;
    const slug = ent.name;
    const dir = path.join(REPORTS_DIR, slug);
    const jsonPath = path.join(dir, 'report.json');
    if (!existsSync(jsonPath)) {
      errors.push(`reports/${slug}: missing report.json`);
      continue;
    }
    const r = await readJson(jsonPath);
    if (r.draft) {
      console.log(`  skip  ${slug} (draft)`);
      continue;
    }

    const problems = [];
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) problems.push('folder name must be lowercase-words-with-hyphens');
    if (slug === 'page') problems.push('folder name "page" is reserved for the paginated archive (/reports/page/N/)');
    if (!r.title) problems.push('"title" is required');
    if (!parseDate(r.datePublished)) problems.push('"datePublished" must be YYYY-MM-DD');
    if (!Array.isArray(r.authors) || !r.authors.length || r.authors.some((a) => !a.name)) problems.push('"authors" needs at least one { "name": ... }');
    if (!r.abstract && !r.description) problems.push('"abstract" or "description" is required');
    if (!r.pdf || !existsSync(path.join(dir, r.pdf))) problems.push(`PDF "${r.pdf}" not found in folder`);
    if (r.cover && !existsSync(path.join(dir, r.cover))) problems.push(`cover "${r.cover}" not found in folder`);
    if (r.doi && /^https?:/.test(r.doi)) problems.push('"doi" should be the bare DOI (10.xxxx/...), not a URL');
    if (problems.length) {
      errors.push(...problems.map((p) => `reports/${slug}: ${p}`));
      continue;
    }

    r.slug = slug;
    r.srcDir = dir;
    r.path = `/reports/${slug}/`;
    r.url = `${site.siteUrl}${r.path}`;
    r.pdfFile = `${slug}.pdf`;
    r.pdfPath = `${r.path}${r.pdfFile}`;
    r.pdfUrl = `${site.siteUrl}${r.pdfPath}`;
    const pdfBytes = (await stat(path.join(dir, r.pdf))).size;
    r.pdfSize = `${pdfBytes} B`;
    r.pdfSizeLabel = sizeLabel(pdfBytes);
    r.bibPath = `${r.path}${slug}.bib`;
    r.risPath = `${r.path}${slug}.ris`;
    r.bibUrl = `${site.siteUrl}${r.bibPath}`;
    r.risUrl = `${site.siteUrl}${r.risPath}`;
    if (r.cover) {
      r.coverFile = `cover${path.extname(r.cover).toLowerCase()}`;
      r.coverPath = `${r.path}${r.coverFile}`;
      r.coverUrl = `${site.siteUrl}${r.coverPath}`;
      const dim = await imageSize(path.join(dir, r.cover));
      r.coverWidth = dim.width;
      r.coverHeight = dim.height;
    }
    const paras = Array.isArray(r.abstract) ? r.abstract : [r.abstract || r.description];
    r.abstractText = paras.map(stripTags).join('\n\n');
    r.description = r.description || truncate(stripTags(paras[0]), 160);
    reports.push(r);
  }

  if (errors.length) {
    console.error('\nReport metadata problems:\n' + errors.map((e) => `  ✗ ${e}`).join('\n') + '\n');
    process.exit(1);
  }

  const nums = reports.filter((r) => r.seriesNumber).map((r) => r.seriesNumber);
  const dup = nums.find((n, i) => nums.indexOf(n) !== i);
  if (dup) {
    console.error(`\nTwo reports share seriesNumber ${dup}.\n`);
    process.exit(1);
  }

  // Newest first.
  reports.sort((a, b) => b.datePublished.localeCompare(a.datePublished) || (b.seriesNumber || 0) - (a.seriesNumber || 0));
  return reports;
}

const xmlEsc = esc;

const pageCount = (reports, site) => Math.max(1, Math.ceil(reports.length / site.listing.perPage));

function sitemap(reports, site) {
  const latest = reports[0]?.dateModified || reports[0]?.datePublished;
  const archive = Array.from({ length: pageCount(reports, site) }, (_, i) => ({ loc: `${site.siteUrl}${archivePath(i + 1)}`, lastmod: latest, priority: '0.8' }));
  const urls = [
    { loc: `${site.siteUrl}/`, lastmod: latest, priority: '1.0' },
    { loc: `${site.siteUrl}${CONCEPT_PATH}`, lastmod: latest, priority: '0.9' },
    ...archive,
    ...reports.map((r) => ({ loc: r.url, lastmod: r.dateModified || r.datePublished, priority: '0.9' })),
    ...reports.map((r) => ({ loc: r.pdfUrl, lastmod: r.dateModified || r.datePublished, priority: '0.7' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

function feed(allReports, site) {
  // The Atom feed carries the newest reports only; reports.json is the complete catalog.
  const reports = allReports.slice(0, site.listing.feedCount);
  const updated = `${reports[0]?.dateModified || reports[0]?.datePublished || new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEsc(site.series.name)}</title>
  <subtitle>${xmlEsc(site.tagline)}</subtitle>
  <link href="${xmlEsc(site.siteUrl)}/feed.xml" rel="self"/>
  <link href="${xmlEsc(site.siteUrl)}/"/>
  <id>${xmlEsc(site.siteUrl)}/</id>
  <updated>${updated}</updated>
  <author><name>${xmlEsc(site.publisher.name)}</name></author>
${reports
  .map(
    (r) => `  <entry>
    <title>${xmlEsc(r.title)}</title>
    <link href="${xmlEsc(r.url)}"/>
    <link rel="enclosure" type="application/pdf" href="${xmlEsc(r.pdfUrl)}"/>
    <id>${xmlEsc(r.doi ? doiUrl(r.doi) : r.url)}</id>
    <published>${r.datePublished}T00:00:00Z</published>
    <updated>${r.dateModified || r.datePublished}T00:00:00Z</updated>
${r.authors.map((a) => `    <author><name>${xmlEsc(a.name)}</name></author>`).join('\n')}
    <summary>${xmlEsc(r.abstractText.split('\n\n')[0])}</summary>
${(r.keywords || []).map((k) => `    <category term="${xmlEsc(k)}"/>`).join('\n')}
  </entry>`,
  )
  .join('\n')}
</feed>
`;
}

function catalog(reports, site) {
  return JSON.stringify(
    {
      series: site.series.name,
      publisher: site.publisher.name,
      url: `${site.siteUrl}/`,
      generated: new Date().toISOString(),
      reports: reports.map((r) => ({
        seriesNumber: r.seriesNumber,
        slug: r.slug,
        title: r.title,
        subtitle: r.subtitle,
        type: r.type,
        authors: r.authors.map(({ name, affiliation, orcid }) => ({ name, affiliation, orcid })),
        datePublished: r.datePublished,
        dateModified: r.dateModified || r.datePublished,
        doi: r.doi,
        doiUrl: r.doi ? doiUrl(r.doi) : undefined,
        url: r.url,
        pdf: r.pdfUrl,
        bibtex: r.bibUrl,
        ris: r.risUrl,
        license: r.license?.url,
        keywords: r.keywords,
        description: r.description,
        abstract: r.abstractText,
      })),
    },
    null,
    2,
  );
}

function headers(reports, site) {
  const blocks = [
    `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN`,
    `/assets/*
  Cache-Control: public, max-age=86400`,
    // Standalone PDFs open in the browser tab rather than downloading.
    `/files/*.pdf
  Content-Type: application/pdf
  Content-Disposition: inline
  Cache-Control: public, max-age=86400`,
    `/*.bib
  Content-Type: application/x-bibtex; charset=utf-8`,
    `/*.ris
  Content-Type: application/x-research-info-systems; charset=utf-8`,
  ];
  // FAIR Signposting (https://signposting.org) as HTTP Link headers.
  for (const r of reports) {
    const landing = [
      r.doi && `<${doiUrl(r.doi)}>; rel="cite-as"`,
      `<${r.pdfUrl}>; rel="item"; type="application/pdf"`,
      `<${r.bibUrl}>; rel="describedby"; type="application/x-bibtex"`,
      r.license?.url && `<${r.license.url}>; rel="license"`,
      `<https://schema.org/ScholarlyArticle>; rel="type"`,
    ].filter(Boolean);
    blocks.push(`${r.path}
  Link: ${landing.join(', ')}`);
    blocks.push(`${r.pdfPath}
  Link: <${r.url}>; rel="collection"${r.doi ? `, <${doiUrl(r.doi)}>; rel="cite-as"` : ''}
  Content-Disposition: inline; filename="${r.pdfFile}"
  Cache-Control: public, max-age=86400`);
  }
  return blocks.join('\n\n') + '\n';
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#16365c"/><g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"><path d="M6 14C30 14 40 30 58 32"/><path d="M6 50C30 50 40 34 58 32"/><path d="M6 22C30 22 40 31 58 32"/><path d="M6 42C30 42 40 33 58 32"/></g><path d="M6 32.5C26 33 42 32.5 58 32" stroke="#e3a23b" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;

async function main() {
  const t0 = Date.now();
  const site = await loadSite();
  const reports = await loadReports(site);
  // Version asset URLs by content so CSS/JS changes bypass browser and CDN caches.
  const { createHash } = await import('node:crypto');
  const assetHash = createHash('sha256');
  for (const f of ['src/styles.css', 'src/site.js']) assetHash.update(await readFile(path.join(ROOT, f)));
  site.assetVersion = assetHash.digest('hex').slice(0, 10);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // Static assets
  await mkdir(path.join(OUT, 'assets'), { recursive: true });
  await copyFile(path.join(ROOT, 'src/styles.css'), path.join(OUT, 'assets/styles.css'));
  await copyFile(path.join(ROOT, 'src/site.js'), path.join(OUT, 'assets/site.js'));
  await write('favicon.svg', favicon);
  // Standalone files (e.g. briefs linked from the footer) are copied as-is to /files/.
  if (existsSync(FILES_DIR)) await cp(FILES_DIR, path.join(OUT, 'files'), { recursive: true });

  // Report pages (reports are newest-first; "previous" = older)
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const outDir = path.join('reports', r.slug);
    await mkdir(path.join(OUT, outDir), { recursive: true });
    await copyFile(path.join(r.srcDir, r.pdf), path.join(OUT, outDir, r.pdfFile));
    if (r.cover) await copyFile(path.join(r.srcDir, r.cover), path.join(OUT, outDir, r.coverFile));
    await write(path.join(outDir, `${r.slug}.bib`), bibtex(r, site));
    await write(path.join(outDir, `${r.slug}.ris`), ris(r, site));
    await write(path.join(outDir, 'index.html'), reportPage(r, site, { prev: reports[i + 1], next: reports[i - 1] }));
    console.log(`  built ${r.path}`);
  }

  await write('index.html', homePage(reports, site));
  // Paginated archive of every report: /reports/, /reports/page/2/, ...
  const pages = pageCount(reports, site);
  for (let p = 1; p <= pages; p++) {
    await write(path.join(archivePath(p).slice(1), 'index.html'), archivePage(reports, site, { page: p, pages }));
  }
  await write(path.join(CONCEPT_PATH.slice(1), 'index.html'), conceptPage(reports, site));
  await write('404.html', notFoundPage(site));
  await write('sitemap.xml', sitemap(reports, site));
  await write('feed.xml', feed(reports, site));
  await write('reports.json', catalog(reports, site));
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
  await write('_headers', headers(reports, site));

  console.log(`\n✓ ${reports.length} report(s), ${pages} archive page(s) → dist/ in ${Date.now() - t0} ms (site URL: ${site.siteUrl})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
