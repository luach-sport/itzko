// How many times each app was downloaded, from its GitHub releases (read while the site is built).
// GitHub counts every download of a release file:
//   *.apk       the install file (the "download" button, shared links, a friend's "send as file" fallback)
//   bundle.zip  an in-app update that an installed app downloaded (only apps with in-app updates)
// The page shows these numbers right away; kit/js/downloads.js then refreshes them live in the browser
// (and must count the same way).
const API = 'https://api.github.com/repos/';

export function summarize(releases) {
  const sum = (r, test) => (r.assets || []).filter((a) => test.test(a.name)).reduce((n, a) => n + (a.download_count || 0), 0);
  const list = (Array.isArray(releases) ? releases : []).filter((r) => !r.draft).map((r) => ({
    tag: r.tag_name, name: r.name || r.tag_name, date: (r.published_at || r.created_at || '').slice(0, 10),
    apk: sum(r, /\.apk$/i), updates: sum(r, /^bundle\.zip$/i)
  }));
  return {
    total: list.reduce((n, r) => n + r.apk, 0),
    updates: list.reduce((n, r) => n + r.updates, 0),
    releases: list
  };
}

export async function readDownloads(apps) {
  const out = {};
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'itzko-site-kit' };
  if (token) headers.Authorization = 'Bearer ' + token;
  for (const a of apps) {
    if (!a.repo) continue;
    try {
      const r = await fetch(API + a.repo + '/releases?per_page=100', { headers, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      out[a.id] = summarize(await r.json());
    } catch (e) {
      console.log('downloads of ' + a.id + ' not available now (' + (e.message || e) + '), the page will read them live');
    }
  }
  return out;
}

// "הורד 13 פעמים" style text for a number of downloads.
export function timesText(n) {
  return n === 1 ? 'פעם אחת' : n === 2 ? 'פעמיים' : n.toLocaleString('en-US') + ' פעמים';
}
