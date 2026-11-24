"""Builds itzko-apps.zip: the latest APK of every app in apps.json, in one file.

Run by .github/workflows/all-apps.yml every half hour. It first compares the latest release of every app with
the manifest of the current ZIP (kept in the text of this repo's "all-apps" release), and only builds a new ZIP
when an app got a new version, an app was added or removed, or FORCE=1.

Writes to out/: itzko-apps.zip and notes.md (the release text, with the manifest), and changed=true/false
to $GITHUB_OUTPUT. Python standard library only.
"""
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'out')
REPO = 'luach-sport/itzko'
TAG = 'all-apps'
TOKEN = os.environ.get('GH_TOKEN', '')

HOW_TO = """האפליקציות של Itzko – כל האפליקציות בקובץ אחד
https://luach-sport.github.io/itzko/

איך מתקינים:
1. מחלצים את הקובץ (בטלפון: במנהל הקבצים לוחצים על הקובץ ובוחרים "חילוץ").
2. לוחצים על האפליקציה שרוצים (קובץ שנגמר ב-apk).
3. בפעם הראשונה מאשרים "התקנה ממקור לא ידוע".
אם מופיעה אזהרה של Google Play Protect, בוחרים להתקין בכל זאת.

מעכשיו העדכונים נכנסים מתוך האפליקציה (באפליקציות שיש בהן עדכון מתוך האפליקציה),
או שמורידים שוב את הקובץ הזה, שתמיד מכיל את הגרסה האחרונה של כל אחת.

בקובץ הזה ({date}):
{lines}

פותח על ידי Itzko.
"""


def api(path):
    req = urllib.request.Request('https://api.github.com/' + path, headers={
        'Accept': 'application/vnd.github+json', 'User-Agent': 'itzko-all-apps'})
    if TOKEN:
        req.add_header('Authorization', 'Bearer ' + TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def download(url, dest, size):
    # Public release files: no token (GitHub sends them on to its file storage, which refuses a second login).
    req = urllib.request.Request(url, headers={'User-Agent': 'itzko-all-apps'})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, 'wb') as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    got = os.path.getsize(dest)
    if size and got != size:
        raise RuntimeError('%s: got %d bytes, expected %d' % (url, got, size))


def safe_name(s):
    return re.sub(r'[\\/:*?"<>|]', '', s).strip()


def file_name(a):
    # "מעשרותי (maasroti).apk", "MyCar.apk": the Hebrew name, and the English one when it differs.
    name = safe_name(a['name']) or a['id']
    return (name if name.lower() == a['id'].lower() else '%s (%s)' % (name, a['id'])) + '.apk'


def main():
    apps = json.load(open(os.path.join(ROOT, 'apps.json'), encoding='utf-8'))
    found, missing = [], []
    for a in apps:
        want = a['apk'].rsplit('/', 1)[-1]
        rel = api('repos/%s/releases/latest' % a['repo'])
        asset = next((x for x in (rel or {}).get('assets', []) if x['name'] == want), None)
        if not asset:
            missing.append(a['name'])
            print('::warning title=all-apps::%s has no %s in its latest release, left out of the ZIP' % (a['name'], want))
            continue
        found.append({'id': a['id'], 'name': a['name'], 'version': rel['tag_name'], 'size': asset['size'],
                      'updated': asset['updated_at'], 'url': asset['browser_download_url'],
                      'file': file_name(a)})
    if not found:
        sys.exit('no app has an APK to put in the ZIP')

    sig = [[x['id'], x['version'], x['updated']] for x in found]
    cur = api('repos/%s/releases/tags/%s' % (REPO, TAG))
    old = None
    if cur:
        m = re.search(r'<!-- manifest (\{[\s\S]*?\}) -->', cur.get('body') or '')
        old = json.loads(m.group(1)) if m else None
        has_zip = any(x['name'] == 'itzko-apps.zip' for x in cur.get('assets', []))
    else:
        has_zip = False
    same = bool(old) and has_zip and old.get('sig') == sig
    changed = os.environ.get('FORCE') == '1' or not same
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write('changed=%s\n' % ('true' if changed else 'false'))
    if not changed:
        print('the ZIP already has the latest version of every app')
        return

    os.makedirs(os.path.join(OUT, 'apk'), exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=2)))
    date_he = '%d.%d.%d' % (now.day, now.month, now.year)
    lines = '\n'.join('- %s – %s' % (x['name'], x['version']) for x in found)
    zpath = os.path.join(OUT, 'itzko-apps.zip')
    with zipfile.ZipFile(zpath, 'w', compression=zipfile.ZIP_STORED) as z:
        z.writestr('איך מתקינים.txt', HOW_TO.format(date=date_he, lines=lines))
        for x in found:
            dest = os.path.join(OUT, 'apk', x['id'] + '.apk')
            print('downloading', x['name'], x['version'], x['size'], 'bytes')
            download(x['url'], dest, x['size'])
            z.write(dest, x['file'])  # APKs are already compressed: stored as they are

    manifest = {'date': now.date().isoformat(), 'sig': sig,
                'apps': [{'id': x['id'], 'name': x['name'], 'version': x['version']} for x in found]}
    notes = ('כל האפליקציות של Itzko בקובץ אחד, בגרסה האחרונה של כל אחת. עודכן %s.\n\n%s\n\n'
             'הקובץ נבנה מחדש לבד כשאחת האפליקציות מקבלת גרסה חדשה. האתר: https://luach-sport.github.io/itzko/\n\n'
             '<!-- manifest %s -->\n') % (date_he, lines, json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
    if missing:
        notes = notes.replace('\n\n<!--', '\n\nלא בקובץ כרגע (אין עדיין קובץ התקנה): %s\n\n<!--' % ', '.join(missing))
    open(os.path.join(OUT, 'notes.md'), 'w', encoding='utf-8').write(notes)
    print('ZIP ready: %d apps, %d bytes' % (len(found), os.path.getsize(zpath)))
    print('::notice title=all-apps::%d apps, %.1f MB: %s' % (len(found), os.path.getsize(zpath) / 1e6, ', '.join('%s %s' % (x['id'], x['version']) for x in found)))


if __name__ == '__main__':
    main()
