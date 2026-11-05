// HTML templates for every page the build emits.
import {
  esc, humanDate, monthYear, slashDate, doiUrl, fullTitle, seriesLabel, apaCitation, bibtex,
} from './lib.mjs';

const jsonLd = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')}</script>`;

const meta = (name, content) =>
  content === undefined || content === null || content === '' ? '' : `<meta name="${esc(name)}" content="${esc(content)}">`;
const prop = (property, content) =>
  content === undefined || content === null || content === '' ? '' : `<meta property="${esc(property)}" content="${esc(content)}">`;

const pad = (n) => String(n).padStart(2, '0');

// Converging-lines motif from the H Heuristics report covers.
export function heroLines() {
  const lines = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const y0 = -40 + (i * 480) / (n - 1);
    if (Math.abs(y0 - 200) < 14) continue;
    lines.push(`<path d="M0 ${y0.toFixed(1)} C 520 ${y0.toFixed(1)}, 820 ${(200 + (y0 - 200) * 0.18).toFixed(1)}, 1200 200"/>`);
  }
  return `<svg class="hero-lines" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1" opacity=".22">${lines.join('')}</g>
  <path class="hero-gold" d="M0 206 C 360 212, 760 206, 1200 198" fill="none" stroke-width="3"/>
</svg>`;
}

const icon = {
  pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  read: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  rss: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h.01M5 12a7 7 0 0 1 7 7M5 5a14 14 0 0 1 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

function layout({ site, title, description, canonical, head = '', body, active = '' }) {
  return `<!doctype html>
<html lang="${esc(site.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${meta('description', description)}
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
${meta('google-site-verification', site.googleSiteVerification)}
${meta('msvalidate.01', site.bingSiteVerification)}
<meta name="theme-color" content="#16365c">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="${esc(site.siteName)}" href="${esc(site.siteUrl)}/feed.xml">
<link rel="stylesheet" href="/assets/styles.css">
${head}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(site.siteName)} home">
      <span class="brand-mark">${esc(site.publisher.name)}</span>
      <span class="brand-series">${esc(site.series.shortName)}</span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="/#reports"${active === 'reports' ? ' aria-current="page"' : ''}>Reports</a>
      <a href="/#about">About</a>
      <a href="/feed.xml" class="nav-feed" title="Atom feed">${icon.rss}<span>Feed</span></a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="container footer-inner">
    <div>
      <div class="brand-mark">${esc(site.publisher.name)}</div>
      <p class="muted">${esc(site.publisher.tagline)}</p>
    </div>
    <div class="footer-links">
      <a href="/#reports">All reports</a>
      <a href="/feed.xml">Atom feed</a>
      <a href="/reports.json">Catalog (JSON)</a>
      <a href="/sitemap.xml">Sitemap</a>
    </div>
    <p class="muted footer-note">Reports are open access. Unless stated otherwise on a report page, content is licensed under CC BY 4.0. © ${new Date().getFullYear()} ${esc(site.publisher.name)}.</p>
  </div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

function orgLd(site) {
  return {
    '@type': 'Organization',
    '@id': `${site.siteUrl}/#org`,
    name: site.publisher.name,
    url: site.publisher.url,
    slogan: site.publisher.tagline,
  };
}

function seriesLd(site) {
  return {
    '@type': 'CreativeWorkSeries',
    '@id': `${site.siteUrl}/#series`,
    name: site.series.name,
    alternateName: site.series.shortName,
    url: `${site.siteUrl}/`,
    description: site.description,
    publisher: { '@id': `${site.siteUrl}/#org` },
    inLanguage: site.language,
  };
}

/* ---------------------------------------------------------------- report */

