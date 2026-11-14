/* The numbers page: a card for every app in ../apps.json with its downloads (all versions, the latest one,
   and a table by version) and the in-app updates, read live from GitHub through window.ITZKO_DL. */
(function () {
  var DL = window.ITZKO_DL;
  var grid = document.getElementById('apps');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (n) { return (n || 0).toLocaleString('en-US'); };
  var day = function (iso) { var p = String(iso || '').split('-'); return p.length === 3 ? +p[2] + '.' + +p[1] + '.' + p[0].slice(2) : ''; };
  var hhmm = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  var version = function (r) { return String(r.tag || '').replace(/^v/, '').replace(/-build(\d+)$/, ' (בנייה $1)'); };

  function card(a, d) {
    var latest = d.releases[0];
    var hasUpdates = d.releases.some(function (r) { return r.updates > 0; });
    var rows = d.releases.map(function (r) {
      return '<tr><td>' + esc(version(r)) + '</td><td>' + esc(day(r.date)) + '</td><td class="n">' + num(r.apk) + '</td>' + (hasUpdates ? '<td class="n">' + num(r.updates) + '</td>' : '') + '</tr>';
    }).join('');
    return '<article class="stat-app" id="' + esc(a.id) + '" style="--app:' + esc(a.color) + '">' +
      '<div class="sa-head"><img src="' + esc(a.site) + 'icon.png" alt="" width="52" height="52"><div><h2>' + esc(a.name) + '</h2><a href="' + esc(a.site) + '">לאתר של ' + esc(a.name) + '</a></div></div>' +
      '<div class="sa-big"><span class="big">' + num(d.total) + '</span><span>הורדות</span></div>' +
      '<ul class="sa-facts">' +
      (latest ? '<li>הגרסה האחרונה, ' + esc(version(latest)) + ' מ-' + esc(day(latest.date)) + ': <b>' + num(latest.apk) + '</b> הורדות</li>' : '') +
      (hasUpdates ? '<li>עדכונים שהותקנו מתוך האפליקציה: <b>' + num(d.updates) + '</b></li>' : '') +
      '<li>' + d.releases.length + ' גרסאות שפורסמו</li></ul>' +
      '<details><summary>לפי גרסה</summary><table><thead><tr><th>גרסה</th><th>תאריך</th><th>הורדות</th>' + (hasUpdates ? '<th>עדכונים מתוך האפליקציה</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></details>' +
      '</article>';
  }
  function failed(a) {
    return '<article class="stat-app" id="' + esc(a.id) + '" style="--app:' + esc(a.color) + '"><div class="sa-head"><img src="' + esc(a.site) + 'icon.png" alt="" width="52" height="52"><div><h2>' + esc(a.name) + '</h2></div></div>' +
      '<p class="sa-err">GitHub לא ענה כרגע. אפשר לנסות שוב בעוד כמה דקות.</p></article>';
  }

  function run(fresh) {
    var btn = document.getElementById('refresh');
    btn.disabled = true;
    document.getElementById('checked').textContent = 'בודק…';
    fetch('../apps.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (apps) {
      return Promise.all(apps.map(function (a) {
        return DL.load(a.repo, fresh).then(function (d) { return { a: a, d: d }; }, function () { return { a: a, d: null }; });
      }));
    }).then(function (list) {
      grid.innerHTML = list.map(function (x) { return x.d ? card(x.a, x.d) : failed(x.a); }).join('');
      var ok = list.filter(function (x) { return x.d; });
      var at = ok.reduce(function (m, x) { return Math.min(m, x.d.checkedAt || Date.now()); }, Date.now());
      document.getElementById('total-n').textContent = num(ok.reduce(function (n, x) { return n + x.d.total; }, 0));
      document.getElementById('total').hidden = !ok.length;
      document.getElementById('checked').textContent = ok.length ? 'נבדק ב-' + hhmm(at) + '.' : '';
      if (location.hash) { var el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }
    }).catch(function () {
      document.getElementById('checked').textContent = 'לא הצלחתי לקרוא את רשימת האפליקציות. נסו לרענן את הדף.';
    }).then(function () { btn.disabled = false; });
  }
  document.getElementById('refresh').addEventListener('click', function () { run(true); });
  run(false);
})();
