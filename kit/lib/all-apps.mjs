// "All the apps in one ZIP" on the main site. The file is built by .github/workflows/all-apps.yml
// (tools/all-apps/make_zip.py) and kept as a file of the "all-apps" release of this repo, so the link never
// changes. The release text carries a small manifest (which version of each app is inside, and when).
// site/js/all-apps.js reads the same release live in the browser, so the page shows the current size and date.
export const ZIP_REPO = 'luach-sport/itzko';
export const ZIP_TAG = 'all-apps';
export const ZIP_NAME = 'itzko-apps.zip';
export const ZIP_URL = 'https://github.com/' + ZIP_REPO + '/releases/download/' + ZIP_TAG + '/' + ZIP_NAME;

// The manifest sits in the release text as <!-- manifest {...} -->.
export function readManifest(body) {
  const m = /<!-- manifest (\{[\s\S]*?\}) -->/.exec(body || '');
  try { return m ? JSON.parse(m[1]) : null; } catch (e) { return null; }
}

export async function readZip() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'itzko-site-kit' };
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch('https://api.github.com/repos/' + ZIP_REPO + '/releases/tags/' + ZIP_TAG, { headers, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rel = await r.json();
    const asset = (rel.assets || []).find((a) => a.name === ZIP_NAME);
    if (!asset) return null;
    const man = readManifest(rel.body) || {};
    return { size: asset.size, date: (man.date || asset.updated_at || '').slice(0, 10), count: (man.apps || []).length };
  } catch (e) {
    console.log('all-apps zip not available now (' + (e.message || e) + '), the page will read it live');
    return null;
  }
}

export function sizeText(bytes) {
  return bytes >= 1e6 ? Math.round(bytes / 1e6) + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' KB';
}
export function dateText(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return d ? Number(d) + '.' + Number(m) + '.' + y : '';
}
// "9 אפליקציות · 84 MB · עודכן 24.11.2026" (the same text as site/js/all-apps.js).
export function zipMeta(zip, appCount) {
  if (!zip) return appCount + ' אפליקציות · הגרסה האחרונה של כל אחת';
  return (zip.count || appCount) + ' אפליקציות · ' + sizeText(zip.size) + ' · עודכן ' + dateText(zip.date);
}
