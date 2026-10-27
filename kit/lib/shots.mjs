// Screenshots of the real app (phone size) with example data. Each app says what to show in its own
// scripts/site/scenes.mjs (the file named "shots" in site.json), which exports:
//   prepare(page, ctx)  optional: fill in example data; returns a value passed to every scene as `arg`
//   reset               optional: runs in the page before each scene (close dialogs and so on)
//   SCENES              [{ name, set?(arg) in the page, run?(page, arg) in Node, fill?, scroll?, wait?, after? }]
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function takeShots({ browser, base, out, info, root, cfg }) {
  const mod = await import(pathToFileURL(join(root, cfg.shots)).href);
  const ctx = await browser.newContext({
    viewport: cfg.viewport || { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'he-IL', timezoneId: 'Asia/Jerusalem', colorScheme: cfg.colorScheme || 'light'
  });
  // No internet for the app: previews and updates stay quiet, and the pictures are always the same.
  await ctx.route((url) => !url.href.startsWith(base), (route) => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/app/' + (cfg.appPage || 'index.html'));
  await page.waitForTimeout(800);
  const arg = mod.prepare ? await mod.prepare(page, { base, info }) : {};

  for (const scene of mod.SCENES) {
    await page.evaluate(mod.reset || (() => window.scrollTo(0, 0)));
    if (scene.set) await page.evaluate(scene.set, arg);
    if (scene.run) await scene.run(page, arg);
    if (scene.fill) await page.fill(scene.fill[0], scene.fill[1]);
    await page.waitForTimeout(scene.wait || 500);
    await page.evaluate((to) => {
      if (to === 'bottom') window.scrollTo(0, document.documentElement.scrollHeight);
      else if (to) { const el = document.querySelector(to); if (el) el.scrollIntoView({ block: 'center' }); }
      else if (to === '') window.scrollTo(0, 0);
    }, scene.scroll === undefined ? '' : scene.scroll);
    await page.waitForTimeout(scene.after || 250);
    // A player on screen: wait until it has its first picture, so there's no loading circle.
    await page.waitForFunction(() => { const v = document.querySelector('video'); return !v || v.readyState >= 2; }, null, { timeout: 5000 }).catch(() => console.log('  (video not ready)'));
    await page.screenshot({ path: join(out, 'shots', scene.name + '.jpg'), type: 'jpeg', quality: 86 });
    console.log('shot', scene.name);
  }
  await ctx.close();
  return errors;
}