function reportHead(r, site) {
  const authorTags = r.authors
    .map((a) => meta('citation_author', a.name) + (a.affiliation ? meta('citation_author_institution', a.affiliation) : '') + (a.orcid ? meta('citation_author_orcid', a.orcid) : ''))
    .join('\n');
  const refs = (r.references || [])
    .map((ref) => meta('citation_reference', [ref.text, ref.doi ? `doi:${ref.doi}` : ref.url].filter(Boolean).join(' ')))
    .join('\n');

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['ScholarlyArticle', 'Report'],
        '@id': `${r.url}#report`,
        url: r.url,
        mainEntityOfPage: r.url,
        headline: r.title,
        name: r.title,
        alternativeHeadline: r.subtitle || undefined,
        description: r.description,
        abstract: r.abstractText,
        author: r.authors.map((a) => ({
          '@type': 'Person',
          name: a.name,
          givenName: a.givenName,
          familyName: a.familyName,
          jobTitle: a.role,
          sameAs: a.orcid ? `https://orcid.org/${a.orcid}` : undefined,
          affiliation: a.affiliation ? { '@type': 'Organization', name: a.affiliation } : undefined,
        })),
        publisher: { '@id': `${site.siteUrl}/#org` },
        isPartOf: { '@id': `${site.siteUrl}/#series` },
        position: r.seriesNumber,
        reportNumber: r.seriesNumber ? String(r.seriesNumber) : undefined,
        genre: r.type,
        datePublished: r.datePublished,
        dateModified: r.dateModified || r.datePublished,
        inLanguage: r.language || site.language,
        keywords: (r.keywords || []).join(', '),
        about: (r.subjects || []).map((s) => ({
          '@type': 'DefinedTerm',
          name: s.name,
          termCode: s.code,
          inDefinedTermSet: s.scheme,
        })),
        isAccessibleForFree: true,
        license: r.license?.url,
        image: r.coverUrl,
        thumbnailUrl: r.coverUrl,
        identifier: r.doi
          ? { '@type': 'PropertyValue', propertyID: 'DOI', value: r.doi, url: doiUrl(r.doi) }
          : undefined,
        sameAs: [r.doi && doiUrl(r.doi), r.repository?.url].filter(Boolean),
        encoding: {
          '@type': 'MediaObject',
          contentUrl: r.pdfUrl,
          encodingFormat: 'application/pdf',
          contentSize: r.pdfSize,
          name: `${r.title} (PDF)`,
        },
        citation: (r.references || []).map((ref) => ({
          '@type': 'CreativeWork',
          name: ref.text,
          url: ref.url,
        })),
      },
      seriesLd(site),
      orgLd(site),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.series.shortName, item: `${site.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: r.title, item: r.url },
        ],
      },
    ],
  };

  return `
