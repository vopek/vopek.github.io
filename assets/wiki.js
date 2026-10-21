/* Catalogs use classic scripts so the wiki also works when opened from disk. */
(() => {
  const root = document.querySelector('main');
  const prefix = document.body.dataset.prefix || '';
  const type = document.body.dataset.view;
  const monsters = window.MONSTERS || [];
  const items = window.ITEMS || [];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const img = (entry, item = false) => {
    const src = `${entry.sprite.startsWith('https://') ? '' : prefix}${escape(entry.sprite)}`;
    const bounds = entry.spriteBounds;
    if (!item && bounds) {
      return `<svg class="sprite" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="${escape(entry.name)}"><image href="${src}" width="${bounds.imageWidth}" height="${bounds.imageHeight}" /></svg>`;
    }
    return `<img class="${item ? 'item-sprite' : 'sprite'}" src="${src}" alt="${escape(entry.name)}" loading="lazy">`;
  };
  const monsterLink = entry => entry.id === 'skeleton' ? `${prefix}monsters/skeleton.html` : `${prefix}monsters.html?monster=${encodeURIComponent(entry.id)}`;
  const itemLink = entry => entry.name.toLowerCase() === 'bone' ? `${prefix}items/bone.html` : `${prefix}items.html?item=${encodeURIComponent(entry.id)}`;
  // Monster values transcribed from the supplied bestiary screenshots.
  const stats = {
    'dwarf-soldier': {hp:135, exp:70, speed:176, armor:9, charm:15,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'elf-arcanist': {hp:220, exp:175, speed:220, armor:15, charm:20,
      resistances: {Physical:false, Earth:true, Fire:true, Energy:true, Ice:false, Holy:false, Death:false, Healing:false}},
    'elf-scout': {hp:160, exp:75, speed:220, armor:7, charm:15,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'frost-spider': {hp:20, exp:12, speed:152, armor:3, charm:5,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'frost-troll': {hp:55, exp:23, speed:140, armor:7, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    cyclops: {hp:260, exp:150, speed:190, armor:17, charm:20,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'demon-skeleton': {hp:400, exp:240, speed:180, armor:25, charm:25,
      resistances: {Physical:false, Earth:true, Fire:true, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    dragon: {hp:1000, exp:700, speed:170, armor:25, charm:30,
      resistances: {Physical:false, Earth:true, Fire:true, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'barbarian-dothraki': {hp:135, exp:75, speed:172, armor:12, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'barbarian-guard': {hp:265, exp:165, speed:206, armor:15, charm:15,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    beholder: {hp:260, exp:170, speed:150, armor:5, charm:20,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'cave-rat': {hp:30, exp:10, speed:150, armor:1, charm:5,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'crypt-shambler': {hp:330, exp:195, speed:140, armor:30, charm:20,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    'barbarian-brute': {hp:230, exp:150, speed:190, armor:15, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    amazon: {hp:110, exp:60, speed:172, armor:11, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    elf: {hp:100, exp:42, speed:190, armor:6, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    skeleton: {hp:50, exp:35, speed:154, armor:2, charm:15,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}}
  };
  const unknown = '<span class="empty">No data</span>';
  function detail(entry) {
    document.body.classList.add('monster-detail');
    document.title = `${entry.name} - Miracle74 Wiki`;
    const data = stats[entry.id] || {};
    const fields = [['Health',data.hp],['Experience',data.exp],['Speed',data.speed],['Armor',data.armor],['Bestiary points',data.charm]];
    root.innerHTML = `<a class="back" href="${prefix}monsters.html">← Back to Monsters</a><article class="bestiary"><h1>${escape(entry.name)}</h1><div class="overview"><div class="portrait">${img(entry)}</div><section><h2>Basic information</h2><dl>${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${value ?? unknown}</dd></div>`).join('')}</dl></section><section><h2>Resistances</h2><div class="elements">${['Physical','Earth','Fire','Energy','Ice','Holy','Death','Healing'].map(name=>`<div class="element"><span>${name}</span>${data.resistances?.[name] == null ? unknown : `<span>${data.resistances[name] ? 'Yes' : 'No'}</span>`}</div>`).join('')}</div>${data.resistances ? '' : '<p class="muted">No resistance values supplied yet.</p>'}</section></div><section class="panel"><h2>Loot</h2>${loot(entry)}</section>${stats[entry.id] ? '' : `<p class="muted">${escape(data.note || 'Monster statistics and loot have not been supplied yet.')}</p>`}</article>`;
  }
  function lootGroups(entry) {
    // Loot names and rarity groups matched against the supplied bestiary screenshots.
    return entry.id === 'dwarf-soldier' ? {
      'Common':['White Mushroom','Gold Coin','Bolt'],
      'Uncommon':['Shovel','Soldier Helmet'],
      'Semi-Rare':['Chain Armor','Battle Axe','Dwarven Shield','Crossbow'],
      'Very Rare':['Axe Ring']
    } : entry.id === 'elf-arcanist' ? {
      'Common':['Scroll','Sandals'],
      'Uncommon':['Melon','Bread','Arrow','Inkwell','Bowl','Grave Flower','Blank Rune','Green Tunic','Candlestick','Staff'],
      'Semi-Rare':['Sling Herb','Red Piece Of Cloth','Elven Amulet'],
      'Rare':['Life Crystal'],
      'Very Rare':['Yellow Gem','Red Robe']
    } : entry.id === 'elf-scout' ? {
      'Common':['Gold Coin','Arrow'],
      'Uncommon':['Grapes','Poison Arrow','Waterskin','Sandals','Studded Helmet','Studded Armor','Longsword'],
      'Semi-Rare':['Bow'],
      'Very Rare':['Quiver','Wood Cape']
    } : entry.id === 'frost-spider' ? {
      'Common':['Gold Coin']
    } : entry.id === 'frost-troll' ? {
      'Common':['Gold Coin'],
      'Uncommon':['Fish','Twigs','Coat','Spear','Rapier','Club','Wooden Shield']
    } : entry.id === 'cyclops' ? {
      'Common':['Meat','Gold Coin'],
      'Uncommon':['Ham','Short Sword'],
      'Semi-Rare':['Plate Shield','Battle Shield'],
      'Rare':['Halberd'],
      'Very Rare':['Dark Helmet','Wolf Tooth Chain','Club Ring']
    } : entry.id === 'demon-skeleton' ? {
      'Common':['Gold Coin','Torch'],
      'Uncommon':['Throwing Star'],
      'Semi-Rare':['Iron Helmet','Battle Hammer'],
      'Rare':['Mysterious Fetish','Battle Shield'],
      'Very Rare':['Mind Stone','Guardian Shield']
    } : entry.id === 'dragon' ? {
      'Common':['Dragon Ham','Gold Coin'],
      'Uncommon':['Gold Coin','Burst Arrow','Crossbow','Short Sword','Mace','Steel Shield'],
      'Semi-Rare':['Royal Spear','Steel Helmet','Plate Armor','Longsword','Broadsword'],
      'Rare':['Small Diamond','Double Axe','Dragon Hammer','Serpent Sword','Dragon Shield'],
      'Very Rare':['Life Crystal','Dragon Quiver']
    } : entry.id === 'barbarian-dothraki' ? {
      'Common':['Gold Coin','Leather Armor','Cleaver'],
      'Uncommon':['Bread','Hand Axe'],
      'Semi-Rare':['Torch','Wooden Shield']
    } : entry.id === 'barbarian-guard' ? {
      'Common':['Meat','Gold Coin','Cleaver'],
      'Uncommon':['Chain Armor'],
      'Semi-Rare':['Viking Helmet','Torch','Battle Axe','Dwarven Shield'],
      'Very Rare':['Small Diamond','Axe Ring']
    } : entry.id === 'beholder' ? {
      'Common':['Gold Coin'],
      'Uncommon':['Longsword','Morning Star'],
      'Semi-Rare':['Two Handed Sword','Steel Shield','Wooden Shield','Spellbook'],
      'Very Rare':['Beholder Shield',"Beholder's Book"]
    } : entry.id === 'cave-rat' ? {
      'Common':['Cheese','Gold Coin'],
      'Rare':['Cookie']
    } : entry.id === 'crypt-shambler' ? {
      'Common':['Gold Coin','Bone'],
      'Uncommon':['Meat'],
      'Semi-Rare':['Iron Helmet','Two Handed Sword'],
      'Rare':['Small Diamond','Throwing Star','Bone Sword','Bone Shield']
    } : entry.id === 'barbarian-brute' ? {
      'Common':['Gold Coin','Meat','Skull'],
      'Uncommon':['Ham','Chain Armor','Axe'],
      'Semi-Rare':['Chain Legs','Chain Helmet'],
      'Rare':['Plate Armor','Double Axe'],
      'Very Rare':['Small Diamond']
    } : entry.id === 'amazon' ? {
      'Common':['Brown Bread','Gold Coin','Skull','Leather Armor','Dagger'],
      'Uncommon':['Sabre'],
      'Semi-Rare':['Torch','Studded Shield'],
      'Very Rare':['Small Ruby','Crystal Necklace']
    } : entry.id === 'elf' ? {'Uncommon':['Red Apple','Arrow','Studded Helmet','Leather Boots','Studded Armor','Longsword','Brass Shield']} : entry.id === 'skeleton' ? {
      'Common':['Gold Coin','Bone','Torch'],
      'Uncommon':['Mace','Hatchet','Brass Shield'],
      'Semi-Rare':['Viking Helmet','Sword']
    } : {};
  }
  function loot(entry) {
    const groups = lootGroups(entry);
    if (!Object.keys(groups).length) return '<p class="empty">No loot recorded yet.</p>';
    return Object.entries(groups).map(([rarity,names])=>`<div class="loot-row"><h3>${rarity}</h3><div class="loot-slots">${names.map(name=>{
      const item = items.find(item=>item.name.toLowerCase()===name.toLowerCase());
      return item ? `<a class="slot" href="${itemLink(item)}" title="${escape(name)}">${img(item,true)}<span>${escape(name)}</span></a>` : name==='Bone' ? `<a class="slot" href="${prefix}items/bone.html"><span class="empty">?</span><span>Bone</span></a>` : `<span class="slot" title="Sprite unavailable"><span class="empty">?</span><span>${escape(name)}</span></span>`;
    }).join('')}</div></div>`).join('');
  }
  function itemLootedBy(name) {
    if (name.toLowerCase() === 'gold coin') return '';
    const drops = monsters.flatMap(monster => Object.entries(lootGroups(monster))
      .filter(([, names]) => names.some(item => item.toLowerCase() === name.toLowerCase()))
      .map(([rarity]) => ({monster, rarity})))
      .sort((a, b) => a.monster.name.localeCompare(b.monster.name));
    if (!drops.length) return '';
    return `<section><h2>Looted by:</h2><ul>${drops.map(({monster, rarity}) => `<li><a href="${monsterLink(monster)}">${escape(monster.name)}</a> (${escape(rarity)})</li>`).join('')}</ul></section>`;
  }
  function itemDetail(entry) {
    document.title = `${entry.name} - Miracle74 Wiki`;
    root.innerHTML=`<a class="back" href="${prefix}items.html">← Back to Items</a><article class="panel"><h1>${escape(entry.name)}</h1>${img(entry,true)}<p>Category: ${escape(entry.category)}</p><a href="https://miracle74.com/?subtopic=items&amp;id=${encodeURIComponent(entry.id)}" target="_blank" rel="noopener">View on Miracle74 ↗</a>${itemLootedBy(entry.name)}</article>`;
  }
  const params = new URLSearchParams(location.search);
  const monsterId = document.body.dataset.monster || params.get('monster');
  const itemId = document.body.dataset.item || params.get('item');
  if (itemId === 'bone' && !items.some(item=>item.name.toLowerCase()==='bone')) {
    root.innerHTML=`<a class="back" href="${prefix}items.html">← Back to Items</a><article class="panel"><h1>Bone</h1><p class="muted">Sprite not yet available in the imported catalog.</p>${itemLootedBy('Bone')}</article>`;
    return;
  }
  if (monsterId || itemId) {
    const entry = monsterId ? monsters.find(m=>m.id===monsterId) : items.find(i=>i.id===itemId || i.name.toLowerCase()===itemId);
    if (entry) { monsterId ? detail(entry) : itemDetail(entry); return; }
    root.innerHTML=`<h1>Entry not found</h1><a href="${prefix}${monsterId?'monsters':'items'}.html">Back to catalog</a>`;
    return;
  }
  const isItem = type === 'items';
  const records = isItem ? items : monsters;
  root.innerHTML=`<h1>${isItem?'Items':'Monsters'}</h1><p class="muted">${isItem?'Equipment and loot':'Creature bestiary'} · Sprites from Miracle74</p><div class="toolbar"><label for="search">Search</label><input id="search" type="search" placeholder="${isItem?'Item':'Monster'} name…">${isItem?`<label for="category">Category</label><select id="category"><option value="">All categories</option>${[...new Set(items.map(i=>i.category))].map(c=>`<option>${escape(c)}</option>`).join('')}</select>`:''}${!isItem ? '<label for="sort">Sort by</label><select id="sort"><option value="name">Name (A-Z)</option><option value="hp-asc">HP: low to high</option><option value="hp-desc">HP: high to low</option><option value="exp-asc">EXP: low to high</option><option value="exp-desc">EXP: high to low</option></select>' : ''}<span id="count" class="muted" role="status"></span></div><div class="grid" id="catalog"></div><p id="empty" hidden>No matching entries.</p>`;
  function render() {
    const query = document.querySelector('#search').value.trim().toLowerCase();
    const category = document.querySelector('#category')?.value;
    const filtered = records.filter(r=>r.name.toLowerCase().includes(query) && (!category || r.category===category));
    if (!isItem) {
      const sort = document.querySelector('#sort').value;
      const [field, direction] = sort.split('-');
      filtered.sort((a, b) => {
        if (field !== 'name') {
          const left = stats[a.id]?.[field];
          const right = stats[b.id]?.[field];
          if (left == null && right != null) return 1;
          if (right == null && left != null) return -1;
          if (left != null && right != null && left !== right) return (left - right) * (direction === 'desc' ? -1 : 1);
        }
        return a.name.localeCompare(b.name);
      });
    }
    document.querySelector('#catalog').innerHTML=filtered.map(entry=>{
      const hasLoot = !isItem && Object.values(lootGroups(entry)).some(names=>names.length>0);
      const cardStats = isItem ? '' : `<span class="card-stats"><span>HP: ${stats[entry.id]?.hp ?? 'No data'}</span><span>EXP: ${stats[entry.id]?.exp ?? 'No data'}</span></span>`;
      return `<a class="card${hasLoot ? ' has-loot' : ''}" href="${isItem?itemLink(entry):monsterLink(entry)}"${hasLoot ? ' title="Loot added"' : ''}>${img(entry,isItem)}<span>${escape(entry.name)}</span>${cardStats}</a>`;
    }).join('');
    document.querySelector('#count').textContent=`${filtered.length} / ${records.length}`;
    document.querySelector('#empty').hidden=filtered.length>0;
  }
  document.querySelector('#search').addEventListener('input',render);
  document.querySelector('#category')?.addEventListener('change',render);
  document.querySelector('#sort')?.addEventListener('change',render);
  render();
})();
