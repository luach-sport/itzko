/* The "all the apps in one ZIP" box on the main site: shows the current size and date of the file, read live
   from the "all-apps" release on GitHub (built by .github/workflows/all-apps.yml). The text baked in when the
   site was built stays if GitHub can't be reached. Same text as kit/lib/all-apps.mjs. */
(function () {
  var el = document.querySelector('[data-zip-meta]');
  if (!el || !window.fetch) return;
  var sizeText = function (b) { return b >= 1e6 ? Math.round(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB'; };
  var dateText = function (iso) { var p = String(iso || '').split('-'); return p[2] ? Number(p[2]) + '.' + Number(p[1]) + '.' + p[0] : ''; };
  fetch('https://api.github.com/repos/luach-sport/itzko/releases/tags/all-apps', { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rel) {
      var asset = (rel.assets || []).filter(function (a) { return a.name === 'itzko-apps.zip'; })[0];
      if (!asset) return;
      var man = null;
      var m = /<!-- manifest (\{[\s\S]*?\}) -->/.exec(rel.body || '');
      try { man = m ? JSON.parse(m[1]) : null; } catch (e) { man = null; }
      var count = man && man.apps ? man.apps.length : 0;
      var date = (man && man.date) || asset.updated_at || '';
      el.textContent = (count ? count + ' אפליקציות · ' : '') + sizeText(asset.size) + ' · עודכן ' + dateText(date.slice(0, 10));
    })
    .catch(function () { /* keep the built-in text */ });
})();