<!-- Highwire Press / Google Scholar -->
${meta('citation_title', fullTitle(r))}
${authorTags}
${meta('citation_publication_date', slashDate(r.datePublished))}
${meta('citation_online_date', slashDate(r.datePublished))}
${meta('citation_publisher', site.publisher.name)}
${meta('citation_technical_report_institution', site.publisher.name)}
${meta('citation_technical_report_number', r.seriesNumber ? seriesLabel(r, site) : '')}
${meta('citation_series_title', site.series.name)}
${meta('citation_doi', r.doi)}
${meta('citation_abstract_html_url', r.url)}
${meta('citation_pdf_url', r.pdfUrl)}
${meta('citation_language', r.language || site.language)}
${meta('citation_keywords', (r.keywords || []).join('; '))}
${meta('citation_num_pages', r.pages)}
${refs}
<!-- Dublin Core -->
<link rel="schema.DC" href="http://purl.org/dc/elements/1.1/">
<link rel="schema.DCTERMS" href="http://purl.org/dc/terms/">
${meta('DC.title', fullTitle(r))}
${r.authors.map((a) => meta('DC.creator', a.name)).join('\n')}
${meta('DC.date', r.datePublished)}
${meta('DCTERMS.issued', r.datePublished)}
${meta('DC.identifier', r.doi ? `doi:${r.doi}` : r.url)}
${meta('DC.identifier', r.url)}
${meta('DC.publisher', site.publisher.name)}
${meta('DC.type', 'Text')}
${meta('DC.format', 'application/pdf')}
${meta('DC.language', r.language || site.language)}
${meta('DC.description', r.abstractText)}
${(r.keywords || []).map((k) => meta('DC.subject', k)).join('\n')}
${meta('DC.rights', r.license ? `${r.license.name} (${r.license.url})` : '')}
${meta('DCTERMS.license', r.license?.url)}
${meta('DCTERMS.isPartOf', site.series.name)}
<!-- PRISM -->
${meta('prism.doi', r.doi)}
${meta('prism.url', r.url)}
${meta('prism.publicationDate', r.datePublished)}
<!-- Open Graph / social -->
${prop('og:type', 'article')}
${prop('og:site_name', site.siteName)}
${prop('og:title', r.title)}
${prop('og:description', r.description)}
${prop('og:url', r.url)}
${prop('og:image', r.coverUrl)}
${prop('og:image:alt', `Cover of ${r.title}`)}
${prop('og:locale', 'en_US')}
${prop('article:published_time', r.datePublished)}
${prop('article:modified_time', r.dateModified || r.datePublished)}
${r.authors.map((a) => prop('article:author', a.name)).join('\n')}
${prop('article:section', site.series.shortName)}
${(r.keywords || []).map((k) => prop('article:tag', k)).join('\n')}
${meta('twitter:card', 'summary_large_image')}
${meta('twitter:title', r.title)}
${meta('twitter:description', r.description)}
${meta('twitter:image', r.coverUrl)}
<!-- Signposting -->
${r.doi ? `<link rel="cite-as" href="${esc(doiUrl(r.doi))}">` : ''}
<link rel="item" href="${esc(r.pdfUrl)}" type="application/pdf">
<link rel="describedby" href="${esc(r.bibUrl)}" type="application/x-bibtex">
<link rel="describedby" href="${esc(r.risUrl)}" type="application/x-research-info-systems">
${r.license ? `<link rel="license" href="${esc(r.license.url)}">` : ''}
<link rel="alternate" type="application/pdf" href="${esc(r.pdfUrl)}">
${jsonLd(ld)}`
    .split('\n')
    .filter((l) => l.trim() !== '')
    .join('\n');
}

export function reportPage(r, site, { prev, next } = {}) {
  const tocItems = [
    ['abstract', 'Abstract'],
    r.keyFindings?.length && ['key-findings', 'Key findings'],
    r.contents?.length && ['contents', 'Contents'],
    r.glossary?.length && ['glossary', 'Glossary'],
    ['cite', 'Cite'],
    r.references?.length && ['references', 'References'],
  ].filter(Boolean);

  const abstractParas = (Array.isArray(r.abstract) ? r.abstract : [r.abstract]).map((p) => `<p>${p}</p>`).join('\n');

  const metaRows = [
    ['Series', `${esc(site.series.shortName)}${r.seriesNumber ? ` · No. ${r.seriesNumber}` : ''}`],
    ['Type', esc(r.type || 'Research Report')],
    ['Published', `<time datetime="${r.datePublished}">${humanDate(r.datePublished)}</time>`],
    r.doi && ['DOI', `<a href="${esc(doiUrl(r.doi))}" class="doi">${esc(r.doi)}</a>`],
    r.pages && ['Pages', String(r.pages)],
    r.license && ['License', `<a href="${esc(r.license.url)}" rel="license">${esc(r.license.shortName || r.license.name)}</a>`],
    ['Language', r.language === 'en' || !r.language ? 'English' : esc(r.language)],
    r.repository && ['Archived at', `<a href="${esc(r.repository.url)}">${esc(r.repository.name)}</a>`],
  ].filter(Boolean);

  const body = `
