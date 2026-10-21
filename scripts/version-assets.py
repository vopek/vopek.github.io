"""Update static wiki asset URLs after changing scripts, styles or catalog data."""
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ('assets/wiki.css', 'assets/wiki.js', 'data/monsters.js', 'data/items.js')
PAGES = ('monsters.html', 'items.html', 'monsters/skeleton.html', 'items/bone.html')

def main():
    versions = {
        asset: hashlib.sha256((ROOT / asset).read_text(encoding='utf-8').encode()).hexdigest()[:12]
        for asset in ASSETS
    }
    for name in PAGES:
        page = ROOT / name
        source = page.read_text(encoding='utf-8')
        for asset, version in versions.items():
            source = re.sub(
                r'((?:src|href)="(?:\.\./)?' + re.escape(asset) + r')(?:\?v=[^"\s]*)?"',
                lambda match: match[1] + '?v=' + version + '"', source)
        page.write_text(source, encoding='utf-8')
        print('Versioned assets: ' + name)

if __name__ == '__main__':
    main()
