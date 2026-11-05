// Shared helpers: escaping, dates, citation formats.

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const stripTags = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export const truncate = (s, n = 160) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const parseDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3], iso };
};

export const humanDate = (iso) => {
  const p = parseDate(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : iso;
};

export const monthYear = (iso) => {
  const p = parseDate(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.y}` : iso;
};

export const slashDate = (iso) => iso.replace(/-/g, '/');

export const doiUrl = (doi) => (doi ? `https://doi.org/${doi}` : '');

// "Hughes, H." style initials for author lists
const initials = (given = '') =>
  given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((g) => g[0].toUpperCase() + '.')
    .join(' ');

export const splitName = (a) => {
  if (a.familyName) return { family: a.familyName, given: a.givenName || '' };
  const parts = a.name.trim().split(/\s+/);
  return { family: parts.pop(), given: parts.join(' ') };
};

export const apaAuthors = (authors) => {
  const list = authors.map((a) => {
    const { family, given } = splitName(a);
    return given ? `${family}, ${initials(given)}` : family;
  });
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ', & ' + list[list.length - 1];
};

// Title used in citations and citation metadata. A title that already has a colon
// ("Series: Topic") stands alone, matching how such reports cite themselves.
export const fullTitle = (r) => (r.subtitle && !r.title.includes(':') ? `${r.title}: ${r.subtitle}` : r.title);

export const seriesLabel = (r, site) =>
  r.seriesNumber ? `${site.series.shortName} No. ${r.seriesNumber}` : site.series.shortName;

export function apaCitation(r, site) {
  const year = r.datePublished.slice(0, 4);
  const link = r.doi ? doiUrl(r.doi) : r.url;
  return `${apaAuthors(r.authors)} (${year}). ${fullTitle(r)} (${seriesLabel(r, site)}). ${site.publisher.name}. ${link}`;
}

const bibEscape = (s) => String(s).replace(/([&%$#_])/g, '\\$1');

export function bibtex(r, site) {
  const p = parseDate(r.datePublished);
  const first = splitName(r.authors[0]).family.toLowerCase().replace(/[^a-z]/g, '');
  const word = r.title.toLowerCase().split(/\s+/).find((w) => w.length > 3) || 'report';
  const key = `${first}${p.y}${word.replace(/[^a-z]/g, '')}`;
  const authors = r.authors
    .map((a) => {
      const { family, given } = splitName(a);
      return given ? `${family}, ${given}` : family;
    })
    .join(' and ');
  const fields = [
    ['title', `{${bibEscape(fullTitle(r))}}`],
    ['author', `{${bibEscape(authors)}}`],
    ['institution', `{${bibEscape(site.publisher.name)}}`],
    ['type', `{${bibEscape(r.type || 'Research Report')}}`],
    ['series', `{${bibEscape(site.series.name)}}`],
    r.seriesNumber ? ['number', `{${r.seriesNumber}}`] : null,
    ['year', `{${p.y}}`],
    ['month', MONTH_ABBR[p.m - 1]],
    r.doi ? ['doi', `{${r.doi}}`] : null,
    ['url', `{${r.doi ? doiUrl(r.doi) : r.url}}`],
    r.license ? ['copyright', `{${bibEscape(r.license.shortName || r.license.name)}}`] : null,
    r.keywords?.length ? ['keywords', `{${bibEscape(r.keywords.join(', '))}}`] : null,
  ].filter(Boolean);
  return `@techreport{${key},\n${fields.map(([k, v]) => `  ${k} = ${v}`).join(',\n')}\n}\n`;
}

export function ris(r, site) {
  const lines = [['TY', 'RPRT'], ['TI', fullTitle(r)]];
  r.authors.forEach((a) => {
    const { family, given } = splitName(a);
    lines.push(['AU', given ? `${family}, ${given}` : family]);
  });
  lines.push(['T3', site.series.name]);
  if (r.seriesNumber) lines.push(['IS', String(r.seriesNumber)]);
  lines.push(['PY', r.datePublished.slice(0, 4)], ['DA', slashDate(r.datePublished)], ['PB', site.publisher.name]);
  if (r.doi) lines.push(['DO', r.doi]);
  lines.push(['UR', r.doi ? doiUrl(r.doi) : r.url], ['L1', r.pdfUrl], ['AB', r.abstractText]);
  (r.keywords || []).forEach((k) => lines.push(['KW', k]));
  lines.push(['LA', r.language || 'en'], ['ER', '']);
  return lines.map(([k, v]) => `${k}  - ${v}`).join('\r\n') + '\r\n';
}
