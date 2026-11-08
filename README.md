# Polycrisis Resilience Platform

Static website for the **H Heuristics Polycrisis Resilience Series**. Each report gets its own
landing page with full scholarly metadata so it can be indexed by Google Scholar, Google Search,
Zotero/Mendeley, and other harvesters.

No dependencies: a single Node script (`src/build.mjs`) turns the `reports/` folder into a static site in `dist/`.

## Deploy on Cloudflare Pages

Workers & Pages → Create → Pages → Connect to Git → choose this repository, then:

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | None            |
| Build command          | `npm run build` |
| Build output directory | `dist`          |

Every push to `main` rebuilds and redeploys the site.

**Set the site URL.** Canonical links, `citation_pdf_url`, the sitemap and the feed all need the
public address. Edit `siteUrl` in `site.config.json` (default
`https://polycrisisresilience.hheuristics.com`), or set a `SITE_URL` environment variable in the
Cloudflare Pages project settings, which overrides the config file. Update it if you add a custom domain.

## Add a new report

```bash
npm run new -- my-report-slug "/path/to/My Report.pdf"
```

This creates `reports/my-report-slug/` with the PDF, a `cover.jpg` rendered from page 1 (needs
`pdftoppm` from poppler: `brew install poppler`), and a `report.json` with the next series number.

1. Fill in `report.json` (title, DOI, abstract, keywords and so on; see the first report for a complete example).
2. Delete the `"draft": true` line.
3. Run `npm run build` to check it (the build stops with a clear message if a required field is missing).
4. Commit and push. Cloudflare publishes it at `/reports/my-report-slug/`.

Required fields: `title`, `datePublished` (YYYY-MM-DD), `authors`, `pdf`, and `abstract` or `description`.
Also fill in `contribution`: one or two sentences on what the report adds to the concept. It appears on the
concept page (`/polycrisis-resilience/`, built by `src/concept.mjs`) under "How the concept was built across the series".
Everything else is optional; sections without data are left out of the page.

## How reports are listed

- The home page shows the **10 most recent** reports (newest first, by `datePublished`, then `seriesNumber`).
- **All reports** (nav button, `/reports/`) lists every report **25 per page**: `/reports/`, `/reports/page/2/`, and so on. Pages are generated automatically as reports are added.
- The Atom feed carries the newest **50** reports; `reports.json` is the complete catalog.
- The concept page's "across the series" list shows the first 30 reports in series order, with a link to all reports.
- Change these sizes in `site.config.json` under `"listing"` (`homeCount`, `perPage`, `feedCount`).
- `page` is a reserved report folder name (it would clash with `/reports/page/N/`).
- Standalone files for the footer or elsewhere go in `files/` and are copied to `/files/`.

## What each report page includes

- **Google Scholar / Highwire Press tags**: `citation_title`, `citation_author`, `citation_publication_date`,
  `citation_doi`, `citation_pdf_url`, `citation_technical_report_institution`, `citation_reference`, …
- **Dublin Core and PRISM** meta tags
- **Schema.org JSON-LD**: `ScholarlyArticle`/`Report` with DOI identifier, author, publisher, license,
  subjects, PDF `MediaObject`, citations, series (`CreativeWorkSeries`) and breadcrumbs
- **Open Graph / Twitter** cards using the report cover
- **FAIR Signposting** (`cite-as`, `item`, `describedby`, `license`) as `<link>` tags and HTTP `Link` headers (`_headers`)
- Downloadable **BibTeX** and **RIS** citations, plus an APA-style citation with a copy button

Site-wide: `sitemap.xml`, `robots.txt`, an Atom feed (`feed.xml`), and a machine-readable catalog (`reports.json`).

After the first deploy, submit `https://<your-domain>/sitemap.xml` in Google Search Console and Bing
Webmaster Tools. You can put their verification codes in `site.config.json`.

## Local preview

```bash
npm run build
python3 -m http.server 4321 -d dist
```
