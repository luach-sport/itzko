// The version shown on a site and its "what's new" list.
// From update.json (what the app itself sees as the latest release); before the first release, from the
// workflow's APP_VERSION (or package.json) and release-notes.txt.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function readInfo(root) {
  try {
    const doc = JSON.parse(readFileSync(join(root, 'update.json'), 'utf8'));
    const p = JSON.parse(doc.payload);
    if (p.version) {
      return { version: String(p.version), build: String(p.build || ''), notes: Array.isArray(p.notes) ? p.notes.map(String) : [] };
    }
  } catch (e) {
    console.log('no update.json, using the workflow version');
  }
  let version = '';
  const wfFile = join(root, '.github/workflows/build.yml');
  if (existsSync(wfFile)) version = (readFileSync(wfFile, 'utf8').match(/APP_VERSION:\s*'?([0-9][^'\s$]*)'?\s*$/m) || [])[1] || '';
  if (!version && existsSync(join(root, 'package.json'))) version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || '';
  const notesFile = join(root, 'release-notes.txt');
  const notes = existsSync(notesFile) ? readFileSync(notesFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean) : [];
  return { version, build: '', notes };
}
