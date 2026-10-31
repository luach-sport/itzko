// Builds an Itzko site into _site/ (GitHub Pages serves it from the gh-pages branch):
//   index.html        the guide: kit shell + the parts in site/site.json, with the current version and what's new
//   kit/ css/ js/     shared styles and scripts, and the site's own brand styles
//   shots/*.jpg       fresh screenshots of the real app with example data (not on the main Itzko site)
//   og.jpg            link preview picture (WhatsApp and so on), version.json for the other sites
//   app/              the web version of the app (used for the screenshots)
// Run from the root of the app's repo:  node <kit>/lib/build.mjs
// (On GitHub the workflow checks out github.com/luach-sport/itzko into .kit; locally point to your copy.)
import { rmSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';
import { readInfo } from './info.mjs';
import { serve } from './server.mjs';
import { launch } from './browser.mjs';
import { takeShots } from './shots.mjs';
import { writePage } from './page.mjs';
import { finishAndCheck } from './checks.mjs';
import { readDownloads } from './downloads.mjs';

const kitDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = process.cwd();
const out = join(root, '_site');
const { cfg, apps, app } = loadConfig(root, kitDir);
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'shots'), { recursive: true });

const info = cfg.kind === 'hub' ? { version: '', build: '', notes: [] } : readInfo(root);
console.log(cfg.id, 'version', info.version, 'build', info.build, 'notes', info.notes.length);

if (cfg.kind !== 'hub') {
  cpSync(join(root, cfg.appDir || 'www'), join(out, 'app'), { recursive: true });
  if (cfg.versionFile) {
    writeFileSync(join(out, 'app', cfg.versionFile), 'window.' + cfg.versionGlobal + ' = ' + JSON.stringify({ version: info.version || 'dev', build: info.build || 'dev' }) + ';\n');
  }
  // Apps that keep their version inside the code: "stamp": { "file": "app.js", "find": "regex", "with": "…{{VERSION}}…" }
  if (cfg.stamp && info.version) {
    const f = join(out, 'app', cfg.stamp.file);
    writeFileSync(f, readFileSync(f, 'utf8').replace(new RegExp(cfg.stamp.find), cfg.stamp.with.split('{{VERSION}}').join(info.version)));
  }
}
if (cfg.kind === 'hub') writeFileSync(join(out, 'apps.json'), JSON.stringify(apps, null, 1) + '\n');

const server = await serve(out);
const browser = await launch();
try {
  if (cfg.shots) {
    const appErrors = await takeShots({ browser, base: server.base, out, info, root, cfg });
    if (appErrors.length) console.log('app errors while taking screenshots:', appErrors.slice(0, 5));
  }
  const dl = await readDownloads(cfg.kind === 'hub' ? apps : apps.filter((a) => a.id === cfg.id));
  console.log('downloads', Object.entries(dl).map(([k, v]) => k + '=' + v.total).join(' ') || 'not available');
  const html = writePage({ root, kitDir, out, cfg, apps, app, info, dl });
  const problems = await finishAndCheck({ browser, base: server.base, out, html });
  if (problems.length) throw new Error('site problems:\n- ' + problems.join('\n- '));
} finally {
  await browser.close();
  server.close();
}
console.log('site ready:', out);
