"""Import the public Miracle74 sprite catalogs. Run from the repository root."""
import html
import json
from pathlib import Path
import re
import subprocess
import tempfile
import argparse
import time
import threading
from contextlib import nullcontext

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://miracle74.com'
REQUEST_LOCK = threading.Lock()
LAST_REQUEST = 0.0

def save_catalog(name, records):
    target = ROOT / 'data' / (name + '.js')
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix('.js.part')
    partial.write_text('window.' + name.upper() + ' = ' + json.dumps(records, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    partial.replace(target)

def sprite_bounds(path):
    """Measure visible animation bounds without modifying the source GIF."""
    from PIL import Image, ImageSequence
    with Image.open(path) as image:
        boxes = [frame.convert('RGBA').getbbox() for frame in ImageSequence.Iterator(image)]
        boxes = [box for box in boxes if box]
        if not boxes:
            raise ValueError('Empty sprite: ' + str(path))
        left = min(box[0] for box in boxes)
        top = min(box[1] for box in boxes)
        right = max(box[2] for box in boxes)
        bottom = max(box[3] for box in boxes)
        return dict(x=left, y=top, width=right-left, height=bottom-top,
                    imageWidth=image.width, imageHeight=image.height)

def fetch(url, target, retry_rate_limit=True):
    global LAST_REQUEST
    target.parent.mkdir(parents=True, exist_ok=True)
    with REQUEST_LOCK:
        interval = 0.35 if '/images/items/' in url else 1.6
        time.sleep(max(0, interval - (time.monotonic() - LAST_REQUEST)))
        LAST_REQUEST = time.monotonic()
    partial = target.with_suffix(target.suffix + '.part')
    command = ['curl.exe', '--fail', '--silent', '--show-error', '--location',
                    '--max-time', '25', '-A', 'Mozilla/5.0', url,
                    '-o', str(partial)]
    for attempt in range(3):
        result = subprocess.run(command, capture_output=True)
        if not result.returncode:
            break
        if not retry_rate_limit or b'429' not in result.stderr or attempt == 2:
            break
        print('Source rate limit: waiting 60 seconds before retry...', flush=True)
        time.sleep(60)
    if result.returncode:
        partial.unlink(missing_ok=True)
        raise RuntimeError(f'Unable to fetch {url}: {result.stderr.decode(errors="replace").strip()}')
    partial.replace(target)

def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cached-dir', type=Path, help='Read previously downloaded HTML catalogs')
    parser.add_argument('--remote-sprites', action='store_true', help='Reference original sprite URLs instead of downloading')
    parser.add_argument('--sprites-only', action='store_true', help='Download sprites for the existing saved catalogs')
    parser.add_argument('--refresh-catalogs', action='store_true', help='Refresh cached HTML catalogs from the source')
    args = parser.parse_args()
    if args.sprites_only:
        for catalog in ('monsters', 'items'):
            path = ROOT / 'data' / (catalog + '.js')
            records = json.loads(path.read_text(encoding='utf-8').split(' = ', 1)[1].rstrip(';\n'))
            for count, record in enumerate(records, 1):
                sprite = f'images/{catalog}/{record["id"]}.gif'
                target = ROOT / sprite
                if not target.exists() or not target.read_bytes().startswith((b'GIF87a', b'GIF89a', b'\x89PNG')):
                    fetch(record['source'], target)
                if not target.read_bytes().startswith((b'GIF87a', b'GIF89a', b'\x89PNG')):
                    raise ValueError('Invalid sprite: ' + str(target))
                record['sprite'] = sprite
                if catalog == 'monsters':
                    record['spriteBounds'] = sprite_bounds(target)
                save_catalog(catalog, records)
                if count % 10 == 0 or count == len(records):
                    print(f'{catalog}: {count}/{len(records)} sprites saved', flush=True)
        return
    jobs = []
    monsters = []
    items = []
    existing_path = ROOT / 'data/items.js'
    existing_items = json.loads(existing_path.read_text(encoding='utf-8').split(' = ', 1)[1].rstrip(';\n')) if existing_path.exists() else []
    skipped = []
    cache = Path(tempfile.gettempdir()) / 'miracle74-import-cache'
    cache.mkdir(exist_ok=True)
    with nullcontext(cache) as temporary:
        page = Path(temporary) / 'creatures.html'
        if args.cached_dir:
            page = args.cached_dir / 'creatures.html'
        elif not page.exists() or args.refresh_catalogs:
            fetch(BASE + '/?subtopic=creatures', page)
        print('Reading creature catalog...', flush=True)
        source = page.read_text(encoding='utf-8')
        for url, name in re.findall(r'<img class="creatureIcon" src="([^"]+)"[^>]*>\s*</div>\s*<span class="creatureTitle">([^<]+)', source):
            name = html.unescape(name)
            sprite = 'images/monsters/' + slug(name) + '.gif'
            monsters.append(dict(id=slug(name), name=name, sprite=sprite, source=BASE+html.unescape(url)))
            jobs.append((BASE+html.unescape(url), ROOT/sprite))
        categories = 'helmets armors legs boots shields quivers axes swords clubs distance ammunition training amulets rings relics runes foods containers tools valuables fluids'.split()
        def category_rows(category):
            page = Path(temporary) / (category + '.html')
            if args.cached_dir:
                page = args.cached_dir / (category + '.html')
                if not page.exists():
                    return []
            elif not page.exists() or args.refresh_catalogs:
                fetch(BASE + '/?category=' + category + '&subtopic=items', page, retry_rate_limit=False)
            source = page.read_text(encoding='utf-8')
            result = []
            for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', source, re.S):
                match = re.search(r'href="\?subtopic=items&(?:amp;)?id=(\d+)"[^>]*>([^<]+)</a>', row)
                image = re.search(r'<img src="(/images/items/[^\"]+)"', row)
                if match and image:
                    item_id, name = match.groups()
                    result.append(dict(id=item_id, name=html.unescape(name), category=category, sprite='images/items/'+item_id+'.gif', source=BASE+image[1]))
            if not result:
                raise ValueError('No items found in category: ' + category)
            print(f'{category}: {len(result)} items', flush=True)
            return result
        for category in categories:
            try:
                items.extend(category_rows(category))
            except (RuntimeError, ValueError) as error:
                skipped.append(category)
                print(f'Keeping existing {category} entries: {error}', flush=True)
        by_id = {record['id']: record for record in items}
        for record in existing_items:
            if record['id'] not in by_id:
                copy = dict(record)
                copy['sprite'] = 'images/items/' + copy['id'] + '.gif'
                by_id[record['id']] = copy
        items = list(by_id.values())
        for item in items:
            jobs.append((item['source'], ROOT/item['sprite']))
        def download(job):
            url, target = job
            if not target.exists() or not target.read_bytes().startswith((b'GIF87a', b'GIF89a', b'\x89PNG')):
                fetch(url, target)
            if target.read_bytes()[:6] not in (b'GIF87a', b'GIF89a') and not target.read_bytes().startswith(b'\x89PNG'):
                raise ValueError('Invalid image: '+str(target))
        if not args.remote_sprites:
            print(f'Downloading {len(jobs)} sprites (existing files are reused)...', flush=True)
            for count, job in enumerate(jobs, 1):
                download(job)
                if count % 25 == 0 or count == len(jobs):
                    print(f'Sprites: {count}/{len(jobs)}', flush=True)
        else:
            for record in monsters + items:
                if not (ROOT / record['sprite']).exists():
                    record['sprite'] = record['source']
    for name, records in [('monsters',monsters), ('items',items)]:
        if name == 'monsters' and not args.remote_sprites:
            for record in records:
                record['spriteBounds'] = sprite_bounds(ROOT / record['sprite'])
        save_catalog(name, records)
    print(f'Imported {len(monsters)} monsters and {len(items)} items.')
    if skipped:
        print('Source categories unavailable (previous entries retained): ' + ', '.join(skipped))

if __name__ == '__main__':
    main()
