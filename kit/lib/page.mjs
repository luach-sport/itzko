// Puts a site's page together from the kit shell and the parts listed in site/site.json:
//   "hero"      → site/parts/hero.html           "kit:credit" → kit/parts/credit.html
//   "WHATS_NEW" → the latest release notes       <!-- kit: maker --> inside a part → kit/parts/maker.html
// then fills the {{PLACEHOLDERS}} and copies the styles, scripts, font and icon next to it.
import { readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc, moreApps, hubCards } from './apps.mjs';
import { HUB_URL } from './config.mjs';

const KIT_CSS_BEFORE = ['tokens.css'];
const KIT_CSS = ['base.css', 'hero.css', 'intro.css', 'chapters.css', 'offline.css', 'share.css', 'credit.css'];

function whatsNew(info) {
  if (!info.notes.length) return '';
  return '  <section class="news" aria-labelledby="news-h">\n' +
    '    <div class="news-head"><h2 id="news-h">מה חדש</h2><span class="badge">גרסה ' + esc(info.version) + '</span></div>\n' +
    '    <ul>' + info.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>\n' +
    '  </section>\n';
}

function readPart(dir, name) {
  const file = join(dir, name + '.html');
  if (!existsSync(file)) throw new Error('missing site part: ' + file);
  return readFileSync(file, 'utf8').replace(/\s+$/, '') + '\n';
}

export function writePage({ root, kitDir, out, cfg, apps, app, info }) {
  const site = join(root, 'site');
  const part = (name) => {
    if (name === 'WHATS_NEW') return whatsNew(info);
    if (name.startsWith('kit:')) return readPart(join(kitDir, 'parts'), name.slice(4));
    return readPart(join(site, 'parts'), name);
  };
  let body = cfg.parts.map(part).join('\n');
  body = body.replace(/<!-- kit: ([a-z0-9-]+) -->\n?/g, (m, name) => readPart(join(kitDir, 'parts'), name));

  const css = (cfg.css || []);
  const styles = KIT_CSS_BEFORE.map((f) => 'kit/css/' + f).concat(css.slice(0, 1).map((f) => 'css/' + f), KIT_CSS.map((f) => 'kit/css/' + f), css.slice(1).map((f) => 'css/' + f), ['kit/css/responsive.css'])
    .map((href) => '<link rel="stylesheet" href="' + href + '">').join('\n');

  const date = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jerusalem' }).format(new Date());
  const a = app || {};
  const url = a.site || cfg.url;
  const shareText = a.share || cfg.share || '';
  const values = {
    TITLE: cfg.title, DESCRIPTION: cfg.description, THEME_COLOR: cfg.themeColor || a.color || '#16181D',
    SITE_URL: url, APP_ID: cfg.id, APP_NAME: a.name || cfg.name, SLOGAN: a.slogan || '', APK_URL: a.apk || '',
    SHARE_TEXT: shareText, OFFLINE: a.offline || '', VERSION: info.version, BUILD: info.build || '–', DATE: date,
    VERSION_LABEL: info.version + (info.build ? ' (בנייה ' + info.build + ')' : ''),
    CREDIT_TEXT: cfg.creditText || '', FOOTER_NOTE: cfg.footerNote || '', HUB_URL: HUB_URL
  };
  let html = readFileSync(join(kitDir, 'shell.html'), 'utf8');
  const siteJson = JSON.stringify({ id: cfg.id, title: cfg.title, url, shareText }).replace(/</g, '\\u003c');
  html = html.replace('{{STYLES}}', () => styles).replace('{{BODY}}', () => body.replace(/\s+$/, '')).replace('{{SITE_JSON}}', () => siteJson);
  html = html.split('{{MORE_APPS}}').join(moreApps(apps, cfg.id)).split('{{HUB_APPS}}').join(hubCards(apps));
  for (const [k, v] of Object.entries(values)) html = html.split('{{' + k + '}}').join(esc(v));
  const left = html.match(/\{\{[A-Z_]+\}\}/);
  if (left) throw new Error('unfilled placeholder in the site: ' + left[0]);
  writeFileSync(join(out, 'index.html'), html);

  cpSync(join(kitDir, 'css'), join(out, 'kit', 'css'), { recursive: true });
  cpSync(join(kitDir, 'js'), join(out, 'kit', 'js'), { recursive: true });
  if (existsSync(join(site, 'css'))) cpSync(join(site, 'css'), join(out, 'css'), { recursive: true });
  if (existsSync(join(site, 'js'))) cpSync(join(site, 'js'), join(out, 'js'), { recursive: true });
  if (cfg.fonts && existsSync(join(root, cfg.fonts))) cpSync(join(root, cfg.fonts), join(out, 'fonts'), { recursive: true });
  cpSync(join(root, cfg.icon), join(out, 'icon.png'));
  writeFileSync(join(out, 'version.json'), JSON.stringify({ id: cfg.id, version: info.version, build: info.build, notes: info.notes, date }) + '\n');
  writeFileSync(join(out, '.nojekyll'), '');
  return html;
}
