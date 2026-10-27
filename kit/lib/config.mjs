// Reads a site's settings (site/site.json in the app's repo) and the list of all Itzko apps (apps.json).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const HUB_URL = 'https://luach-sport.github.io/itzko/';

export function loadConfig(root, kitDir) {
  const file = join(root, 'site', 'site.json');
  if (!existsSync(file)) throw new Error('missing site/site.json in ' + root);
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  const apps = JSON.parse(readFileSync(join(kitDir, '..', 'apps.json'), 'utf8'));
  const app = apps.find((a) => a.id === cfg.id) || null;
  if (cfg.kind !== 'hub' && !app) throw new Error('app "' + cfg.id + '" is not in apps.json');
  return { cfg, apps, app };
}
