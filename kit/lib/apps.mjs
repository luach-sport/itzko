// HTML for the apps: the small cards under "more apps by Itzko", and the big cards on the main Itzko site.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export { esc };

export function moreApps(apps, meId) {
  return apps.filter((a) => a.id !== meId).map((a) =>
    '        <a class="app-card" href="' + esc(a.site) + '"><img src="' + esc(a.site) + 'icon.png" alt="" width="52" height="52" loading="lazy">' +
    '<span class="txt"><b>' + esc(a.name) + '</b><small>' + esc(a.short) + '</small><span class="go">לאתר של ' + esc(a.name) + ' ←</span></span></a>'
  ).join('\n');
}

const OFFLINE_ICON = '<svg class="i sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

export function hubCards(apps) {
  return apps.map((a) =>
    '    <article class="hub-app" style="--app:' + esc(a.color) + '">\n' +
    '      <a class="hub-shot" href="' + esc(a.site) + '" aria-hidden="true" tabindex="-1"><img src="' + esc(a.site) + 'shots/home.jpg" alt="" width="720" height="1480" loading="lazy"></a>\n' +
    '      <div class="hub-body">\n' +
    '        <div class="hub-head"><img src="' + esc(a.site) + 'icon.png" alt="" width="60" height="60"><div><h2>' + esc(a.name) + '</h2><span class="hub-slogan">' + esc(a.slogan) + '</span></div></div>\n' +
    '        <p>' + esc(a.short) + '</p>\n' +
    '        <span class="hub-off">' + OFFLINE_ICON + esc(a.offline) + '</span>\n' +
    '        <span class="hub-ver" data-app-version="' + esc(a.id) + '">לאנדרואיד</span>\n' +
    '        <div class="hub-acts"><a class="btn app" href="' + esc(a.site) + '">לאתר של ' + esc(a.name) + '</a>' +
    '<a class="btn plain" href="' + esc(a.apk) + '" target="_blank" rel="noopener">הורדה</a></div>\n' +
    '      </div>\n' +
    '    </article>'
  ).join('\n');
}
