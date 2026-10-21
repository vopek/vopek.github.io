# vopek.github.io

After changing wiki scripts, styles or catalog data, run
`python scripts/version-assets.py` before committing. It updates asset URLs on
all monster/item pages using content hashes, so browsers fetch the new version
after deployment, just as the map's versioned files do.

Static Miracle74 wiki. Open `index.html` or serve the repository with any static
HTTP server. The Monsters and Items catalogs support search and direct detail
links. The current import contains 171 monsters and 389 items from the available
equipment, food, amulet and selected loot catalogs. All catalog sprites are stored locally under
`images/monsters/` and `images/items/`; browsing needs no connection to Miracle74.
Monster animation bounds are measured across all frames to center the visible
sprite. The original GIF files and their animation are preserved.

Resume sprite downloads for the saved catalogs on Windows with Python, Pillow
and curl installed:

```sh
python scripts/import-miracle.py --sprites-only
```

To import all source categories, run `python scripts/import-miracle.py`.
Add `--refresh-catalogs` to refresh previously cached HTML. Some category pages
currently return HTTP 429; the existing catalog is kept intact when a refresh
fails. The importer spaces requests, waits on HTTP 429, reuses valid local
images and saves sprite-only progress after each download. HTML catalogs are
cached in the system temporary directory under `miracle74-import-cache`.
Catalog data is stored as classic JavaScript in `data/` so pages also work via
`file://`. No build or package installation is required.

Run `node scripts/check-wiki.mjs` for Chrome browser checks with HTTP(S) blocked.
The test covers search, category filters, detail pages, loot icons and mobile
layout. Set `CHROME_PATH` if Chrome is installed in a different location.

Elf statistics and all seven Uncommon loot items (Red Apple, Arrow, Studded Helmet,
Leather Boots, Studded Armor, Longsword and Brass Shield) come from the supplied
bestiary screenshot, matched against the local item sprites. Skeleton statistics,
resistances and eight loot items were updated from its supplied screenshot. Other stats, resistances,
locations and loot remain explicitly unavailable until confirmed. The source
creature catalog supplies names and sprites only. Kill counts and charm selection
are player-specific and are not presented as monster attributes.

Amazon statistics, resistances and ten loot items across four rarity groups were
transcribed from its bestiary screenshot. Locations remain omitted.

Barbarian Brute: statistics, resistances and eleven loot items across five rarity
groups added from screenshots; Small Diamond was confirmed by the user.

Barbarian Dothraki, Barbarian Guard, Beholder, Cave Rat and Crypt Shambler were
added from bestiary screenshots. Tiny drops were confirmed by the user: Guard
(Small Diamond, Axe Ring), Cave Rat (Cookie), Crypt Shambler (Small Diamond).

Cyclops, Demon Skeleton and Dragon added from screenshots, including Very Rare
loot. User confirmed Club Ring, Life Crystal, Mysterious Fetish and Dragon
Uncommon Gold Coin. Gold Coin remains excluded from item drop-source lists.

Demon Skeleton Very Rare loot corrected to Mind Stone (user confirmation).

Dwarf Soldier, Elf Arcanist, Elf Scout, Frost Spider and Frost Troll added from
bestiary screenshots. Unclear drops were confirmed by the user, including
Sling Herb, Scroll, Yellow Gem, Red Piece Of Cloth, Waterskin and Twigs.