<section class="hero hero-report">
  ${heroLines()}
  <div class="container hero-inner">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">${esc(site.series.shortName)}</a><span aria-hidden="true">/</span><span>Report${r.seriesNumber ? ` No. ${r.seriesNumber}` : ''}</span></nav>
    <p class="kicker">${esc(r.type || 'Research Report')} · ${monthYear(r.datePublished)}</p>
    <h1>${esc(r.title)}</h1>
    ${r.subtitle ? `<p class="subtitle">${esc(r.subtitle)}</p>` : ''}
    <p class="byline">${r.authors.map((a) => `<span class="author">${esc(a.name)}</span>${a.role ? `<span class="role">, ${esc(a.role)}</span>` : ''}`).join('; ')}</p>
    ${r.themes?.length ? `<ul class="themes" aria-label="Themes">${r.themes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
  </div>
</section>

<div class="container report-layout">
  <aside class="report-aside" aria-label="Report details">
    <a class="cover" href="${esc(r.pdfPath)}" target="_blank" rel="noopener" aria-label="Open the PDF in a new tab">
      ${r.coverPath ? `<img src="${esc(r.coverPath)}" alt="Cover of ${esc(r.title)}" width="${r.coverWidth || 935}" height="${r.coverHeight || 1210}" loading="eager" decoding="async">` : ''}
    </a>
    <div class="actions">
      <a class="btn btn-primary" href="${esc(r.pdfPath)}" target="_blank" rel="noopener">${icon.read}<span>Open PDF in browser</span></a>
      <a class="btn" href="${esc(r.pdfPath)}" download>${icon.pdf}<span>Download PDF</span><small>${esc(r.pdfSizeLabel)}</small></a>
      ${r.doi ? `<a class="btn" href="${esc(doiUrl(r.doi))}">${icon.ext}<span>DOI landing page</span></a>` : ''}
      <a class="btn" href="#cite">${icon.copy}<span>Cite this report</span></a>
    </div>
    <dl class="meta-list">
      ${metaRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('\n      ')}
    </dl>
    ${r.keywords?.length ? `<div class="aside-block"><h2 class="aside-h">Keywords</h2><ul class="tags">${r.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
    ${r.subjects?.length ? `<div class="aside-block"><h2 class="aside-h">Fields of research</h2><ul class="subjects">${r.subjects.map((s) => `<li>${esc(s.name)}${s.code ? ` <span class="muted">${esc(s.scheme || '')} ${esc(s.code)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
  </aside>

  <article class="report-body">
    <nav class="toc" aria-label="On this page">${tocItems.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>

    <section id="abstract">
      <h2>Abstract</h2>
      ${abstractParas}
    </section>

    ${r.coreProposition ? `<figure class="proposition"><blockquote><p>${esc(r.coreProposition)}</p></blockquote><figcaption>Core proposition, ${esc(site.publisher.name)}</figcaption></figure>` : ''}

    ${r.keyFindings?.length ? `<section id="key-findings">
      <h2>Key findings</h2>
      <ol class="findings">${r.keyFindings.map((f) => `<li>${typeof f === 'string' ? esc(f) : `<strong>${esc(f.title)}</strong> ${esc(f.text)}`}</li>`).join('')}</ol>
      ${r.bottomLine ? `<div class="callout"><p class="callout-h">Bottom line</p><p>${esc(r.bottomLine)}</p></div>` : ''}
    </section>` : ''}

    ${r.contents?.length ? `<section id="contents">
      <h2>Contents</h2>
      <ol class="contents">${r.contents.map((c) => `<li><a href="${esc(r.pdfPath)}#page=${c.page}" target="_blank" rel="noopener"><span class="c-num">${esc(c.number)}</span><span class="c-text"><span class="c-title">${esc(c.title)}</span>${c.description ? `<span class="c-desc">${esc(c.description)}</span>` : ''}</span><span class="c-page">p.&nbsp;${c.page}</span></a></li>`).join('')}</ol>
      <p class="muted small">Section links open the PDF at the corresponding page in a new tab.</p>
    </section>` : ''}

    ${r.glossary?.length ? `<section id="glossary">
      <h2>Glossary</h2>
      <dl class="glossary">${r.glossary.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.definition)}</dd></div>`).join('')}</dl>
    </section>` : ''}

    <section id="cite">
      <h2>How to cite</h2>
      <div class="cite-box">
        <p class="cite-text" id="cite-apa">${esc(apaCitation(r, site))}</p>
        <button type="button" class="btn btn-small" data-copy="#cite-apa">${icon.copy}<span>Copy</span></button>
      </div>
      <details class="bibtex">
        <summary>BibTeX</summary>
        <div class="cite-box"><pre id="cite-bib">${esc(bibtex(r, site))}</pre><button type="button" class="btn btn-small" data-copy="#cite-bib">${icon.copy}<span>Copy</span></button></div>
      </details>
      <p class="downloads">Download citation: <a href="${esc(r.bibPath)}" download>BibTeX (.bib)</a> · <a href="${esc(r.risPath)}" download>RIS (.ris)</a>${r.doi ? ` · <a href="${esc(doiUrl(r.doi))}">${esc(doiUrl(r.doi))}</a>` : ''}</p>
    </section>

    ${r.references?.length ? `<section id="references">
      <h2>References</h2>
      <ol class="references">${r.references.map((ref) => `<li>${esc(ref.text)}${ref.url ? ` <a href="${esc(ref.url)}" rel="nofollow noopener">${esc(ref.doi ? `doi:${ref.doi}` : prettyUrl(ref.url))}</a>` : ''}</li>`).join('')}</ol>
    </section>` : ''}

    ${prev || next ? `<nav class="pager" aria-label="More reports">
      ${prev ? `<a class="pager-prev" href="${esc(prev.path)}"><small>Previous report</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="pager-next" href="${esc(next.path)}"><small>Next report</small><span>${esc(next.title)}</span></a>` : ''}
    </nav>` : ''}
  </article>
</div>`;

  return layout({
    site,
    title: `${r.title} | ${site.series.shortName} | ${site.publisher.name}`,
    description: r.description,
    canonical: r.url,
    head: reportHead(r, site),
    body,
    active: 'reports',
  });
}

function prettyUrl(u) {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

/* ------------------------------------------------------------------ home */

function reportCard(r, { featured = false } = {}) {
  return `<article class="card${featured ? ' card-featured' : ''}">
  ${featured && r.coverPath ? `<a class="card-cover" href="${esc(r.path)}" tabindex="-1" aria-hidden="true"><img src="${esc(r.coverPath)}" alt="" width="${r.coverWidth || 935}" height="${r.coverHeight || 1210}" loading="lazy" decoding="async"></a>` : ''}
  <div class="card-body">
    <p class="card-kicker">${r.seriesNumber ? `<span class="num">No. ${pad(r.seriesNumber)}</span>` : ''}<time datetime="${r.datePublished}">${humanDate(r.datePublished)}</time></p>
    <h3><a href="${esc(r.path)}">${esc(r.title)}</a></h3>
    ${r.subtitle ? `<p class="card-sub">${esc(r.subtitle)}</p>` : ''}
    ${featured ? `<p class="card-desc">${esc(r.description)}</p>` : ''}
    <p class="card-meta">${esc(r.authors.map((a) => a.name).join(', '))}${r.doi ? ` · <span class="doi">doi:${esc(r.doi)}</span>` : ''}</p>
    ${featured ? `<div class="card-actions"><a class="btn btn-primary" href="${esc(r.path)}"><span>Read the report</span></a><a class="btn" href="${esc(r.pdfPath)}" target="_blank" rel="noopener">${icon.read}<span>Open PDF</span></a></div>` : ''}
  </div>
</article>`;
}

export function homePage(reports, site) {
  const latest = reports[0];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site.siteUrl}/#website`,
        url: `${site.siteUrl}/`,
        name: site.siteName,
        description: site.description,
        publisher: { '@id': `${site.siteUrl}/#org` },
        inLanguage: site.language,
      },
      {
        ...seriesLd(site),
        hasPart: reports.map((r) => ({
          '@type': ['ScholarlyArticle', 'Report'],
          '@id': `${r.url}#report`,
          name: r.title,
          url: r.url,
          datePublished: r.datePublished,
          position: r.seriesNumber,
          identifier: r.doi ? { '@type': 'PropertyValue', propertyID: 'DOI', value: r.doi } : undefined,
        })),
      },
      orgLd(site),
    ],
  };

  const body = `
<section class="hero hero-home">
  ${heroLines()}
  <div class="container hero-inner">
    <p class="kicker">${esc(site.publisher.name)} · Research series</p>
    <h1>${esc(site.series.shortName)}</h1>
    <p class="subtitle">${esc(site.tagline)}</p>
    <p class="hero-stats"><span><strong>${reports.length}</strong> ${reports.length === 1 ? 'report' : 'reports'}</span><span>Open access</span><span>DOI-registered</span></p>
  </div>
</section>

<div class="container">
  ${latest ? `<section class="section" aria-labelledby="latest-h">
    <h2 id="latest-h" class="section-h">Latest report</h2>
    ${reportCard(latest, { featured: true })}
  </section>` : ''}

  <section class="section" id="reports" aria-labelledby="reports-h">
    <h2 id="reports-h" class="section-h">All reports</h2>
    ${reports.length ? `<div class="card-list">${reports.map((r) => reportCard(r)).join('\n')}</div>` : '<p class="muted">The first report is coming soon.</p>'}
  </section>

  <section class="section about" id="about" aria-labelledby="about-h">
    <h2 id="about-h" class="section-h">About the series</h2>
    <div class="about-grid">
      <div class="prose">
        <p>The <strong>${esc(site.series.name)}</strong> examines how humanity can reduce its exposure to interconnected systemic threats: climate change, pollution, fragile food and energy systems, pandemics, financial shocks and conflict. A <em>polycrisis</em> is more than several crises at once; it is crises that make each other worse.</p>
        <p>Each report sets out a framework, gathers current evidence from international organizations and published research, and is written in plain language for general readers, students and decision-makers. Where reports include original modelling, it is labelled as illustrative and kept separate from published statistics.</p>
      </div>
      <dl class="facts">
        <div><dt>Publisher</dt><dd>${esc(site.publisher.name)}</dd></div>
        <div><dt>Access</dt><dd>Free to read and download, CC BY 4.0 unless stated</dd></div>
        <div><dt>Identifiers</dt><dd>Each report carries a persistent DOI</dd></div>
        <div><dt>Follow</dt><dd><a href="/feed.xml">Atom feed</a> · <a href="/reports.json">JSON catalog</a></dd></div>
      </dl>
    </div>
  </section>
</div>`;

  return layout({
    site,
    title: `${site.series.shortName} | ${site.publisher.name}`,
    description: site.description,
    canonical: `${site.siteUrl}/`,
    head: [
      prop('og:type', 'website'),
      prop('og:site_name', site.siteName),
      prop('og:title', site.series.name),
      prop('og:description', site.description),
      prop('og:url', `${site.siteUrl}/`),
      latest ? prop('og:image', latest.coverUrl) : '',
      meta('twitter:card', 'summary_large_image'),
      jsonLd(ld),
    ].filter(Boolean).join('\n'),
    body,
    active: 'reports',
  });
}

export function notFoundPage(site) {
  return layout({
    site,
    title: `Page not found | ${site.series.shortName}`,
    description: 'This page could not be found.',
    canonical: `${site.siteUrl}/404`,
    head: '<meta name="robots" content="noindex">',
    body: `<div class="container section narrow"><h1>Page not found</h1><p>The page you were looking for does not exist or has moved. Browse <a href="/#reports">all reports</a> instead.</p></div>`,
  }).replace('<meta name="robots" content="index, follow, max-image-preview:large">\n', '');
}
