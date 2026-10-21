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
    amazon: {hp:110, exp:60, speed:172, armor:11, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    elf: {hp:100, exp:42, speed:190, armor:6, charm:15,
      resistances: {Physical:false, Earth:false, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}},
    skeleton: {hp:50, exp:35, speed:154, armor:2, charm:15,
      resistances: {Physical:false, Earth:true, Fire:false, Energy:false, Ice:false, Holy:false, Death:false, Healing:false}}
  };
  const unknown = '<span class="empty">No data</span>';
  function detail(entry) {
    document.title = `${entry.name} - Miracle74 Wiki`;
    const data = stats[entry.id] || {};
    const fields = [['Health',data.hp],['Experience',data.exp],['Speed',data.speed],['Armor',data.armor],['Bestiary points',data.charm]];
    root.innerHTML = `<a class="back" href="${prefix}monsters.html">← Back to Monsters</a><article class="bestiary"><h1>${escape(entry.name)}</h1><div class="overview"><div class="portrait">${img(entry)}</div><section><h2>Basic information</h2><dl>${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${value ?? unknown}</dd></div>`).join('')}</dl></section><section><h2>Resistances</h2><div class="elements">${['Physical','Earth','Fire','Energy','Ice','Holy','Death','Healing'].map(name=>`<div class="element"><span>${name}</span>${data.resistances?.[name] == null ? unknown : `<span>${data.resistances[name] ? 'Yes' : 'No'}</span>`}</div>`).join('')}</div>${data.resistances ? '' : '<p class="muted">No resistance values supplied yet.</p>'}</section></div><section class="panel"><h2>Loot</h2>${loot(entry)}</section>${['elf','amazon','skeleton'].includes(entry.id) ? '' : `<p class="muted">${escape(data.note || 'Monster statistics and loot have not been supplied yet.')}</p>`}</article>`;
  }
  function lootGroups(entry) {
    // Loot names and rarity groups matched against the supplied bestiary screenshots.
    return entry.id === 'amazon' ? {
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
  function itemDetail(entry) {
    document.title = `${entry.name} - Miracle74 Wiki`;
    root.innerHTML=`<a class="back" href="${prefix}items.html">← Back to Items</a><article class="panel"><h1>${escape(entry.name)}</h1>${img(entry,true)}<p>Category: ${escape(entry.category)}</p><a href="https://miracle74.com/?subtopic=items&amp;id=${encodeURIComponent(entry.id)}" target="_blank" rel="noopener">View on Miracle74 ↗</a>${entry.name.toLowerCase()==='bone'?`<h2>Dropped by</h2><a href="${prefix}monsters/skeleton.html">Skeleton</a>`:''}</article>`;
  }
  const params = new URLSearchParams(location.search);
  const monsterId = document.body.dataset.monster || params.get('monster');
  const itemId = document.body.dataset.item || params.get('item');
  if (itemId === 'bone' && !items.some(item=>item.name.toLowerCase()==='bone')) {
    root.innerHTML=`<a class="back" href="${prefix}items.html">← Back to Items</a><article class="panel"><h1>Bone</h1><p class="muted">Sprite not yet available in the imported catalog.</p><h2>Dropped by</h2><a href="${prefix}monsters/skeleton.html">Skeleton</a></article>`;
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
